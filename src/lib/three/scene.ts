import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Settings } from '../stores/settings'
import vertexShader from '../shaders/parallax.vert?raw'
import fragmentShader from '../shaders/parallax.frag?raw'

export interface Scene {
  updateSettings(settings: Settings): void
  loadTextures(colorUrl: string, depthUrl: string): Promise<void>
  sampleDepthAt(x: number, y: number): number | null
  getCurrentTime(): number
  setTimeUpdateCallback(callback: (time: number) => void): void
  dispose(): void
}

interface CameraPresetResult {
  position: THREE.Vector3
  rotation: THREE.Euler
  focusOverride?: number
  fovOverride?: number
}

interface CameraPreset {
  update(time: number, speed: number, baseFov: number): CameraPresetResult
}

// Utility noise function for organic camera movement
function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(t: number, seed: number): number {
  const i = Math.floor(t)
  const f = t - i
  const smooth = f * f * (3 - 2 * f)
  return noise(i, seed) * (1 - smooth) + noise(i + 1, seed) * smooth
}

const cameraPresets: Record<string, CameraPreset> = {
  'gentle-push': {
    update(time, speed) {
      const t = time * speed * 0.3
      return {
        position: new THREE.Vector3(
          Math.sin(t * 0.2) * 0.1,
          Math.cos(t * 0.15) * 0.05,
          2 - t * 0.1
        ),
        rotation: new THREE.Euler(0, 0, Math.sin(t * 0.1) * 0.02)
      }
    }
  },
  'ken-burns': {
    update(time, speed) {
      const t = time * speed * 0.2
      return {
        position: new THREE.Vector3(
          -0.3 + t * 0.1,
          0.2 - t * 0.05,
          2.5 - t * 0.15
        ),
        rotation: new THREE.Euler(0, 0, 0)
      }
    }
  },
  'reveal': {
    update(time, speed) {
      const t = time * speed * 0.25
      const progress = Math.min(t * 0.3, 1)
      return {
        position: new THREE.Vector3(
          0,
          0,
          1.2 + (1.3 - progress * 1.3)
        ),
        rotation: new THREE.Euler(0, 0, 0)
      }
    }
  },
  'drama': {
    update(time, speed) {
      const t = time * speed * 0.3
      return {
        position: new THREE.Vector3(
          Math.sin(t * 0.15) * 0.05,
          -Math.abs(Math.cos(t * 0.2)) * 0.1,
          3 - t * 0.2
        ),
        rotation: new THREE.Euler(Math.sin(t * 0.1) * 0.03, 0, 0),
        focusOverride: (Math.sin(t * 0.2) + 1) / 2
      }
    }
  },
  'drift': {
    update(time, speed) {
      const t = time * speed * 0.15
      return {
        position: new THREE.Vector3(
          Math.sin(t * 0.3) * 0.2,
          Math.cos(t * 0.4) * 0.15,
          2 + Math.sin(t * 0.2) * 0.3
        ),
        rotation: new THREE.Euler(
          Math.sin(t * 0.25) * 0.02,
          Math.cos(t * 0.2) * 0.02,
          Math.sin(t * 0.15) * 0.03
        )
      }
    }
  },
  'orbit': {
    update(time, speed) {
      const t = time * speed * 0.2
      const radius = 2.2
      return {
        position: new THREE.Vector3(
          Math.sin(t) * radius * 0.15,
          Math.sin(t * 0.7) * 0.1,
          radius - Math.cos(t) * 0.3
        ),
        rotation: new THREE.Euler(
          Math.sin(t * 0.5) * 0.02,
          -Math.sin(t) * 0.1,
          0
        )
      }
    }
  },
  'handheld': {
    update(time, speed) {
      const t = time * speed
      // Multiple frequencies for organic feel
      const shake = {
        x: smoothNoise(t * 2, 1) * 0.015 + smoothNoise(t * 5, 2) * 0.008,
        y: smoothNoise(t * 2.3, 3) * 0.012 + smoothNoise(t * 4.7, 4) * 0.006,
        z: smoothNoise(t * 1.5, 5) * 0.02
      }
      // Subtle breathing
      const breathe = Math.sin(t * 0.8) * 0.03
      return {
        position: new THREE.Vector3(
          shake.x,
          shake.y + breathe * 0.5,
          2 + shake.z + breathe
        ),
        rotation: new THREE.Euler(
          smoothNoise(t * 1.8, 6) * 0.01,
          smoothNoise(t * 2.1, 7) * 0.01,
          smoothNoise(t * 1.3, 8) * 0.015
        )
      }
    }
  },
  'vertigo': {
    // Dolly zoom - push in while zooming out (Hitchcock effect)
    update(time, speed, baseFov) {
      const t = time * speed * 0.15
      const progress = Math.min(t, 1)
      // Push camera in
      const z = 3 - progress * 1.5
      // Zoom out (increase FOV) to compensate
      const fovMultiplier = 1 + progress * 0.8
      return {
        position: new THREE.Vector3(0, 0, z),
        rotation: new THREE.Euler(0, 0, 0),
        fovOverride: baseFov * fovMultiplier
      }
    }
  },
  'crane': {
    update(time, speed) {
      const t = time * speed * 0.2
      const progress = Math.min(t * 0.5, 1)
      // Rise up while looking down
      return {
        position: new THREE.Vector3(
          Math.sin(t * 0.3) * 0.05,
          -0.5 + progress * 1.0,
          2 + progress * 0.5
        ),
        rotation: new THREE.Euler(
          -progress * 0.15,
          Math.sin(t * 0.2) * 0.02,
          0
        )
      }
    }
  },
  'breathing': {
    update(time, speed) {
      const t = time * speed * 0.5
      // Slow, meditative in-out pulse
      const breathe = Math.sin(t) * 0.15
      const sway = Math.sin(t * 0.3) * 0.02
      return {
        position: new THREE.Vector3(
          sway,
          Math.sin(t * 0.7) * 0.01,
          2 + breathe
        ),
        rotation: new THREE.Euler(0, 0, Math.sin(t * 0.4) * 0.01)
      }
    }
  },
  'focus-pull': {
    update(time, speed) {
      const t = time * speed * 0.3
      // Static camera with focus rack
      const focusCycle = (Math.sin(t) + 1) / 2
      return {
        position: new THREE.Vector3(0, 0, 2),
        rotation: new THREE.Euler(0, 0, 0),
        focusOverride: focusCycle
      }
    }
  }
}

