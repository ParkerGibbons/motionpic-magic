<script lang="ts">
  import { settings } from '../stores/settings'
  import { FFmpeg } from '@ffmpeg/ffmpeg'
  import { toBlobURL, fetchFile } from '@ffmpeg/util'

  export let onClose: () => void

  let isExporting = false
  let progress = 0
  let statusMessage = ''
  let ffmpeg: FFmpeg | null = null
  let ffmpegLoaded = false

  const resolutions = {
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
    'custom': { width: 1920, height: 1080 }
  }

  async function loadFFmpeg() {
    if (ffmpegLoaded) return

    statusMessage = 'Loading FFmpeg...'
    ffmpeg = new FFmpeg()

    ffmpeg.on('log', ({ message }) => {
      console.log(message)
    })

    ffmpeg.on('progress', ({ progress: p }) => {
      progress = Math.round(p * 100)
    })

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/unithread'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      })
      ffmpegLoaded = true
      statusMessage = 'FFmpeg loaded'
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      statusMessage = 'Failed to load FFmpeg. Please refresh and try again.'
    }
  }

  async function handleExport() {
    if (!ffmpeg || !ffmpegLoaded) {
      await loadFFmpeg()
      if (!ffmpegLoaded) return
    }

    isExporting = true
    progress = 0
    statusMessage = 'Capturing frames...'

    try {
      // Get canvas from the scene
      const canvas = document.querySelector('canvas')
      if (!canvas) throw new Error('Canvas not found')

      const resolution = resolutions[$settings.exportResolution]
      const fps = $settings.exportFps
      const duration = $settings.duration
      const totalFrames = fps * duration

      // Create offscreen canvas for rendering at export resolution
      const offscreenCanvas = document.createElement('canvas')
      offscreenCanvas.width = resolution.width
      offscreenCanvas.height = resolution.height
      const ctx = offscreenCanvas.getContext('2d')

      if (!ctx) throw new Error('Failed to get canvas context')

      // Capture frames
      const frames: Uint8Array[] = []
      const wasPlaying = $settings.isPlaying

      // Start playback if not playing
      if (!wasPlaying) {
        settings.update(s => ({ ...s, isPlaying: true }))
      }

      for (let i = 0; i < totalFrames; i++) {
        // Wait for next frame
        await new Promise(resolve => requestAnimationFrame(resolve))

        // Draw current frame to offscreen canvas
        ctx.drawImage(canvas, 0, 0, resolution.width, resolution.height)

        // Convert to PNG data
        const blob = await new Promise<Blob>((resolve) => {
          offscreenCanvas.toBlob((b) => resolve(b!), 'image/png')
        })

        const data = await fetchFile(blob)
        frames.push(data)

        progress = Math.round((i / totalFrames) * 50) // First 50% for capturing
        statusMessage = `Capturing frame ${i + 1}/${totalFrames}`
      }

      // Stop playback if it wasn't playing before
      if (!wasPlaying) {
        settings.update(s => ({ ...s, isPlaying: false }))
      }

      statusMessage = 'Encoding video...'
      progress = 50

      if (!ffmpeg) throw new Error('FFmpeg not loaded')

      // Write frames to FFmpeg
      for (let i = 0; i < frames.length; i++) {
        await ffmpeg.writeFile(`frame${String(i).padStart(5, '0')}.png`, frames[i])
      }

      // Run FFmpeg to create video
      await ffmpeg.exec([
        '-framerate', String(fps),
        '-i', 'frame%05d.png',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-crf', '23',
        'output.mp4'
      ])

      progress = 90
      statusMessage = 'Downloading video...'

      // Read the output file
      const data = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)

      // Download the file
      const a = document.createElement('a')
      a.href = url
      a.download = `motionpic-${Date.now()}.mp4`
      a.click()

      // Clean up
      URL.revokeObjectURL(url)
      for (let i = 0; i < frames.length; i++) {
        await ffmpeg.deleteFile(`frame${String(i).padStart(5, '0')}.png`)
      }
      await ffmpeg.deleteFile('output.mp4')

      progress = 100
      statusMessage = 'Export complete!'

      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Export failed:', error)
      statusMessage = `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    } finally {
      isExporting = false
    }
  }
</script>

<div class="modal-backdrop" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} role="presentation">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
    <div class="modal-header">
      <h2>Export Video</h2>
      <button class="close-btn" onclick={onClose} disabled={isExporting}>&times;</button>
    </div>

    <div class="modal-content">
      <div class="setting-group">
        <label for="resolution">Resolution</label>
        <select id="resolution" bind:value={$settings.exportResolution} disabled={isExporting}>
          <option value="1080p">1080p (1920x1080)</option>
          <option value="4k">4K (3840x2160)</option>
        </select>
      </div>

      <div class="setting-group">
        <label for="duration">Duration (seconds)</label>
        <input
          id="duration"
          type="number"
          min="1"
          max="60"
          bind:value={$settings.duration}
          disabled={isExporting}
        />
      </div>

      <div class="setting-group">
        <label for="fps">Frame Rate (fps)</label>
        <select id="fps" bind:value={$settings.exportFps} disabled={isExporting}>
          <option value={24}>24 fps (cinematic)</option>
          <option value={30}>30 fps</option>
          <option value={60}>60 fps (smooth)</option>
        </select>
      </div>

      {#if isExporting}
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" style="width: {progress}%"></div>
          </div>
          <p class="status-message">{statusMessage}</p>
        </div>
      {/if}
    </div>

    <div class="modal-footer">
      <button onclick={onClose} disabled={isExporting}>Cancel</button>
      <button onclick={handleExport} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'Start Export'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .close-btn:hover {
    color: var(--text-primary);
    background: none;
  }

  .modal-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .setting-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .setting-group input[type="number"] {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 1rem;
  }

  .progress-section {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease;
  }

  .status-message {
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-align: center;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .modal-footer button:first-child {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .modal-footer button:first-child:hover {
    background: var(--border);
  }
</style>
