const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface DepthMapResponse {
  depth_map_url: string
  focal_length_px: number
  processing_time_ms: number
}

export async function generateDepthMap(file: File): Promise<DepthMapResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/api/depth`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  const data = await response.json()

  // Convert relative URL to absolute
  if (data.depth_map_url.startsWith('/')) {
    data.depth_map_url = `${API_URL}${data.depth_map_url}`
  }

  return data
}
