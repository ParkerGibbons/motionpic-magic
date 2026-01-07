<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { settings } from '../stores/settings'
  import { createScene } from '../three/scene'
  import type { Scene } from '../three/scene'
  import CropOverlay from './CropOverlay.svelte'
  import { generateDepthMap } from '../utils/api'

  let canvas: HTMLCanvasElement
  let container: HTMLDivElement
  let scene: Scene | null = null
  let isDragging = false
  let isGeneratingDepth = false
  let depthError: string | null = null

  onMount(() => {
    scene = createScene(canvas, $settings)

    // Subscribe to settings changes
    const unsubscribe = settings.subscribe(s => {
      if (scene) {
        scene.updateSettings(s)
      }
    })

    return () => {
      unsubscribe()
    }
  })

  onDestroy(() => {
    scene?.dispose()
  })

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    isDragging = true
  }

  function handleDragLeave() {
    isDragging = false
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault()
    isDragging = false

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.type.startsWith('image/')) return

    await loadImage(file)
  }

  async function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    await loadImage(file)
  }

  async function loadImage(file: File) {
    const colorUrl = URL.createObjectURL(file)
    depthError = null

    // Show image immediately
    settings.update(s => ({
      ...s,
      imageLoaded: true,
      colorMapUrl: colorUrl,
      depthMapUrl: colorUrl // Temporary placeholder
    }))

    // Load color map immediately
    if (scene) {
      await scene.loadTextures(colorUrl, colorUrl)
    }

    // Generate depth map in background
    isGeneratingDepth = true

    try {
      const response = await generateDepthMap(file)

      console.log(`Depth map generated in ${response.processing_time_ms}ms`)

      // Update with real depth map
      settings.update(s => ({
        ...s,
        depthMapUrl: response.depth_map_url
      }))

      // Reload textures with depth map
      if (scene) {
        await scene.loadTextures(colorUrl, response.depth_map_url)
      }

      isGeneratingDepth = false
    } catch (error) {
      console.error('Failed to generate depth map:', error)
      depthError = error instanceof Error ? error.message : 'Unknown error'
      isGeneratingDepth = false

      // Continue with placeholder depth (same as color)
    }
  }

  function handleClick() {
    if (!$settings.imageLoaded) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = handleFileInput
      input.click()
    }
  }
</script>

<div
  class="viewport-container"
  bind:this={container}
  role="button"
  tabindex="0"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
  class:dragging={isDragging}
>
  <canvas bind:this={canvas}></canvas>

  {#if !$settings.imageLoaded}
    <div class="empty-state">
      <div class="empty-state-content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <h3>Drop an image to begin</h3>
        <p>or click to browse files</p>
      </div>
    </div>
  {:else if !$settings.isPlaying}
    <div class="hint">
      <p>Drag to rotate • Scroll to zoom • Right-click to pan</p>
    </div>
  {/if}

  <CropOverlay />

  {#if isGeneratingDepth}
    <div class="status-overlay">
      <div class="status-content">
        <div class="spinner"></div>
        <p>Generating depth map...</p>
      </div>
    </div>
  {/if}

  {#if depthError}
    <div class="error-toast">
      <p>⚠ Depth generation failed: {depthError}</p>
      <button onclick={() => depthError = null}>✕</button>
    </div>
  {/if}
</div>

<style>
  .viewport-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: var(--bg-primary);
    cursor: pointer;
  }

  .viewport-container.dragging {
    background: var(--bg-secondary);
  }

  .viewport-container:has(canvas:not(:empty)) {
    cursor: default;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .empty-state {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .empty-state-content {
    text-align: center;
    color: var(--text-muted);
  }

  .empty-state-content svg {
    margin: 0 auto 1rem;
    opacity: 0.5;
  }

  .empty-state-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
  }

  .empty-state-content p {
    font-size: 0.875rem;
  }

  .hint {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 6px;
    pointer-events: none;
    backdrop-filter: blur(8px);
    opacity: 0.8;
    transition: opacity 0.3s;
  }

  .hint p {
    font-size: 0.75rem;
    color: white;
    margin: 0;
  }

  .status-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 10;
    pointer-events: none;
  }

  .status-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    backdrop-filter: blur(8px);
  }

  .status-content p {
    color: white;
    font-size: 0.875rem;
    margin: 0;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-toast {
    position: absolute;
    bottom: 5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    background: rgba(220, 38, 38, 0.95);
    color: white;
    border-radius: 6px;
    backdrop-filter: blur(8px);
    z-index: 10;
    max-width: 90%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .error-toast p {
    margin: 0;
    font-size: 0.875rem;
  }

  .error-toast button {
    padding: 0;
    min-width: auto;
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .error-toast button:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
