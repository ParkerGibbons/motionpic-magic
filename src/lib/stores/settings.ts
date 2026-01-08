import { writable } from 'svelte/store'

export type ColorPreset = 'none' | 'portra' | 'cinematic' | 'noir' | 'vintage' | 'cool-blue'
export type BokehQuality = 'fast' | 'medium' | 'high'
export type RenderMode = 'normal' | 'depth' | 'depth-color' | 'normals' | 'split'
export type ParallaxMode = 'offset' | 'raymarch'

export interface Settings {
  // Image state
  imageLoaded: boolean
  colorMapUrl: string | null
  depthMapUrl: string | null

  // Timeline
  currentTime: number
  duration: number
  isPlaying: boolean

  // Camera Motion
  cameraPreset: string
  cameraSpeed: number
  focalLength: number
  cameraShakeEnabled: boolean
  cameraShakeIntensity: number

  // Camera Transform (additive offsets)
  cameraOffsetX: number
  cameraOffsetY: number
  cameraOffsetZ: number
  cameraRotationX: number
  cameraRotationY: number
  cameraRotationZ: number

  // Parallax
  parallaxMode: ParallaxMode
  parallaxStrength: number

  // DOF
  focusDistance: number
  aperture: number
  bokehQuality: BokehQuality
  tiltShiftEnabled: boolean
  tiltShiftAngle: number
  tiltShiftPosition: number
  tiltShiftBlur: number

  // Atmosphere
  fogEnabled: boolean
  fogDensity: number
  fogNear: number
  fogFar: number
  fogColor: string
  depthTintEnabled: boolean
  depthTintNearColor: string
  depthTintFarColor: string
  depthTintIntensity: number

  // Color Grading
  colorPreset: ColorPreset
  temperature: number
  tint: number
  contrast: number
  saturation: number
  exposure: number
  splitToneEnabled: boolean
  splitToneShadowHue: number
  splitToneHighlightHue: number
  splitToneBalance: number

  // Lens FX
  anamorphicEnabled: boolean
  anamorphicStretch: number
  lensFlareEnabled: boolean
  lensFlareIntensity: number

  // Post-processing
  filmGrainEnabled: boolean
  filmGrainIntensity: number
  chromaticAberrationEnabled: boolean
  chromaticAberrationIntensity: number
  vignetteEnabled: boolean
  vignetteIntensity: number
  lensDistortionEnabled: boolean
  lensDistortionAmount: number
  bloomEnabled: boolean
  bloomThreshold: number
  bloomIntensity: number
  halationEnabled: boolean
  halationIntensity: number
  sharpenEnabled: boolean
  sharpenIntensity: number

  // Render Mode
  renderMode: RenderMode

  // Export
  exportResolution: '1080p' | '4k' | 'custom'
  exportFps: number
}

export const settings = writable<Settings>({
  imageLoaded: false,
  colorMapUrl: null,
  depthMapUrl: null,

  // Timeline
  currentTime: 0,
  duration: 5,
  isPlaying: false,

  // Camera Motion
  cameraPreset: 'gentle-push',
  cameraSpeed: 1.0,
  focalLength: 50,
  cameraShakeEnabled: false,
  cameraShakeIntensity: 0.3,

  // Camera Transform (additive)
  cameraOffsetX: 0,
  cameraOffsetY: 0,
  cameraOffsetZ: 0,
  cameraRotationX: 0,
  cameraRotationY: 0,
  cameraRotationZ: 0,

  parallaxMode: 'offset',
  parallaxStrength: 0.5,

  focusDistance: 0.5,
  aperture: 0.3,
  bokehQuality: 'medium',
  tiltShiftEnabled: false,
  tiltShiftAngle: 0,
  tiltShiftPosition: 0.5,
  tiltShiftBlur: 0.5,

  fogEnabled: false,
  fogDensity: 0.5,
  fogNear: 0.3,
  fogFar: 1.0,
  fogColor: '#8090a0',
  depthTintEnabled: false,
  depthTintNearColor: '#ffffff',
  depthTintFarColor: '#6080b0',
  depthTintIntensity: 0.3,

  colorPreset: 'none',
  temperature: 0,
  tint: 0,
  contrast: 1.0,
  saturation: 1.0,
  exposure: 0,
  splitToneEnabled: false,
  splitToneShadowHue: 220,
  splitToneHighlightHue: 40,
  splitToneBalance: 0.5,

  anamorphicEnabled: false,
  anamorphicStretch: 1.33,
  lensFlareEnabled: false,
  lensFlareIntensity: 0.5,

  filmGrainEnabled: true,
  filmGrainIntensity: 0.15,
  chromaticAberrationEnabled: false,
  chromaticAberrationIntensity: 0.5,
  vignetteEnabled: true,
  vignetteIntensity: 0.3,
  lensDistortionEnabled: false,
  lensDistortionAmount: 0.0,
  bloomEnabled: false,
  bloomThreshold: 0.8,
  bloomIntensity: 0.5,
  halationEnabled: false,
  halationIntensity: 0.3,
  sharpenEnabled: false,
  sharpenIntensity: 0.3,

  renderMode: 'normal',

  exportResolution: '1080p',
  exportFps: 30
})
