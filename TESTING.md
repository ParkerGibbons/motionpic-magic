# Testing Guide

## Quick Start

### 1. Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend runs at http://localhost:8000

### 2. Start Frontend

```bash
npm install
npm run dev
```

Frontend runs at http://localhost:5173

### 3. Test Flow

1. Load an image (drag & drop or click to browse)
2. Image appears immediately
3. "Generating depth map..." spinner appears
4. After processing, depth map is applied
5. Adjust parallax/camera settings to see effect

## Expected Behavior

- **First load**: Slower (model initialization) - 5-30s depending on hardware
- **Subsequent loads**: Faster (model cached) - 1-5s
- **Error handling**: If backend is offline, you'll see error toast

## Depth Map Quality

- **MiDaS** (default): Fast setup, good quality
- **Depth Pro**: Better quality, requires more setup (see backend/README.md)

## Troubleshooting

### Backend not responding
- Check backend is running at http://localhost:8000
- Check console for CORS errors
- Verify Python dependencies installed

### Depth generation slow
- First request loads model (normal)
- GPU recommended for good performance
- Check backend console for timing logs

### Parallax not visible
- Increase "Parallax Strength" slider in sidebar
- Try camera presets like "gentle-push"
- Ensure depth map generated successfully (check console)
