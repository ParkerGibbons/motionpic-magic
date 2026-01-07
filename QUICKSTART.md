# Quick Start Guide

## Try It Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## First Steps

1. **Upload an image** - Drag and drop any image, or try the test images in `test_images/`
   - Recommended: `test_images/columbus-a.png` or `test_images/after-yang.png`

2. **Choose a camera preset** - In the sidebar, select from:
   - Gentle Push (recommended for first try)
   - Ken Burns
   - Reveal
   - Drama
   - Drift

3. **Hit Play** - Watch your image come to life with parallax animation

4. **Tweak the effects**:
   - Parallax strength - How much 3D depth
   - Focus distance - Where the image is sharp
   - Aperture - How blurry the out-of-focus areas are
   - Film grain, vignette, etc. - Post-processing effects

5. **Export** - Click Export button, choose settings, and download your video

## Note About Depth Maps

Currently, the app uses your uploaded image as both the color AND depth map (placeholder behavior). This means the parallax effect will be subtle and not perfectly accurate.

For real depth-based parallax, you'll need to integrate the backend depth generation (see `docs/project_spec.md` Phase 2).

## Quick Deploy

**Easiest:**
```bash
npm run build
# Then drag dist/ folder to netlify.com/drop
```

**Better (with headers for video export):**
1. Push to GitHub
2. Connect to Netlify or Vercel
3. Auto-deploys with correct config

See `DEPLOYMENT.md` for details.

## Testing Tips

- Try images with clear foreground/background separation
- Portrait photos work well
- Architectural shots with depth layers are ideal
- Avoid flat graphics or patterns

## Need Help?

- Check `README.md` for full documentation
- See `CLAUDE.md` for development guidance
- Read `docs/project_spec.md` for technical details

## Known Limitations (v0.0.1)

- No real depth map generation (placeholder only)
- Export can be slow for 4K (inherent to client-side encoding)
- Simple parallax shader (can be improved)
- No timeline editor yet

These are planned for future versions!
