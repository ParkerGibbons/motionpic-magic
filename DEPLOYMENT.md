# Deployment Guide

## Prerequisites: Publishing to GitHub

Before deploying, you need to publish your repository to GitHub. This repository was configured to exclude large files that can't be pushed to GitHub.

### What Was Cleaned Up

The following large files and directories have been excluded from git tracking:

- `backend/venv/` - Python virtual environment (198MB+ of packages)
- `backend/models/` - AI model cache (models download on first use)
- Compiled libraries (`.dylib`, `.so` files)

These are already listed in `.gitignore` and won't be tracked going forward.

### First-Time GitHub Setup

1. **Create GitHub repository:**
   ```bash
   # Go to github.com and create a new repository
   # Name it: motionpic-magic
   # Don't initialize with README (we already have one)
   ```

2. **Link your local repo to GitHub:**
   ```bash
   # Add GitHub as remote (replace YOUR_USERNAME)
   git remote add origin https://github.com/YOUR_USERNAME/motionpic-magic.git
   ```

3. **Commit the cleanup changes:**
   ```bash
   # Stage all changes (venv removal + new files)
   git add .

   # Commit with descriptive message
   git commit -m "chore: prepare for GitHub deployment

   - Remove backend/venv from git tracking
   - Add .gitattributes for file handling
   - Add GitHub Actions workflow for Vercel deployment
   - Update .gitignore for compiled libraries

   Backend venv and models excluded - recreate locally with:
   cd backend && python -m venv venv && pip install -r requirements.txt"
   ```

4. **Push to GitHub:**
   ```bash
   # Push to GitHub
   git push -u origin main
   ```

### Troubleshooting GitHub Push Issues

**Error: "file exceeds GitHub's file size limit"**

If you still see this error, some large files might still be in git history:

```bash
# Check current repo size
git count-objects -vH

# If size is > 100MB, check what's tracked
git ls-files | xargs -n1 git ls-files -s | sort -k4 -n -r | head -20
```

If large files appear, they need to be removed from history. This is more complex - ask for help with this specific issue.

**Error: "remote: Permission denied"**

You need to authenticate with GitHub:

```bash
# Use SSH (recommended)
git remote set-url origin git@github.com:YOUR_USERNAME/motionpic-magic.git

# Or configure GitHub CLI
gh auth login
```

**Push is very slow:**

This is normal if you have large files in `test_images/`. Consider:
- Using Git LFS for test images: `git lfs track "test_images/*.jpg"`
- Or remove test images from git: Add `test_images/` to `.gitignore`

### Verifying the Push

After pushing, verify on GitHub:

1. Go to `https://github.com/YOUR_USERNAME/motionpic-magic`
2. Check repository size (should be < 50MB)
3. Verify `backend/venv/` is NOT visible in file browser
4. Check that `.github/workflows/deploy.yml` is present

### Setting Up Automatic Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to Vercel when you push to main.

**Required GitHub Secrets:**

Add these in your GitHub repository settings (Settings → Secrets and variables → Actions):

1. `VERCEL_TOKEN` - Your Vercel API token
2. `VERCEL_ORG_ID` - Your Vercel organization ID
3. `VERCEL_PROJECT_ID` - Your Vercel project ID

**Getting Vercel credentials:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (run in project root)
vercel link

# Get your credentials
cat .vercel/project.json
# Copy "orgId" and "projectId"

# Get your token from: https://vercel.com/account/tokens
```

Add these values as GitHub secrets, then every push to `main` will automatically deploy to Vercel!

**Disable Auto-Deploy (Optional):**

If you prefer manual deployments, delete or rename `.github/workflows/deploy.yml`.

## Quick Deploy Options

### Option 1: Netlify (Recommended)

**Via Git:**
1. Push your code to GitHub/GitLab
2. Go to [app.netlify.com](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your repository
5. Build settings are auto-detected from `netlify.toml`
6. Deploy!

**Via Drag & Drop:**
1. Run `npm run build` locally
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist/` folder to the drop zone
4. Note: Headers from `netlify.toml` won't apply - you'll need to configure manually

### Option 2: Vercel

1. Push your code to GitHub/GitLab
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Settings are auto-detected from `vercel.json`
6. Deploy!

### Option 3: Cloudflare Pages

1. Push your code to GitHub/GitLab
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Create a new project
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Add headers in dashboard:
   - Header name: `Cross-Origin-Opener-Policy`
   - Header value: `same-origin`
   - Header name: `Cross-Origin-Embedder-Policy`
   - Header value: `require-corp`

## Important: Security Headers

For video export to work, your hosting platform **must** set these headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These are required for SharedArrayBuffer (used by ffmpeg.wasm).

- ✅ Netlify - Auto-configured via `netlify.toml`
- ✅ Vercel - Auto-configured via `vercel.json`
- ⚠️ Cloudflare Pages - Configure manually in dashboard
- ⚠️ GitHub Pages - Not supported (no custom headers)

## Build Locally

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview the build
npm run preview
```

The `dist/` folder contains your production-ready static files.

## Environment Variables

Currently none required! Everything runs client-side.

When you add the backend for depth map generation:
- `VITE_API_URL` - Backend API endpoint (e.g., `https://api.example.com`)

