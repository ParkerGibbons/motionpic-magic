<script lang="ts">
  import { settings } from '../stores/settings'

  const cameraPresets = [
    { value: 'gentle-push', label: 'Gentle Push' },
    { value: 'ken-burns', label: 'Ken Burns' },
    { value: 'reveal', label: 'Reveal' },
    { value: 'drama', label: 'Drama' },
    { value: 'drift', label: 'Drift' }
  ]

  function handlePlayPause() {
    settings.update(s => ({ ...s, isPlaying: !s.isPlaying }))
  }

  let expandedSections = {
    camera: true,
    parallax: false,
    dof: false,
    post: false
  }

  function toggleSection(section: keyof typeof expandedSections) {
    expandedSections[section] = !expandedSections[section]
  }
</script>

<aside class="sidebar">
  <div class="sidebar-content">
    <!-- Camera Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('camera')}>
        <span class="section-title">Camera</span>
        <span class="chevron" class:expanded={expandedSections.camera}>›</span>
      </button>
      {#if expandedSections.camera}
        <div class="section-content">
          <div class="control">
            <select bind:value={$settings.cameraPreset} disabled={!$settings.imageLoaded}>
              {#each cameraPresets as preset}
                <option value={preset.value}>{preset.label}</option>
              {/each}
            </select>
          </div>
          <div class="control-inline">
            <label>Speed</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              bind:value={$settings.cameraSpeed}
              disabled={!$settings.imageLoaded}
            />
            <span class="value">{$settings.cameraSpeed.toFixed(1)}x</span>
          </div>
          <button class="play-btn" onclick={handlePlayPause} disabled={!$settings.imageLoaded}>
            {$settings.isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>
      {/if}
    </section>

    <!-- Parallax Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('parallax')}>
        <span class="section-title">Parallax</span>
        <span class="chevron" class:expanded={expandedSections.parallax}>›</span>
      </button>
      {#if expandedSections.parallax}
        <div class="section-content">
          <div class="control-inline">
            <label>Strength</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$settings.parallaxStrength}
              disabled={!$settings.imageLoaded}
            />
            <span class="value">{($settings.parallaxStrength * 100).toFixed(0)}</span>
          </div>
        </div>
      {/if}
    </section>

    <!-- DOF Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('dof')}>
        <span class="section-title">Depth of Field</span>
        <span class="chevron" class:expanded={expandedSections.dof}>›</span>
      </button>
      {#if expandedSections.dof}
        <div class="section-content">
          <div class="control-inline">
            <label>Focus</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$settings.focusDistance}
              disabled={!$settings.imageLoaded}
            />
            <span class="value">{($settings.focusDistance * 100).toFixed(0)}</span>
          </div>
          <div class="control-inline">
            <label>Blur</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={$settings.aperture}
              disabled={!$settings.imageLoaded}
            />
            <span class="value">{($settings.aperture * 100).toFixed(0)}</span>
          </div>
        </div>
      {/if}
    </section>

    <!-- Post Processing Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('post')}>
        <span class="section-title">Post Processing</span>
        <span class="chevron" class:expanded={expandedSections.post}>›</span>
      </button>
      {#if expandedSections.post}
        <div class="section-content">
          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.filmGrainEnabled} disabled={!$settings.imageLoaded} />
              <span>Film Grain</span>
            </label>
            {#if $settings.filmGrainEnabled}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.filmGrainIntensity}
                disabled={!$settings.imageLoaded}
              />
            {/if}
          </div>

          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.chromaticAberrationEnabled} disabled={!$settings.imageLoaded} />
              <span>Chromatic Aberration</span>
            </label>
            {#if $settings.chromaticAberrationEnabled}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.chromaticAberrationIntensity}
                disabled={!$settings.imageLoaded}
              />
            {/if}
          </div>

          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.vignetteEnabled} disabled={!$settings.imageLoaded} />
              <span>Vignette</span>
            </label>
            {#if $settings.vignetteEnabled}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.vignetteIntensity}
                disabled={!$settings.imageLoaded}
              />
            {/if}
          </div>

          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.lensDistortionEnabled} disabled={!$settings.imageLoaded} />
              <span>Lens Distortion</span>
            </label>
            {#if $settings.lensDistortionEnabled}
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={$settings.lensDistortionAmount}
                disabled={!$settings.imageLoaded}
              />
            {/if}
          </div>
        </div>
      {/if}
    </section>
  </div>
</aside>

<style>
  .sidebar {
    width: 280px;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .sidebar-content {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
  }

  .section {
    border-bottom: 1px solid var(--border);
  }

  .section:last-child {
    border-bottom: none;
  }

  .section-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }

  .section-header:hover {
    background: var(--bg-primary);
  }

  .section-title {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .chevron {
    font-size: 1.25rem;
    color: var(--text-muted);
    transition: transform 0.2s;
    transform: rotate(0deg);
  }

  .chevron.expanded {
    transform: rotate(90deg);
  }

  .section-content {
    padding: 0 0.5rem 0.75rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .control {
    display: flex;
    flex-direction: column;
  }

  .control-inline {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.5rem;
  }

  .control-inline label {
    font-size: 0.75rem;
    color: var(--text-primary);
    min-width: 3.5rem;
  }

  .value {
    font-size: 0.6875rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    min-width: 2rem;
    text-align: right;
  }

  select {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.8125rem;
    background: var(--input-bg);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  input[type="range"] {
    height: 3px;
  }

  .play-btn {
    width: 100%;
    padding: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    margin-top: 0.25rem;
  }

  .toggle-control {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .toggle-control label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-primary);
    cursor: pointer;
  }

  .toggle-control input[type="checkbox"] {
    width: 14px;
    height: 14px;
  }

  .toggle-control input[type="range"] {
    margin-left: 1.25rem;
  }
</style>
