import { writable } from 'svelte/store'

export interface Settings {
  // Image state
  imageLoaded: boolean
  colorMapUrl: string | null
  depthMapUrl: string | null

  // Camera
  cameraPreset: string
  cameraSpeed: number

  // Parallax
  parallaxStrength: number

  // DOF
  focusDistance: number
  aperture: number

  // Post-processing
  filmGrainEnabled: boolean
  filmGrainIntensity: number
  chromaticAberrationEnabled: boolean
  chromaticAberrationIntensity: number
  vignetteEnabled: boolean
  vignetteIntensity: number
  lensDistortionEnabled: boolean
  lensDistortionAmount: number

  // Export
  exportResolution: '1080p' | '4k' | 'custom'
  exportDuration: number
  exportFps: number

  // Playback
  isPlaying: boolean
}

export const settings = writable<Settings>({
  imageLoaded: false,
  colorMapUrl: null,
  depthMapUrl: null,

  cameraPreset: 'gentle-push',
  cameraSpeed: 1.0,

  parallaxStrength: 0.5,

  focusDistance: 0.5,
  aperture: 0.3,

  filmGrainEnabled: true,
  filmGrainIntensity: 0.15,
  chromaticAberrationEnabled: false,
  chromaticAberrationIntensity: 0.5,
  vignetteEnabled: true,
  vignetteIntensity: 0.3,
  lensDistortionEnabled: false,
  lensDistortionAmount: 0.0,

  exportResolution: '1080p',
  exportDuration: 5,
  exportFps: 30,

  isPlaying: false
})
