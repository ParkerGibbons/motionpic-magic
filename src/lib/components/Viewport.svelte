<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { settings } from '../stores/settings'
  import { createScene } from '../three/scene'
  import type { Scene } from '../three/scene'
  import CropOverlay from './CropOverlay.svelte'
  import { generateDepthMap } from '../utils/depth'

  let canvas: HTMLCanvasElement
  let container: HTMLDivElement
  let scene: Scene | null = null
  let isDragging = false
  let isGeneratingDepth = false
  let depthError: string | null = null
  let depthProgress: string | null = null
  let focusIndicator: { x: number; y: number; visible: boolean } = { x: 0, y: 0, visible: false }
  let focusIndicatorTimeout: ReturnType<typeof setTimeout> | null = null
  let currentImageElement: HTMLImageElement | null = null

  onMount(() => {
    scene = createScene(canvas, $settings)

    // Register time update callback for timeline sync
    scene.setTimeUpdateCallback((time) => {
      settings.update(s => ({ ...s, currentTime: time }))
    })

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
    if (focusIndicatorTimeout) {
      clearTimeout(focusIndicatorTimeout)
    }
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
    depthProgress = null

    // Create image element to get dimensions
    const img = new Image()
    img.src = colorUrl

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    currentImageElement = img

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

    // Generate depth map with current model selection
    await generateDepth(img, colorUrl)
  }

  async function generateDepth(img: HTMLImageElement, colorUrl: string) {
    isGeneratingDepth = true
    depthError = null
    depthProgress = null

    settings.update(s => ({ ...s, depthProcessing: true }))

    try {
      const result = await generateDepthMap(img, $settings.depthModel, (progress) => {
        depthProgress = progress.status
      })

      console.log(`Depth map generated in ${result.processingTime.toFixed(0)}ms`)

      // Convert ImageData to blob URL
      const depthCanvas = document.createElement('canvas')
      depthCanvas.width = result.depthMap.width
      depthCanvas.height = result.depthMap.height
      const ctx = depthCanvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')

      ctx.putImageData(result.depthMap, 0, 0)

      const depthBlob = await new Promise<Blob>((resolve) => {
        depthCanvas.toBlob((blob) => resolve(blob!), 'image/png')
      })

      const depthUrl = URL.createObjectURL(depthBlob)

      // Update with real depth map
      settings.update(s => ({
        ...s,
        depthMapUrl: depthUrl,
        depthProcessing: false
      }))

      // Reload textures with depth map
      if (scene) {
        await scene.loadTextures(colorUrl, depthUrl)
      }

      isGeneratingDepth = false
      depthProgress = null
    } catch (error) {
      console.error('Failed to generate depth map:', error)
      depthError = error instanceof Error ? error.message : 'Unknown error'
      isGeneratingDepth = false
      depthProgress = null
      settings.update(s => ({ ...s, depthProcessing: false }))

      // Continue with placeholder depth (same as color)
    }
  }

  export function regenerateDepth() {
    if (!currentImageElement || !$settings.colorMapUrl) return
    generateDepth(currentImageElement, $settings.colorMapUrl)
  }

  function handleViewportClick(e: MouseEvent) {
    // If no image loaded, open file picker
    if (!$settings.imageLoaded) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = handleFileInput
      input.click()
      return
    }

    // Click-to-focus: Cmd/Ctrl + Click
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      handleClickToFocus(e)
    }
  }

  function handleClickToFocus(e: MouseEvent) {
    if (!scene || !canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height // Flip Y for WebGL

    // Sample depth at click position
    const depth = scene.sampleDepthAt(x, y)
    
    if (depth !== null) {
      // Set focus distance
      settings.update(s => ({ ...s, focusDistance: depth }))

      // Show focus indicator
      focusIndicator = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true
      }

      // Hide indicator after animation
      if (focusIndicatorTimeout) {
        clearTimeout(focusIndicatorTimeout)
      }
      focusIndicatorTimeout = setTimeout(() => {
        focusIndicator = { ...focusIndicator, visible: false }
      }, 800)
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
  onclick={handleViewportClick}
  onkeydown={(e) => e.key === 'Enter' && handleViewportClick(e as unknown as MouseEvent)}
  class:dragging={isDragging}
>
  <canvas bind:this={canvas}></canvas>

  {#if $settings.imageLoaded}
    <!-- Shader mode switcher -->
    <div class="shader-mode-switcher">
      <button
        class="mode-btn"
        class:active={$settings.parallaxMode === 'offset'}
        onclick={() => settings.update(s => ({ ...s, parallaxMode: 'offset' }))}
      >
        UV Offset
      </button>
      <button
        class="mode-btn"
        class:active={$settings.parallaxMode === 'raymarch'}
        onclick={() => settings.update(s => ({ ...s, parallaxMode: 'raymarch' }))}
      >
        Raymarch
      </button>
    </div>
  {/if}

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
      <p>Drag to orbit • Scroll to zoom • ⌘+Click to set focus</p>
    </div>
  {/if}

  <!-- Focus indicator -->
  {#if focusIndicator.visible}
    <div 
      class="focus-indicator" 
      style="left: {focusIndicator.x}px; top: {focusIndicator.y}px"
    >
      <div class="focus-ring"></div>
      <div class="focus-crosshair"></div>
    </div>
  {/if}

  <CropOverlay />

  {#if isGeneratingDepth}
    <div class="status-overlay">
      <div class="status-content">
        <div class="spinner"></div>
        <p>{depthProgress || 'Generating depth map...'}</p>
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

  .shader-mode-switcher {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 6px;
    padding: 4px;
    backdrop-filter: blur(8px);
    z-index: 5;
  }

  .mode-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    border: none;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 80px;
  }

  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .mode-btn.active {
    background: var(--accent);
    color: white;
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

  .focus-indicator {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 5;
  }

  .focus-ring {
    width: 48px;
    height: 48px;
    border: 2px solid var(--accent);
    border-radius: 50%;
    animation: focusRingPulse 0.8s ease-out forwards;
  }

  .focus-crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    transform: translate(-50%, -50%);
  }

  .focus-crosshair::before,
  .focus-crosshair::after {
    content: '';
    position: absolute;
    background: var(--accent);
  }

  .focus-crosshair::before {
    width: 2px;
    height: 100%;
    left: 50%;
    transform: translateX(-50%);
  }

  .focus-crosshair::after {
    width: 100%;
    height: 2px;
    top: 50%;
    transform: translateY(-50%);
  }

  @keyframes focusRingPulse {
    0% {
      transform: scale(0.5);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
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
