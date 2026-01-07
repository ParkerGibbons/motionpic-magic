<script lang="ts">
  import { settings } from '../stores/settings'

  // Always enabled, using export resolution settings
  $: aspectRatio = $settings.exportResolution === '4k' ? 16 / 9 : 16 / 9

  // Calculate frame dimensions to fit in viewport while maintaining aspect
  function calculateFrameDimensions(containerWidth: number, containerHeight: number) {
    const targetAspect = aspectRatio
    const containerAspect = containerWidth / containerHeight

    let frameWidth, frameHeight

    if (containerAspect > targetAspect) {
      // Container is wider - fit to height
      frameHeight = containerHeight * 0.7 // 70% of viewport height
      frameWidth = frameHeight * targetAspect
    } else {
      // Container is taller - fit to width
      frameWidth = containerWidth * 0.7 // 70% of viewport width
      frameHeight = frameWidth / targetAspect
    }

    return {
      width: frameWidth,
      height: frameHeight,
      left: (containerWidth - frameWidth) / 2,
      top: (containerHeight - frameHeight) / 2
    }
  }
</script>

{#if $settings.imageLoaded}
  <div class="frame-overlay">
    <!-- Export frame cutout with border -->
    <div class="frame-container">
      <div class="frame-border"></div>
      <div class="frame-label">
        {$settings.exportResolution === '4k' ? '3840×2160' : '1920×1080'} • 16:9
      </div>
    </div>
  </div>
{/if}

<style>
  .frame-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 5;
  }

  .frame-container {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 70%;
    aspect-ratio: 16 / 9;
  }

  .frame-border {
    position: absolute;
    inset: 0;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-radius: 2px;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.3),
      inset 0 0 0 1px rgba(0, 0, 0, 0.3),
      0 0 0 9999px rgba(0, 0, 0, 0.4);
  }

  .frame-label {
    position: absolute;
    bottom: -2rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.25rem 0.75rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 4px;
    white-space: nowrap;
    backdrop-filter: blur(8px);
  }

  @media (max-width: 768px) {
    .frame-container {
      width: 85%;
    }
  }
</style>
