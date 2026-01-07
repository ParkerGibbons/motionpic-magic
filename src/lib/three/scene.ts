import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Settings } from '../stores/settings'
import vertexShader from '../shaders/parallax.vert?raw'
import fragmentShader from '../shaders/parallax.frag?raw'

export interface Scene {
  updateSettings(settings: Settings): void
  loadTextures(colorUrl: string, depthUrl: string): Promise<void>
  dispose(): void
}

interface CameraPreset {
  update(time: number, speed: number): { position: THREE.Vector3; rotation: THREE.Euler }
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
        rotation: new THREE.Euler(Math.sin(t * 0.1) * 0.03, 0, 0)
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
  }
}

export function createScene(canvas: HTMLCanvasElement, initialSettings: Settings): Scene {
  // Scene setup
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
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
      parallaxStrength: { value: initialSettings.parallaxStrength },
      focusDistance: { value: initialSettings.focusDistance },
      aperture: { value: initialSettings.aperture },
      resolution: { value: new THREE.Vector2() },
      customCameraPos: { value: camera.position },
      time: { value: 0 },

      filmGrainEnabled: { value: initialSettings.filmGrainEnabled },
      filmGrainIntensity: { value: initialSettings.filmGrainIntensity },
      chromaticAberrationEnabled: { value: initialSettings.chromaticAberrationEnabled },
      chromaticAberrationIntensity: { value: initialSettings.chromaticAberrationIntensity },
      vignetteEnabled: { value: initialSettings.vignetteEnabled },
      vignetteIntensity: { value: initialSettings.vignetteIntensity },
      lensDistortionEnabled: { value: initialSettings.lensDistortionEnabled },
      lensDistortionAmount: { value: initialSettings.lensDistortionAmount }
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
  let animationTime = 0
  let animationId: number | null = null
  let currentSettings = { ...initialSettings }

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

    if (currentSettings.isPlaying) {
      animationTime += 0.016 // Assume 60fps

      // Disable controls during playback
      controls.enabled = false

      // Update camera based on preset
      const preset = cameraPresets[currentSettings.cameraPreset]
      if (preset) {
        const { position, rotation } = preset.update(animationTime, currentSettings.cameraSpeed)
        camera.position.copy(position)
        camera.rotation.copy(rotation)
      }

      // Update focus distance for drama preset
      if (currentSettings.cameraPreset === 'drama') {
        const focusProgress = (Math.sin(animationTime * currentSettings.cameraSpeed * 0.2) + 1) / 2
        material.uniforms.focusDistance.value = focusProgress
      }
    } else {
      // Enable controls when not playing
      controls.enabled = true
      controls.update()
    }

    material.uniforms.time.value = performance.now() * 0.001
    material.uniforms.customCameraPos.value.copy(camera.position)

    renderer.render(scene, camera)
  }

  animate()

  // Public API
  return {
    updateSettings(settings: Settings) {
      currentSettings = settings

      material.uniforms.parallaxStrength.value = settings.parallaxStrength
      material.uniforms.focusDistance.value = settings.focusDistance
      material.uniforms.aperture.value = settings.aperture

      material.uniforms.filmGrainEnabled.value = settings.filmGrainEnabled
      material.uniforms.filmGrainIntensity.value = settings.filmGrainIntensity
      material.uniforms.chromaticAberrationEnabled.value = settings.chromaticAberrationEnabled
      material.uniforms.chromaticAberrationIntensity.value = settings.chromaticAberrationIntensity
      material.uniforms.vignetteEnabled.value = settings.vignetteEnabled
      material.uniforms.vignetteIntensity.value = settings.vignetteIntensity
      material.uniforms.lensDistortionEnabled.value = settings.lensDistortionEnabled
      material.uniforms.lensDistortionAmount.value = settings.lensDistortionAmount

      if (!settings.isPlaying) {
        // Reset animation time when stopping
        if (currentSettings.isPlaying) {
          animationTime = 0
        }
      }
    },

    async loadTextures(colorUrl: string, depthUrl: string) {
      const textureLoader = new THREE.TextureLoader()

      const [colorTexture, depthTexture] = await Promise.all([
        textureLoader.loadAsync(colorUrl),
        textureLoader.loadAsync(depthUrl)
      ])

      colorTexture.minFilter = THREE.LinearFilter
      colorTexture.magFilter = THREE.LinearFilter
      depthTexture.minFilter = THREE.LinearFilter
      depthTexture.magFilter = THREE.LinearFilter

      material.uniforms.colorMap.value = colorTexture
      material.uniforms.depthMap.value = depthTexture

      // Adjust mesh to maintain image aspect ratio and fit in viewport
      const imageAspect = colorTexture.image.width / colorTexture.image.height
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
      const fov = 50
      const distance = 1 / Math.tan((fov / 2) * Math.PI / 180)
      camera.position.z = distance
      camera.updateProjectionMatrix()
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
