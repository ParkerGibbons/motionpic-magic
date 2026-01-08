from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import time
from pathlib import Path
from depth import generate_depth_map

app = FastAPI(title="MotionPic Magic API")

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create output directory
OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

@app.get("/")
def read_root():
    return {"status": "MotionPic Magic API is running"}

@app.post("/api/depth")
async def create_depth_map(file: UploadFile = File(...)):
    """
    Generate a depth map from an uploaded image.

    Returns:
        - depth_map_url: URL to access the generated depth map
        - focal_length_px: Estimated focal length in pixels
        - processing_time_ms: Time taken to process
    """
    start_time = time.time()

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read image data
        image_data = await file.read()

        # Generate unique filename
        timestamp = int(time.time() * 1000)
        filename = f"depth_{timestamp}.png"
        output_path = OUTPUTS_DIR / filename

        # Generate depth map
        focal_length = generate_depth_map(image_data, str(output_path))

        processing_time = int((time.time() - start_time) * 1000)

        return {
            "depth_map_url": f"/outputs/{filename}",
            "focal_length_px": focal_length,
            "processing_time_ms": processing_time
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate depth map: {str(e)}")

@app.get("/outputs/{filename}")
async def get_output_file(filename: str):
    """Serve generated depth map files"""
    file_path = OUTPUTS_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
