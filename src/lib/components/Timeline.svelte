<script lang="ts">
  import { settings } from '../stores/settings'

  let trackRef: HTMLDivElement
  let isDragging = false

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * $settings.exportFps)
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }

  function handlePlayPause() {
    settings.update(s => ({ ...s, isPlaying: !s.isPlaying }))
  }

  function handleStop() {
    settings.update(s => ({ ...s, isPlaying: false, currentTime: 0 }))
  }

  function handleTrackClick(e: MouseEvent) {
    if (!trackRef) return
    const rect = trackRef.getBoundingClientRect()
    const x = e.clientX - rect.left
    const progress = Math.max(0, Math.min(1, x / rect.width))
    settings.update(s => ({ ...s, currentTime: progress * s.duration }))
  }

  function handleTrackMouseDown(e: MouseEvent) {
    isDragging = true
    handleTrackClick(e)
    window.addEventListener('mousemove', handleDrag)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleDrag(e: MouseEvent) {
    if (!isDragging || !trackRef) return
    const rect = trackRef.getBoundingClientRect()
    const x = e.clientX - rect.left
    const progress = Math.max(0, Math.min(1, x / rect.width))
    settings.update(s => ({ ...s, currentTime: progress * s.duration }))
  }

  function handleMouseUp() {
    isDragging = false
    window.removeEventListener('mousemove', handleDrag)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  function handleDurationChange(e: Event) {
    const input = e.target as HTMLInputElement
    const value = parseFloat(input.value)
    if (!isNaN(value) && value > 0) {
      settings.update(s => ({ 
        ...s, 
        duration: value,
        currentTime: Math.min(s.currentTime, value)
      }))
    }
  }

  $: progress = $settings.duration > 0 ? ($settings.currentTime / $settings.duration) * 100 : 0
</script>

<div class="timeline" class:disabled={!$settings.imageLoaded}>
  <div class="transport-controls">
    <button 
      class="transport-btn" 
      onclick={handleStop} 
      disabled={!$settings.imageLoaded}
      aria-label="Stop"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
      </svg>
    </button>
    <button 
      class="transport-btn play" 
      onclick={handlePlayPause} 
      disabled={!$settings.imageLoaded}
      aria-label={$settings.isPlaying ? 'Pause' : 'Play'}
    >
      {#if $settings.isPlaying}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="4" width="5" height="16" rx="1"/>
          <rect x="14" y="4" width="5" height="16" rx="1"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4l15 8-15 8V4z"/>
        </svg>
      {/if}
    </button>
  </div>

  <div class="time-display">
    <span class="current-time">{formatTime($settings.currentTime)}</span>
    <span class="separator">/</span>
    <span class="total-time">{formatTime($settings.duration)}</span>
  </div>

  <div 
    class="track-container"
    bind:this={trackRef}
    onmousedown={handleTrackMouseDown}
    role="slider"
    aria-label="Timeline scrubber"
    aria-valuemin={0}
    aria-valuemax={$settings.duration}
    aria-valuenow={$settings.currentTime}
    tabindex="0"
  >
    <div class="track">
      <div class="track-fill" style="width: {progress}%"></div>
      <div class="playhead" style="left: {progress}%">
        <div class="playhead-handle"></div>
      </div>
      <!-- Keyframe markers will go here -->
      <div class="keyframe-track"></div>
    </div>
  </div>

  <div class="duration-control">
    <label>
      <span class="sr-only">Duration</span>
      <input
        type="number"
        min="1"
        max="60"
        step="0.5"
        value={$settings.duration}
        onchange={handleDurationChange}
        disabled={!$settings.imageLoaded}
      />
      <span class="unit">sec</span>
    </label>
  </div>
</div>

<style>
  .timeline {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    min-height: 48px;
  }

  .timeline.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .transport-controls {
    display: flex;
    gap: 0.25rem;
  }

  .transport-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    min-width: auto;
    background: var(--bg-tertiary);
    border-radius: 4px;
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .transport-btn:hover:not(:disabled) {
    background: var(--border);
    color: var(--text-primary);
  }

  .transport-btn.play {
    width: 36px;
    height: 36px;
    background: var(--accent);
    color: white;
  }

  .transport-btn.play:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .time-display {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.75rem;
    color: var(--text-secondary);
    min-width: 7.5rem;
    text-align: center;
    user-select: none;
  }

  .current-time {
    color: var(--text-primary);
  }

  .separator {
    margin: 0 0.25rem;
    opacity: 0.5;
  }

  .track-container {
    flex: 1;
    height: 32px;
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 0 8px;
  }

  .track {
    position: relative;
    width: 100%;
    height: 6px;
    background: var(--bg-tertiary);
    border-radius: 3px;
    overflow: visible;
  }

  .track-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: var(--accent);
    border-radius: 3px 0 0 3px;
    pointer-events: none;
  }

  .playhead {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    pointer-events: none;
  }

  .playhead-handle {
    width: 14px;
    height: 14px;
    background: white;
    border: 2px solid var(--accent);
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    transition: transform 0.1s;
  }

  .track-container:hover .playhead-handle {
    transform: scale(1.2);
  }

  .keyframe-track {
    position: absolute;
    top: -8px;
    left: 0;
    right: 0;
    height: 6px;
    pointer-events: none;
  }

  .duration-control {
    display: flex;
    align-items: center;
  }

  .duration-control label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .duration-control input {
    width: 3.5rem;
    padding: 0.25rem 0.375rem;
    font-size: 0.75rem;
    text-align: right;
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
  }

  .duration-control input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .duration-control .unit {
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>
