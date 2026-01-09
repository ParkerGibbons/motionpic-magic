<script lang="ts">
  import { settings, type ColorPreset, type BokehQuality, type RenderMode } from '../stores/settings'

  const cameraPresets = [
    { value: 'gentle-push', label: 'Gentle Push' },
    { value: 'ken-burns', label: 'Ken Burns' },
    { value: 'reveal', label: 'Reveal' },
    { value: 'drama', label: 'Drama' },
    { value: 'drift', label: 'Drift' },
    { value: 'orbit', label: 'Orbit' },
    { value: 'handheld', label: 'Handheld' },
    { value: 'vertigo', label: 'Vertigo (Dolly Zoom)' },
    { value: 'crane', label: 'Crane' },
    { value: 'breathing', label: 'Breathing' },
    { value: 'focus-pull', label: 'Focus Pull' }
  ]

  const colorPresets: { value: ColorPreset; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'portra', label: 'Kodak Portra' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'noir', label: 'Film Noir' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'cool-blue', label: 'Cool Blue' }
  ]

  const bokehQualities: { value: BokehQuality; label: string }[] = [
    { value: 'fast', label: 'Fast (9 samples)' },
    { value: 'medium', label: 'Medium (13 samples)' },
    { value: 'high', label: 'High (25 samples)' }
  ]

  const renderModes: { value: RenderMode; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'depth', label: 'Depth (Grayscale)' },
    { value: 'depth-color', label: 'Depth (Heatmap)' },
    { value: 'normals', label: 'Normals' },
    { value: 'split', label: 'Split View' }
  ]

  let expandedSections: Record<string, boolean> = {
    camera: true,
    cameraTransform: false,
    parallax: false,
    dof: false,
    atmosphere: false,
    colorGrading: false,
    lensFx: false,
    post: false,
    renderMode: false
  }

  function resetCameraTransform() {
    settings.update(s => ({
      ...s,
      cameraOffsetX: 0,
      cameraOffsetY: 0,
      cameraOffsetZ: 0,
      cameraRotationX: 0,
      cameraRotationY: 0,
      cameraRotationZ: 0
    }))
  }

  function toggleSection(section: string) {
    expandedSections[section] = !expandedSections[section]
  }

  function formatFocalLength(mm: number): string {
    return `${mm}mm`
  }
</script>