// Convert color preset name to integer for shader
function colorPresetToInt(preset: string): number {
  const presets: Record<string, number> = {
    'none': 0,
    'portra': 1,
    'cinematic': 2,
    'noir': 3,
    'vintage': 4,
    'cool-blue': 5
  }
  return presets[preset] ?? 0
}

// Convert bokeh quality to integer for shader
function bokehQualityToInt(quality: string): number {
  const qualities: Record<string, number> = {
    'fast': 0,
    'medium': 1,
    'high': 2
  }
  return qualities[quality] ?? 1
}

// Convert render mode to integer for shader
function renderModeToInt(mode: string): number {
  const modes: Record<string, number> = {
    'normal': 0,
    'depth': 1,
    'depth-color': 2,
    'normals': 3,
    'split': 4
  }
  return modes[mode] ?? 0
}

// Convert parallax mode to integer for shader
function parallaxModeToInt(mode: string): number {
  const modes: Record<string, number> = {
    'offset': 0,
    'raymarch': 1
  }
  return modes[mode] ?? 0
}

// Convert hex color to THREE.Color
function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

// Convert focal length to FOV
function focalLengthToFov(focalLength: number): number {
  // Based on 35mm full-frame sensor (36mm width)
  // FOV = 2 * atan(sensor_width / (2 * focal_length))
  const sensorWidth = 36
  const fovRadians = 2 * Math.atan(sensorWidth / (2 * focalLength))
  return fovRadians * (180 / Math.PI)
}

