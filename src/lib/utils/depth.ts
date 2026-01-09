import { pipeline, type DepthEstimationPipeline } from '@huggingface/transformers'

export type DepthModelType = 'depth-anything' | 'depth-anything-base' | 'depth-pro'

let depthEstimators: Record<DepthModelType, DepthEstimationPipeline | null> = {
  'depth-anything': null,
  'depth-anything-base': null,
  'depth-pro': null
}
let modelLoadingPromises: Record<DepthModelType, Promise<DepthEstimationPipeline> | null> = {
  'depth-anything': null,
  'depth-anything-base': null,
  'depth-pro': null
}

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
async function initDepthModel(modelType: DepthModelType, onProgress?: ProgressCallback): Promise<DepthEstimationPipeline> {
  if (depthEstimators[modelType]) {
    return depthEstimators[modelType]!
  }

  if (modelLoadingPromises[modelType]) {
    return modelLoadingPromises[modelType]!
  }

  const modelConfig = getModelConfig(modelType)

  modelLoadingPromises[modelType] = (async () => {
    onProgress?.({ status: `Loading ${modelConfig.name}...` })

    const estimator = await pipeline('depth-estimation', modelConfig.huggingFaceId, {
      device: modelConfig.device,
      dtype: modelConfig.dtype,
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
      if (modelConfig.device === 'webgpu') {
        console.warn('WebGPU not available, falling back to WASM:', err)
        onProgress?.({ status: `Loading ${modelConfig.name} (CPU mode)...` })

        return await pipeline('depth-estimation', modelConfig.huggingFaceId, {
          device: 'wasm',
          dtype: modelConfig.fallbackDtype || 'fp32',
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
      }
      throw err
    })

    depthEstimators[modelType] = estimator
    modelLoadingPromises[modelType] = null
    return estimator
  })()

  return modelLoadingPromises[modelType]!
}

/**
 * Get model configuration based on type
 */
function getModelConfig(modelType: DepthModelType) {
  switch (modelType) {
    case 'depth-anything':
      return {
        name: 'Depth-Anything V2 Small',
        huggingFaceId: 'onnx-community/depth-anything-v2-small',
        device: 'webgpu' as const,
        dtype: 'fp16' as const,
        fallbackDtype: 'fp32' as const,
        description: 'Fast, lower quality (best for quick previews)'
      }
    case 'depth-anything-base':
      return {
        name: 'Depth-Anything V2 Base',
        huggingFaceId: 'onnx-community/depth-anything-v2-base',
        device: 'webgpu' as const,
        dtype: 'fp16' as const,
        fallbackDtype: 'fp32' as const,
        description: 'Balanced quality and speed (recommended)'
      }
    case 'depth-pro':
      return {
        name: 'Depth Pro',
        huggingFaceId: 'onnx-community/DepthPro-ONNX',
        device: 'wasm' as const, // Force CPU for Depth Pro to avoid WebGPU buffer limits
        dtype: 'q4' as const, // Use 4-bit quantization as recommended by HuggingFace
        fallbackDtype: 'q4' as const,
        description: 'Highest quality, slowest (CPU-only, may fail)'
      }
  }
}

/**
 * Generate depth map from an image
 * @param imageElement - HTMLImageElement containing the source image
 * @param modelType - Which depth model to use
 * @param onProgress - Optional callback for progress updates
 */
export async function generateDepthMap(
  imageElement: HTMLImageElement,
  modelType: DepthModelType = 'depth-anything',
  onProgress?: ProgressCallback
): Promise<DepthResult> {
  const startTime = performance.now()

  // Initialize model if not already loaded
  const estimator = await initDepthModel(modelType, onProgress)

  onProgress?.({ status: 'Processing image...' })

  // Run depth estimation - transformers.js expects URL or image data
  // Convert HTMLImageElement to canvas then to data URL
  const canvas = document.createElement('canvas')
  canvas.width = imageElement.width
  canvas.height = imageElement.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')
  ctx.drawImage(imageElement, 0, 0)

  // Use the canvas or image URL directly
  const result = await estimator(imageElement.src)

  console.log('Depth estimation result:', result)
  console.log('Result type:', typeof result)
  console.log('Result keys:', Object.keys(result || {}))

  // Handle different model output formats
  let depthMap: ImageData
  let focalLength: number

  // Depth-Anything-V2 returns { predicted_depth: Tensor, depth: RawImage }
  // DepthPro returns { predicted_depth: Tensor, focallength_px: number } but may also include depth RawImage
  if (result.depth && result.depth.data && result.depth.width && result.depth.height) {
    // RawImage format - convert directly to ImageData
    const rawImage = result.depth
    depthMap = new ImageData(rawImage.width, rawImage.height)
    const pixels = depthMap.data

    // RawImage has 1 channel (grayscale), convert to RGBA
    const shouldInvert = modelType === 'depth-pro' // DepthPro uses inverse depth
    for (let i = 0; i < rawImage.data.length; i++) {
      const pixelIndex = i * 4
      let value = rawImage.data[i]

      // Invert if needed (DepthPro outputs inverse depth)
      if (shouldInvert) {
        value = 255 - value
      }

      pixels[pixelIndex] = value      // R
      pixels[pixelIndex + 1] = value  // G
      pixels[pixelIndex + 2] = value  // B
      pixels[pixelIndex + 3] = 255    // A
    }

    // Use focal length from model if available (DepthPro), otherwise estimate
    focalLength = result.focallength_px || Math.max(imageElement.width, imageElement.height) * 1.2
  } else {
    // DepthPro or other models: Use tensor processing
    const depthTensor = result.predicted_depth || result.depth || result
    const shouldInvert = modelType === 'depth-pro' // DepthPro uses inverse depth
    depthMap = await depthTensorToImageData(depthTensor, imageElement.width, imageElement.height, shouldInvert)

    // Use focal length from model if available (DepthPro)
    focalLength = result.focallength_px || Math.max(imageElement.width, imageElement.height) * 1.2
  }

  const processingTime = performance.now() - startTime

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
  targetWidth: number,
  targetHeight: number,
  invert: boolean = false
): Promise<ImageData> {
  // Handle different tensor formats
  let depthData: Float32Array | number[]
  let tensorWidth: number
  let tensorHeight: number

  if (depthTensor.data) {
    // Standard tensor with .data() method
    depthData = await depthTensor.data()
    tensorWidth = depthTensor.dims?.[3] || depthTensor.dims?.[2] || targetWidth
    tensorHeight = depthTensor.dims?.[2] || depthTensor.dims?.[1] || targetHeight
  } else if (depthTensor instanceof Float32Array || Array.isArray(depthTensor)) {
    // Already an array
    depthData = depthTensor
    tensorWidth = targetWidth
    tensorHeight = targetHeight
  } else {
    throw new Error('Unsupported depth tensor format')
  }

  // Normalize depth values to 0-255 range
  let minDepth = Infinity
  let maxDepth = -Infinity

  for (let i = 0; i < depthData.length; i++) {
    if (depthData[i] < minDepth) minDepth = depthData[i]
    if (depthData[i] > maxDepth) maxDepth = depthData[i]
  }

  const range = maxDepth - minDepth || 1 // Avoid division by zero

  // Create ImageData at target size
  const imageData = new ImageData(tensorWidth, tensorHeight)
  const pixels = imageData.data

  for (let i = 0; i < depthData.length; i++) {
    // Normalize to 0-255
    let normalizedDepth = ((depthData[i] - minDepth) / range) * 255

    // Invert if needed (DepthPro outputs inverse depth)
    if (invert) {
      normalizedDepth = 255 - normalizedDepth
    }

    // Set RGBA (grayscale depth map)
    const pixelIndex = i * 4
    pixels[pixelIndex] = normalizedDepth
    pixels[pixelIndex + 1] = normalizedDepth
    pixels[pixelIndex + 2] = normalizedDepth
    pixels[pixelIndex + 3] = 255 // Alpha
  }

  // If tensor size doesn't match target, we'd need to resize
  // For now, return as-is (browsers will resize the texture)
  return imageData
}

/**
 * Preload the model before it's needed (e.g., on app start)
 */
export async function preloadDepthModel(modelType: DepthModelType = 'depth-anything', onProgress?: ProgressCallback): Promise<void> {
  await initDepthModel(modelType, onProgress)
}

/**
 * Get information about available depth models
 */
export function getAvailableModels() {
  return [
    {
      id: 'depth-anything' as const,
      ...getModelConfig('depth-anything')
    },
    {
      id: 'depth-anything-base' as const,
      ...getModelConfig('depth-anything-base')
    },
    {
      id: 'depth-pro' as const,
      ...getModelConfig('depth-pro')
    }
  ]
}
