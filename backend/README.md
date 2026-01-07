# MotionPic Magic Backend

FastAPI backend for depth map generation.

## Setup

### Option 1: MiDaS (Easy, Fast Setup)

MiDaS is simpler to install and works well:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Option 2: Depth Pro (Better Quality, More Setup)

For Apple's Depth Pro (better quality but requires more setup):

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Clone and install Depth Pro
git clone https://github.com/apple/ml-depth-pro.git
cd ml-depth-pro
pip install -e .
cd ..
```

## Run

```bash
python main.py
```

Server will start at http://localhost:8000

## API Endpoints

### POST /api/depth

Upload an image and get a depth map.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/depth" \
  -F "file=@your_image.jpg"
```

**Response:**
```json
{
  "depth_map_url": "/outputs/depth_1234567890.png",
  "focal_length_px": 1234.5,
  "processing_time_ms": 892
}
```

### GET /outputs/{filename}

Download a generated depth map.

## Notes

- First request will be slow (model loading)
- Subsequent requests are much faster (model cached)
- GPU highly recommended for good performance
- Falls back to MiDaS if Depth Pro not available