## Custom Domain

All platforms support custom domains:

**Netlify:**
1. Go to Site settings → Domain management
2. Add custom domain
3. Update DNS records as instructed

**Vercel:**
1. Go to Project settings → Domains
2. Add domain
3. Update DNS records as instructed

**Cloudflare Pages:**
1. Go to Custom domains
2. Add domain (instant if using Cloudflare DNS)

## Performance Tips

1. **Enable compression** - Gzip/Brotli (usually enabled by default)
2. **CDN caching** - Cache static assets (auto-configured on most platforms)
3. **Image optimization** - Consider WebP format for test images

## Monitoring

Free options:
- **Netlify Analytics** - Built-in for Netlify sites
- **Vercel Analytics** - Built-in for Vercel sites
- **Google Analytics** - Add script to `index.html`

## Troubleshooting

### Video export doesn't work after deployment

**Problem:** FFmpeg.wasm requires security headers
**Solution:** Verify headers are set correctly:
1. Open browser DevTools
2. Go to Network tab
3. Reload the page
4. Check response headers for your HTML file
5. Should see `cross-origin-opener-policy: same-origin` and `cross-origin-embedder-policy: require-corp`

If headers are missing, configure them on your hosting platform.

### Build fails with "out of memory"

**Problem:** Three.js is large and bundling requires memory
**Solution:** Increase Node.js memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Images don't load after deployment

**Problem:** Image paths might be incorrect
**Solution:** Images should be in `static/` folder (not implemented yet) or loaded via URL. For now, use absolute URLs or ensure test images are in the right place.

## Next Steps After Deployment

1. Test the deployment with various images from `test_images/`
2. Share with users for feedback
3. Monitor for errors (check browser console)
4. Plan backend integration for depth map generation

## Backend Deployment

The backend is now integrated for depth map generation. It needs to be deployed separately from the frontend.

### Backend Requirements

- Python 3.9+
- GPU recommended (CPU fallback available)
- 2GB+ RAM
- 5GB+ storage (for ML models)

### Backend Option 1: Railway (Recommended - GPU Support)

1. Go to [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Select your repository
4. Set root directory: `backend`
5. Railway auto-detects Python
6. Add environment variables (if needed)
7. (Optional) Add GPU for faster performance

**Pros**: GPU support, simple deployment, good free tier
**Cons**: GPU costs extra

### Backend Option 2: Heroku (Simple, No GPU)

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login and create app
heroku login
cd backend
heroku create motionpic-backend

# Deploy
git init
git add .
git commit -m "Deploy backend"
heroku git:remote -a motionpic-backend
git push heroku main
```

**Pros**: Simple, reliable
**Cons**: No GPU (slower generation), costs $7/month minimum

### Backend Option 3: AWS EC2 with GPU (Best Performance)

For production with high volume:

1. Launch g4dn.xlarge instance (NVIDIA T4 GPU)
2. Install CUDA toolkit
3. Clone repo and setup:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

4. Configure security groups (port 8000)
5. Use nginx as reverse proxy
6. Setup systemd service for auto-restart

**Pros**: Best performance, scalable
**Cons**: More complex setup, $120-150/month

### Backend Option 4: Render (Simple Alternative)

1. Go to [render.com](https://render.com)
2. "New Web Service"
3. Connect GitHub repo
4. Root directory: `backend`
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Pros**: Simple, free tier available
**Cons**: Free tier is slow, no GPU

### Configure CORS on Backend

Edit `backend/main.py` with your frontend URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local dev
        "https://your-app.netlify.app",  # Production
        "https://your-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Connect Frontend to Backend

Update `src/lib/utils/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

Then set environment variable in your frontend hosting:

**Netlify:**
Site settings → Environment variables → Add:
```
VITE_API_URL=https://your-backend.railway.app
```

**Vercel:**
Project settings → Environment Variables → Add:
```
VITE_API_URL=https://your-backend.railway.app
```

Rebuild frontend after setting environment variable.

### Performance Expectations

**With GPU (Recommended):**
- First request: 5-10s (model loading)
- Subsequent: 1-3s per image
- Concurrent users: 10-50

**CPU Only:**
- First request: 15-30s
- Subsequent: 10-20s per image
- Concurrent users: 1-5

### Cost Comparison

| Platform | GPU | Cost/Month | Best For |
|----------|-----|------------|----------|
| Heroku | No | $7 | Quick demo |
| Railway | Optional | $10-50 | Production |
| Render | No | $0-7 | Testing |
| AWS EC2 | Yes | $120-150 | High volume |

### Testing Production Setup

1. Deploy backend first and note the URL
2. Test backend directly:
   ```bash
   curl https://your-backend.com/
   # Should return: {"message": "MotionPic Magic API"}
   ```
3. Update frontend `VITE_API_URL`
4. Rebuild and deploy frontend
5. Test by uploading an image

### Monitoring Backend

Check logs on your platform:

**Railway:** Dashboard → Logs tab
**Heroku:** `heroku logs --tail -a your-app`
**Render:** Dashboard → Logs

Look for:
- Model loading messages
- Processing time logs
- Error messages
