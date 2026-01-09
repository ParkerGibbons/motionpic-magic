import { pipeline, type DepthEstimationPipeline } from '@huggingface/transformers'

let depthEstimator: DepthEstimationPipeline | null = null
let modelLoadingPromise: Promise<DepthEstimationPipeline> | null = null

export interface DepthResult {
  depthMap: ImageData
  focalLength: number
  processingTime: number
}

export interface ProgressCallback {
  (progress: { status: string; progress?: number; loaded?: number; total?: number }): void
}

/**
 * Initialize the depth estimation model
 * Model downloads once and is cached by the browser
 */
async function initDepthModel(onProgress?: ProgressCallback): Promise<DepthEstimationPipeline> {
  if (depthEstimator) {
    return depthEstimator
  }

  if (modelLoadingPromise) {
    return modelLoadingPromise
  }

  modelLoadingPromise = (async () => {
    onProgress?.({ status: 'Loading depth estimation model...' })

    const estimator = await pipeline('depth-estimation', 'depth-anything/Depth-Anything-V2-Small-hf', {
      device: 'webgpu', // Try WebGPU first (GPU acceleration)
      progress_callback: (progress) => {
        if (progress.status === 'progress' && progress.file) {
          onProgress?.({
            status: `Downloading ${progress.file}...`,
            progress: progress.progress || 0,
            loaded: progress.loaded,
            total: progress.total,
          })
        } else if (progress.status === 'ready') {
          onProgress?.({ status: 'Model ready!' })
        }
      },
    }).catch(async (err) => {
      // Fallback to WASM if WebGPU fails
      console.warn('WebGPU not available, falling back to WASM:', err)
      onProgress?.({ status: 'Loading model (CPU mode)...' })

      return await pipeline('depth-estimation', 'depth-anything/Depth-Anything-V2-Small-hf', {
        device: 'wasm',
        progress_callback: (progress) => {
          if (progress.status === 'progress' && progress.file) {
            onProgress?.({
              status: `Downloading ${progress.file}...`,
              progress: progress.progress || 0,
              loaded: progress.loaded,
              total: progress.total,
            })
          } else if (progress.status === 'ready') {
            onProgress?.({ status: 'Model ready!' })
          }
        },
      })
    })

    depthEstimator = estimator
    modelLoadingPromise = null
    return estimator
  })()

  return modelLoadingPromise
}

/**
 * Generate depth map from an image
 * @param imageElement - HTMLImageElement containing the source image
 * @param onProgress - Optional callback for progress updates
 */
export async function generateDepthMap(
  imageElement: HTMLImageElement,
  onProgress?: ProgressCallback
): Promise<DepthResult> {
  const startTime = performance.now()

  // Initialize model if not already loaded
  const estimator = await initDepthModel(onProgress)

  onProgress?.({ status: 'Processing image...' })

  // Run depth estimation
  const result = await estimator(imageElement)

  // Convert depth map to ImageData
  const depthMap = await depthTensorToImageData(result.depth, imageElement.width, imageElement.height)

  const processingTime = performance.now() - startTime

  // Estimate focal length (simplified - can be improved)
  const focalLength = Math.max(imageElement.width, imageElement.height) * 1.2

  onProgress?.({ status: 'Complete!' })

  return {
    depthMap,
    focalLength,
    processingTime,
  }
}

/**
 * Convert depth tensor to ImageData for use as texture
 */
async function depthTensorToImageData(
  depthTensor: any,
  width: number,
  height: number
): Promise<ImageData> {
  // Get the depth data as a Float32Array
  const depthData = await depthTensor.data()

  // Normalize depth values to 0-255 range
  let minDepth = Infinity
  let maxDepth = -Infinity

  for (let i = 0; i < depthData.length; i++) {
    if (depthData[i] < minDepth) minDepth = depthData[i]
    if (depthData[i] > maxDepth) maxDepth = depthData[i]
  }

  const range = maxDepth - minDepth

  // Create ImageData
  const imageData = new ImageData(width, height)
  const pixels = imageData.data

  for (let i = 0; i < depthData.length; i++) {
    // Normalize to 0-255
    const normalizedDepth = ((depthData[i] - minDepth) / range) * 255

    // Set RGBA (grayscale depth map)
    const pixelIndex = i * 4
    pixels[pixelIndex] = normalizedDepth
    pixels[pixelIndex + 1] = normalizedDepth
    pixels[pixelIndex + 2] = normalizedDepth
    pixels[pixelIndex + 3] = 255 // Alpha
  }

  return imageData
}

/**
 * Preload the model before it's needed (e.g., on app start)
 */
export async function preloadDepthModel(onProgress?: ProgressCallback): Promise<void> {
  await initDepthModel(onProgress)
}