export function createScene(canvas: HTMLCanvasElement, initialSettings: Settings): Scene {
  // Scene setup
  const scene = new THREE.Scene()
  const baseFov = focalLengthToFov(initialSettings.focalLength)
  const camera = new THREE.PerspectiveCamera(baseFov, 1, 0.1, 100)
  camera.position.z = 2

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Create fullscreen quad with parallax material
  const geometry = new THREE.PlaneGeometry(2, 2)

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      colorMap: { value: null },
      depthMap: { value: null },
      parallaxMode: { value: parallaxModeToInt(initialSettings.parallaxMode) },
      parallaxStrength: { value: initialSettings.parallaxStrength },
      focusDistance: { value: initialSettings.focusDistance },
      aperture: { value: initialSettings.aperture },
      resolution: { value: new THREE.Vector2() },
      customCameraPos: { value: camera.position.clone() },
      time: { value: 0 },

      // DOF
      bokehQuality: { value: bokehQualityToInt(initialSettings.bokehQuality) },
      tiltShiftEnabled: { value: initialSettings.tiltShiftEnabled },
      tiltShiftAngle: { value: initialSettings.tiltShiftAngle },
      tiltShiftPosition: { value: initialSettings.tiltShiftPosition },
      tiltShiftBlur: { value: initialSettings.tiltShiftBlur },

      // Atmosphere
      fogEnabled: { value: initialSettings.fogEnabled },
      fogDensity: { value: initialSettings.fogDensity },
      fogNear: { value: initialSettings.fogNear },
      fogFar: { value: initialSettings.fogFar },
      fogColor: { value: hexToColor(initialSettings.fogColor) },
      depthTintEnabled: { value: initialSettings.depthTintEnabled },
      depthTintNearColor: { value: hexToColor(initialSettings.depthTintNearColor) },
      depthTintFarColor: { value: hexToColor(initialSettings.depthTintFarColor) },
      depthTintIntensity: { value: initialSettings.depthTintIntensity },

      // Color grading
      colorPreset: { value: colorPresetToInt(initialSettings.colorPreset) },
      temperature: { value: initialSettings.temperature },
      tint: { value: initialSettings.tint },
      contrast: { value: initialSettings.contrast },
      saturation: { value: initialSettings.saturation },
      exposure: { value: initialSettings.exposure },
      splitToneEnabled: { value: initialSettings.splitToneEnabled },
      splitToneShadowHue: { value: initialSettings.splitToneShadowHue },
      splitToneHighlightHue: { value: initialSettings.splitToneHighlightHue },
      splitToneBalance: { value: initialSettings.splitToneBalance },

      // Lens FX
      anamorphicEnabled: { value: initialSettings.anamorphicEnabled },
      anamorphicStretch: { value: initialSettings.anamorphicStretch },
      lensFlareEnabled: { value: initialSettings.lensFlareEnabled },
      lensFlareIntensity: { value: initialSettings.lensFlareIntensity },

      // Post-processing
      filmGrainEnabled: { value: initialSettings.filmGrainEnabled },
      filmGrainIntensity: { value: initialSettings.filmGrainIntensity },
      chromaticAberrationEnabled: { value: initialSettings.chromaticAberrationEnabled },
      chromaticAberrationIntensity: { value: initialSettings.chromaticAberrationIntensity },
      vignetteEnabled: { value: initialSettings.vignetteEnabled },
      vignetteIntensity: { value: initialSettings.vignetteIntensity },
      lensDistortionEnabled: { value: initialSettings.lensDistortionEnabled },
      lensDistortionAmount: { value: initialSettings.lensDistortionAmount },
      bloomEnabled: { value: initialSettings.bloomEnabled },
      bloomThreshold: { value: initialSettings.bloomThreshold },
      bloomIntensity: { value: initialSettings.bloomIntensity },
      halationEnabled: { value: initialSettings.halationEnabled },
      halationIntensity: { value: initialSettings.halationIntensity },
      sharpenEnabled: { value: initialSettings.sharpenEnabled },
      sharpenIntensity: { value: initialSettings.sharpenIntensity },

      // Render mode
      renderMode: { value: renderModeToInt(initialSettings.renderMode) }
    }
  })

  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  // Add orbit controls for manual interaction
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enableZoom = true
  controls.enablePan = true
  controls.minDistance = 0.5
  controls.maxDistance = 5

  // Animation state
  let animationId: number | null = null
  let currentSettings = { ...initialSettings }
  let currentBaseFov = baseFov
  let lastFrameTime = performance.now()

  // Camera shake state
  let shakeOffset = { x: 0, y: 0, rot: 0 }

  // Depth texture for sampling
  let depthTexture: THREE.Texture | null = null

  // Callback for time updates
  let onTimeUpdate: ((time: number) => void) | null = null

  // Handle resize
  function handleResize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height, false)
    material.uniforms.resolution.value.set(width, height)
  }

  handleResize()
  window.addEventListener('resize', handleResize)

  // Animation loop
  function animate() {
    animationId = requestAnimationFrame(animate)

    const now = performance.now()
    const deltaTime = (now - lastFrameTime) / 1000
    lastFrameTime = now
    const time = now * 0.001

    // Current time for animation (from settings or advancing during playback)
    let animTime = currentSettings.currentTime

    if (currentSettings.isPlaying) {
      // Advance time
      animTime += deltaTime

      // Loop or stop at end
      if (animTime >= currentSettings.duration) {
        animTime = 0 // Loop
      }

      // Notify time update
      if (onTimeUpdate) {
        onTimeUpdate(animTime)
      }

      // Disable controls during playback
      controls.enabled = false

      // Update camera based on preset
      const preset = cameraPresets[currentSettings.cameraPreset]
      if (preset) {
        const result = preset.update(animTime, currentSettings.cameraSpeed, currentBaseFov)
        camera.position.copy(result.position)
        camera.rotation.copy(result.rotation)

        // Handle focus override from preset
        if (result.focusOverride !== undefined) {
          material.uniforms.focusDistance.value = result.focusOverride
        }

        // Handle FOV override from preset (vertigo effect)
        if (result.fovOverride !== undefined) {
          camera.fov = result.fovOverride
          camera.updateProjectionMatrix()
        } else {
          camera.fov = currentBaseFov
          camera.updateProjectionMatrix()
        }
      }
    } else {
      // When not playing, enable manual orbit controls
      controls.enabled = true
      controls.update()

      // Reset FOV to base value
      if (camera.fov !== currentBaseFov) {
        camera.fov = currentBaseFov
        camera.updateProjectionMatrix()
      }
    }

    // Apply camera transform offsets (additive reframing)
    camera.position.x += currentSettings.cameraOffsetX
    camera.position.y += currentSettings.cameraOffsetY
    camera.position.z += currentSettings.cameraOffsetZ
    camera.rotation.x += currentSettings.cameraRotationX * Math.PI / 180
    camera.rotation.y += currentSettings.cameraRotationY * Math.PI / 180
    camera.rotation.z += currentSettings.cameraRotationZ * Math.PI / 180

    // Apply camera shake (works in both playing and manual modes)
    const finalPos = camera.position.clone()
    if (currentSettings.cameraShakeEnabled) {
      const intensity = currentSettings.cameraShakeIntensity
      shakeOffset.x = smoothNoise(time * 3, 10) * 0.02 * intensity
      shakeOffset.y = smoothNoise(time * 3.2, 11) * 0.015 * intensity
      shakeOffset.rot = smoothNoise(time * 2, 12) * 0.01 * intensity

      finalPos.x += shakeOffset.x
      finalPos.y += shakeOffset.y
    }
    
    material.uniforms.customCameraPos.value.copy(finalPos)
    material.uniforms.time.value = time

    renderer.render(scene, camera)
  }

  animate()

  // Public API
  return {
    updateSettings(settings: Settings) {
      currentSettings = settings

      // Update focal length / FOV
      const newBaseFov = focalLengthToFov(settings.focalLength)
      if (newBaseFov !== currentBaseFov) {
        currentBaseFov = newBaseFov
        if (!settings.isPlaying) {
          camera.fov = currentBaseFov
          camera.updateProjectionMatrix()
        }
      }

      // Core uniforms
      material.uniforms.parallaxMode.value = parallaxModeToInt(settings.parallaxMode)
      material.uniforms.parallaxStrength.value = settings.parallaxStrength
      material.uniforms.focusDistance.value = settings.focusDistance
      material.uniforms.aperture.value = settings.aperture

      // DOF
      material.uniforms.bokehQuality.value = bokehQualityToInt(settings.bokehQuality)
      material.uniforms.tiltShiftEnabled.value = settings.tiltShiftEnabled
      material.uniforms.tiltShiftAngle.value = settings.tiltShiftAngle
      material.uniforms.tiltShiftPosition.value = settings.tiltShiftPosition
      material.uniforms.tiltShiftBlur.value = settings.tiltShiftBlur

      // Atmosphere
      material.uniforms.fogEnabled.value = settings.fogEnabled
      material.uniforms.fogDensity.value = settings.fogDensity
      material.uniforms.fogNear.value = settings.fogNear
      material.uniforms.fogFar.value = settings.fogFar
      material.uniforms.fogColor.value = hexToColor(settings.fogColor)
      material.uniforms.depthTintEnabled.value = settings.depthTintEnabled
      material.uniforms.depthTintNearColor.value = hexToColor(settings.depthTintNearColor)
      material.uniforms.depthTintFarColor.value = hexToColor(settings.depthTintFarColor)
      material.uniforms.depthTintIntensity.value = settings.depthTintIntensity

      // Color grading
      material.uniforms.colorPreset.value = colorPresetToInt(settings.colorPreset)
      material.uniforms.temperature.value = settings.temperature
      material.uniforms.tint.value = settings.tint
      material.uniforms.contrast.value = settings.contrast
      material.uniforms.saturation.value = settings.saturation
      material.uniforms.exposure.value = settings.exposure
      material.uniforms.splitToneEnabled.value = settings.splitToneEnabled
      material.uniforms.splitToneShadowHue.value = settings.splitToneShadowHue
      material.uniforms.splitToneHighlightHue.value = settings.splitToneHighlightHue
      material.uniforms.splitToneBalance.value = settings.splitToneBalance

      // Lens FX
      material.uniforms.anamorphicEnabled.value = settings.anamorphicEnabled
      material.uniforms.anamorphicStretch.value = settings.anamorphicStretch
      material.uniforms.lensFlareEnabled.value = settings.lensFlareEnabled
      material.uniforms.lensFlareIntensity.value = settings.lensFlareIntensity

      // Post-processing
      material.uniforms.filmGrainEnabled.value = settings.filmGrainEnabled
      material.uniforms.filmGrainIntensity.value = settings.filmGrainIntensity
      material.uniforms.chromaticAberrationEnabled.value = settings.chromaticAberrationEnabled
      material.uniforms.chromaticAberrationIntensity.value = settings.chromaticAberrationIntensity
      material.uniforms.vignetteEnabled.value = settings.vignetteEnabled
      material.uniforms.vignetteIntensity.value = settings.vignetteIntensity
      material.uniforms.lensDistortionEnabled.value = settings.lensDistortionEnabled
      material.uniforms.lensDistortionAmount.value = settings.lensDistortionAmount
      material.uniforms.bloomEnabled.value = settings.bloomEnabled
      material.uniforms.bloomThreshold.value = settings.bloomThreshold
      material.uniforms.bloomIntensity.value = settings.bloomIntensity
      material.uniforms.halationEnabled.value = settings.halationEnabled
      material.uniforms.halationIntensity.value = settings.halationIntensity
      material.uniforms.sharpenEnabled.value = settings.sharpenEnabled
      material.uniforms.sharpenIntensity.value = settings.sharpenIntensity

      // Render mode
      material.uniforms.renderMode.value = renderModeToInt(settings.renderMode)

      if (!settings.isPlaying) {
        // Reset animation time when stopping
        if (currentSettings.isPlaying) {
          animationTime = 0
        }
      }
    },

    async loadTextures(colorUrl: string, depthUrl: string) {
      const textureLoader = new THREE.TextureLoader()

      const [colorTex, depthTex] = await Promise.all([
        textureLoader.loadAsync(colorUrl),
        textureLoader.loadAsync(depthUrl)
      ])

      colorTex.minFilter = THREE.LinearFilter
      colorTex.magFilter = THREE.LinearFilter
      depthTex.minFilter = THREE.LinearFilter
      depthTex.magFilter = THREE.LinearFilter

      material.uniforms.colorMap.value = colorTex
      material.uniforms.depthMap.value = depthTex
      
      // Store depth texture for sampling
      depthTexture = depthTex

      // Adjust mesh to maintain image aspect ratio and fit in viewport
      const imageAspect = colorTex.image.width / colorTex.image.height
      const viewportAspect = canvas.clientWidth / canvas.clientHeight

      // Scale the mesh to fit within the viewport
      if (imageAspect > viewportAspect) {
        // Image is wider - fit to width
        mesh.scale.set(1, 1 / imageAspect, 1)
      } else {
        // Image is taller - fit to height
        mesh.scale.set(imageAspect, 1, 1)
      }

      // Adjust camera FOV and position to properly frame the image
      const distance = 1 / Math.tan((currentBaseFov / 2) * Math.PI / 180)
      camera.position.z = distance
      camera.updateProjectionMatrix()
    },

    sampleDepthAt(x: number, y: number): number | null {
      // x, y are normalized coordinates (0-1)
      if (!depthTexture || !depthTexture.image) return null
      
      const img = depthTexture.image as HTMLImageElement
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      ctx.drawImage(img, 0, 0)
      const px = Math.floor(x * img.width)
      const py = Math.floor((1 - y) * img.height) // Flip Y
      const data = ctx.getImageData(px, py, 1, 1).data
      
      // Return normalized depth (0-1)
      return data[0] / 255
    },

    getCurrentTime(): number {
      return currentSettings.currentTime
    },

    setTimeUpdateCallback(callback: (time: number) => void) {
      onTimeUpdate = callback
    },

    dispose() {
      window.removeEventListener('resize', handleResize)
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
      }
      controls.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }
}