<aside class="sidebar">
  <div class="sidebar-content">
    <!-- Render Mode Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('renderMode')}>
        <span class="section-title">View Mode</span>
        <span class="chevron" class:expanded={expandedSections.renderMode}>›</span>
      </button>
      {#if expandedSections.renderMode}
        <div class="section-content">
          <div class="control">
            <label class="control-label">
              <span class="sr-only">View Mode</span>
              <select bind:value={$settings.renderMode} disabled={!$settings.imageLoaded}>
                {#each renderModes as mode}
                  <option value={mode.value}>{mode.label}</option>
                {/each}
              </select>
            </label>
          </div>
        </div>
      {/if}
    </section>

    <!-- Camera Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('camera')}>
        <span class="section-title">Camera Motion</span>
        <span class="chevron" class:expanded={expandedSections.camera}>›</span>
      </button>
      {#if expandedSections.camera}
        <div class="section-content">
          <div class="control">
            <span class="control-label-text">Motion Preset</span>
            <label class="select-label">
              <span class="sr-only">Motion Preset</span>
              <select bind:value={$settings.cameraPreset} disabled={!$settings.imageLoaded}>
                {#each cameraPresets as preset}
                  <option value={preset.value}>{preset.label}</option>
                {/each}
              </select>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Speed</span>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                bind:value={$settings.cameraSpeed}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.cameraSpeed.toFixed(1)}x</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Focal</span>
              <input
                type="range"
                min="18"
                max="200"
                step="1"
                bind:value={$settings.focalLength}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{formatFocalLength($settings.focalLength)}</span>
            </label>
          </div>
          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.cameraShakeEnabled} disabled={!$settings.imageLoaded} />
              <span>Camera Shake</span>
            </label>
            {#if $settings.cameraShakeEnabled}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.cameraShakeIntensity}
                disabled={!$settings.imageLoaded}
                aria-label="Camera Shake Intensity"
              />
            {/if}
          </div>
        </div>
      {/if}
    </section>

    <!-- Camera Transform Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('cameraTransform')}>
        <span class="section-title">Camera Transform</span>
        <span class="chevron" class:expanded={expandedSections.cameraTransform}>›</span>
      </button>
      {#if expandedSections.cameraTransform}
        <div class="section-content">
          <p class="section-hint">Additive offsets applied on top of motion preset</p>
          
          <span class="control-label-text">Position Offset</span>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">X</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={$settings.cameraOffsetX}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.cameraOffsetX.toFixed(2)}</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Y</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={$settings.cameraOffsetY}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.cameraOffsetY.toFixed(2)}</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Z</span>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.01"
                bind:value={$settings.cameraOffsetZ}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.cameraOffsetZ.toFixed(2)}</span>
            </label>
          </div>

          <span class="control-label-text" style="margin-top: 0.5rem">Rotation Offset</span>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Tilt</span>
              <input
                type="range"
                min="-30"
                max="30"
                step="0.5"
                bind:value={$settings.cameraRotationX}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.cameraRotationX.toFixed(1)}°</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Pan</span>
              <input
                type="range"
                min="-30"
                max="30"
                step="0.5"
                bind:value={$settings.cameraRotationY}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.cameraRotationY.toFixed(1)}°</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Roll</span>
              <input
                type="range"
                min="-30"
                max="30"
                step="0.5"
                bind:value={$settings.cameraRotationZ}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.cameraRotationZ.toFixed(1)}°</span>
            </label>
          </div>

          <button class="reset-btn" onclick={resetCameraTransform} disabled={!$settings.imageLoaded}>
            Reset Transform
          </button>
        </div>
      {/if}
    </section>

    <!-- Parallax Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('parallax')}>
        <span class="section-title">Parallax & Depth</span>
        <span class="chevron" class:expanded={expandedSections.parallax}>›</span>
      </button>
      {#if expandedSections.parallax}
        <div class="section-content">
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Strength</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.parallaxStrength}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{($settings.parallaxStrength * 100).toFixed(0)}</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Depth Scale</span>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                bind:value={$settings.depthScale}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.depthScale.toFixed(1)}x</span>
            </label>
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
            <label class="inline-label">
              <span class="label-text">Focus</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.focusDistance}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{($settings.focusDistance * 100).toFixed(0)}</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Aperture</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.aperture}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{($settings.aperture * 100).toFixed(0)}</span>
            </label>
          </div>
          <div class="control">
            <span class="control-label-text">Bokeh Quality</span>
            <label class="select-label">
              <span class="sr-only">Bokeh Quality</span>
              <select bind:value={$settings.bokehQuality} disabled={!$settings.imageLoaded}>
                {#each bokehQualities as quality}
                  <option value={quality.value}>{quality.label}</option>
                {/each}
              </select>
            </label>
          </div>
          <div class="subsection">
            <div class="toggle-control">
              <label>
                <input type="checkbox" bind:checked={$settings.tiltShiftEnabled} disabled={!$settings.imageLoaded} />
                <span>Tilt-Shift</span>
              </label>
            </div>
            {#if $settings.tiltShiftEnabled}
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Angle</span>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="1"
                    bind:value={$settings.tiltShiftAngle}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{$settings.tiltShiftAngle}°</span>
                </label>
              </div>
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Position</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.tiltShiftPosition}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.tiltShiftPosition * 100).toFixed(0)}</span>
                </label>
              </div>
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Blur</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.tiltShiftBlur}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.tiltShiftBlur * 100).toFixed(0)}</span>
                </label>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </section>

    <!-- Atmosphere Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('atmosphere')}>
        <span class="section-title">Atmosphere</span>
        <span class="chevron" class:expanded={expandedSections.atmosphere}>›</span>
      </button>
      {#if expandedSections.atmosphere}
        <div class="section-content">
          <div class="subsection">
            <div class="toggle-control">
              <label>
                <input type="checkbox" bind:checked={$settings.fogEnabled} disabled={!$settings.imageLoaded} />
                <span>Fog / Haze</span>
              </label>
            </div>
            {#if $settings.fogEnabled}
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Density</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.fogDensity}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.fogDensity * 100).toFixed(0)}</span>
                </label>
              </div>
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Near</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.fogNear}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.fogNear * 100).toFixed(0)}</span>
                </label>
              </div>
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Far</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.fogFar}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.fogFar * 100).toFixed(0)}</span>
                </label>
              </div>
              <div class="color-control indented">
                <label class="color-label">
                  <span class="label-text">Color</span>
                  <input
                    type="color"
                    bind:value={$settings.fogColor}
                    disabled={!$settings.imageLoaded}
                  />
                </label>
              </div>
            {/if}
          </div>
          <div class="subsection">
            <div class="toggle-control">
              <label>
                <input type="checkbox" bind:checked={$settings.depthTintEnabled} disabled={!$settings.imageLoaded} />
                <span>Depth Tint</span>
              </label>
            </div>
            {#if $settings.depthTintEnabled}
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Intensity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.depthTintIntensity}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.depthTintIntensity * 100).toFixed(0)}</span>
                </label>
              </div>
              <div class="color-control indented">
                <label class="color-label">
                  <span class="label-text">Near</span>
                  <input
                    type="color"
                    bind:value={$settings.depthTintNearColor}
                    disabled={!$settings.imageLoaded}
                  />
                </label>
              </div>
              <div class="color-control indented">
                <label class="color-label">
                  <span class="label-text">Far</span>
                  <input
                    type="color"
                    bind:value={$settings.depthTintFarColor}
                    disabled={!$settings.imageLoaded}
                  />
                </label>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </section>

    <!-- Color Grading Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('colorGrading')}>
        <span class="section-title">Color Grading</span>
        <span class="chevron" class:expanded={expandedSections.colorGrading}>›</span>
      </button>
      {#if expandedSections.colorGrading}
        <div class="section-content">
          <div class="control">
            <span class="control-label-text">Preset</span>
            <label class="select-label">
              <span class="sr-only">Color Preset</span>
              <select bind:value={$settings.colorPreset} disabled={!$settings.imageLoaded}>
                {#each colorPresets as preset}
                  <option value={preset.value}>{preset.label}</option>
                {/each}
              </select>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Exposure</span>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.05"
                bind:value={$settings.exposure}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.exposure > 0 ? '+' : ''}{$settings.exposure.toFixed(1)}</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Temp</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={$settings.temperature}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.temperature > 0 ? '+' : ''}{($settings.temperature * 100).toFixed(0)}</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Tint</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={$settings.tint}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.tint > 0 ? '+' : ''}{($settings.tint * 100).toFixed(0)}</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Contrast</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.01"
                bind:value={$settings.contrast}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.contrast.toFixed(2)}</span>
            </label>
          </div>
          <div class="control-inline">
            <label class="inline-label">
              <span class="label-text">Saturation</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                bind:value={$settings.saturation}
                disabled={!$settings.imageLoaded}
              />
              <span class="value">{$settings.saturation.toFixed(2)}</span>
            </label>
          </div>
          <div class="subsection">
            <div class="toggle-control">
              <label>
                <input type="checkbox" bind:checked={$settings.splitToneEnabled} disabled={!$settings.imageLoaded} />
                <span>Split Toning</span>
              </label>
            </div>
            {#if $settings.splitToneEnabled}
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Shadows</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    bind:value={$settings.splitToneShadowHue}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{$settings.splitToneShadowHue}°</span>
                </label>
              </div>
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Highlights</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    bind:value={$settings.splitToneHighlightHue}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{$settings.splitToneHighlightHue}°</span>
                </label>
              </div>
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Balance</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.splitToneBalance}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.splitToneBalance * 100).toFixed(0)}</span>
                </label>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </section>

    <!-- Lens FX Section -->
    <section class="section">
      <button class="section-header" onclick={() => toggleSection('lensFx')}>
        <span class="section-title">Lens FX</span>
        <span class="chevron" class:expanded={expandedSections.lensFx}>›</span>
      </button>
      {#if expandedSections.lensFx}
        <div class="section-content">
          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.anamorphicEnabled} disabled={!$settings.imageLoaded} />
              <span>Anamorphic</span>
            </label>
            {#if $settings.anamorphicEnabled}
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Squeeze</span>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.01"
                    bind:value={$settings.anamorphicStretch}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{$settings.anamorphicStretch.toFixed(2)}x</span>
                </label>
              </div>
            {/if}
          </div>
          {#if $settings.anamorphicEnabled}
            <div class="toggle-control">
              <label>
                <input type="checkbox" bind:checked={$settings.lensFlareEnabled} disabled={!$settings.imageLoaded} />
                <span>Lens Flare</span>
              </label>
              {#if $settings.lensFlareEnabled}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  bind:value={$settings.lensFlareIntensity}
                  disabled={!$settings.imageLoaded}
                  aria-label="Lens Flare Intensity"
                />
              {/if}
            </div>
          {/if}
          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.lensDistortionEnabled} disabled={!$settings.imageLoaded} />
              <span>Barrel/Pincushion</span>
            </label>
            {#if $settings.lensDistortionEnabled}
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={$settings.lensDistortionAmount}
                disabled={!$settings.imageLoaded}
                aria-label="Lens Distortion Amount"
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
                aria-label="Chromatic Aberration Intensity"
              />
            {/if}
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
              <input type="checkbox" bind:checked={$settings.bloomEnabled} disabled={!$settings.imageLoaded} />
              <span>Bloom</span>
            </label>
            {#if $settings.bloomEnabled}
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Threshold</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.bloomThreshold}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.bloomThreshold * 100).toFixed(0)}</span>
                </label>
              </div>
              <div class="control-inline indented">
                <label class="inline-label">
                  <span class="label-text">Intensity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={$settings.bloomIntensity}
                    disabled={!$settings.imageLoaded}
                  />
                  <span class="value">{($settings.bloomIntensity * 100).toFixed(0)}</span>
                </label>
              </div>
            {/if}
          </div>
          
          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.halationEnabled} disabled={!$settings.imageLoaded} />
              <span>Halation</span>
            </label>
            {#if $settings.halationEnabled}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.halationIntensity}
                disabled={!$settings.imageLoaded}
                aria-label="Halation Intensity"
              />
            {/if}
          </div>

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
                aria-label="Film Grain Intensity"
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
                aria-label="Vignette Intensity"
              />
            {/if}
          </div>

          <div class="toggle-control">
            <label>
              <input type="checkbox" bind:checked={$settings.sharpenEnabled} disabled={!$settings.imageLoaded} />
              <span>Sharpen</span>
            </label>
            {#if $settings.sharpenEnabled}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={$settings.sharpenIntensity}
                disabled={!$settings.imageLoaded}
                aria-label="Sharpen Intensity"
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
    width: 300px;
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
    gap: 0.25rem;
  }

  .control-label-text {
    font-size: 0.6875rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .select-label {
    display: block;
    width: 100%;
  }

  .control-inline {
    display: block;
  }

  .inline-label {
    display: grid;
    grid-template-columns: 4rem 1fr 2.5rem;
    align-items: center;
    gap: 0.5rem;
  }

  .label-text {
    font-size: 0.75rem;
    color: var(--text-primary);
  }

  .control-inline.indented .inline-label {
    margin-left: 1.25rem;
    grid-template-columns: 3.5rem 1fr 2.5rem;
  }

  .value {
    font-size: 0.6875rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
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

  .section-hint {
    font-size: 0.6875rem;
    color: var(--text-muted);
    margin: 0 0 0.5rem 0;
    font-style: italic;
  }

  .reset-btn {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    margin-top: 0.5rem;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .reset-btn:hover:not(:disabled) {
    background: var(--border);
    color: var(--text-primary);
  }

  .toggle-control {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .toggle-control > label {
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

  .toggle-control > input[type="range"] {
    margin-left: 1.25rem;
  }

  .subsection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  .color-control {
    display: block;
  }

  .color-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-label .label-text {
    min-width: 3rem;
  }

  .color-control.indented {
    margin-left: 1.25rem;
  }

  .color-control.indented .label-text {
    min-width: 2.5rem;
  }

  input[type="color"] {
    width: 32px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    background: none;
  }

  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  input[type="color"]::-webkit-color-swatch {
    border-radius: 2px;
    border: none;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
