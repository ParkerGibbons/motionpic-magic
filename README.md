# MotionPic Magic

Transform static images into cinematic 2.5D parallax animations with depth-of-field effects and film-look post-processing.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Parallax Animation** - Create depth-based 2.5D motion effects
- **5 Camera Presets** - Gentle Push, Ken Burns, Reveal, Drama, and Drift
- **Depth of Field** - Cinematic focus effects with adjustable aperture
- **Post-Processing** - Film grain, chromatic aberration, vignette, lens distortion
- **Video Export** - Client-side MP4 rendering with ffmpeg.wasm
- **Drag & Drop** - Easy image upload interface

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

1. Drag and drop an image or click to upload
2. Choose a camera preset and adjust settings
3. Click Play to preview the animation
4. Export your creation as a video

## Tech Stack

- **Svelte 5** - Reactive UI framework
- **Three.js** - 3D rendering and WebGL
- **GLSL Shaders** - Custom parallax and post-processing effects
- **FFmpeg.wasm** - Client-side video encoding
- **TypeScript** - Type safety

## Project Structure

```
motionpic-magic/
├── src/
│   ├── App.svelte              # Main app component
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Viewport.svelte    # 3D canvas + image upload
│   │   │   ├── Sidebar.svelte     # Control panel
│   │   │   └── ExportModal.svelte # Video export UI
│   │   ├── stores/
│   │   │   └── settings.ts        # Global state management
│   │   ├── three/
│   │   │   └── scene.ts           # Three.js setup
│   │   └── shaders/
│   │       ├── parallax.vert
│   │       └── parallax.frag      # All visual effects
│   └── app.css                    # Global styles
├── test_images/                   # Sample images for testing
└── docs/
    └── project_spec.md            # Full technical specification
```

## Camera Presets

- **Gentle Push** - Slow dolly in with subtle orbit
- **Ken Burns** - Classic slow pan across image
- **Reveal** - Start tight, pull back to reveal scene
- **Drama** - Push in with focus rack from background to foreground
- **Drift** - Subtle random wandering movement

## Export Options

- **Resolution**: 1080p (1920x1080) or 4K (3840x2160)
- **Duration**: 1-60 seconds
- **Frame Rate**: 24fps (cinematic), 30fps, or 60fps (smooth)
- **Format**: MP4 with H.264 encoding

## Development

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Type Checking

```bash
npm run check
```

### Preview Production Build

```bash
npm run preview
```

## Deployment

This is a static Vite application that can be deployed to any static hosting service.

### Netlify

1. Connect your Git repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. **Important**: Add headers in `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### Vercel

1. Import your Git repository
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. **Important**: Add headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        }
      ]
    }
  ]
}
```

### GitHub Pages

```bash
npm run build
# Deploy dist/ folder to gh-pages branch
```

Note: GitHub Pages may not support required headers for ffmpeg.wasm. Consider Netlify or Vercel for full functionality.

### Why Headers are Required

FFmpeg.wasm uses SharedArrayBuffer which requires these security headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Without these headers, video export will not work.

## Known Limitations

### Current Version (v0.0.1)

- **No depth map generation** - Currently uses the uploaded image as both color and depth map (placeholder). Real depth estimation requires backend integration.
- **Simple parallax** - Uses basic UV offset. Advanced raymarched parallax occlusion mapping planned for future.
- **Basic DOF blur** - Simple box filter. More sophisticated depth of field algorithms possible.
- **Export performance** - 4K exports can be slow due to client-side encoding. Consider shorter durations or lower resolution for testing.

### Planned Features

- Backend API for depth map generation using Apple Depth Pro
- Timeline/keyframe editor for custom camera animations
- Advanced parallax occlusion mapping shader
- Improved depth of field with bokeh effects
- Click-to-focus in viewport
- Export progress persistence

See `/docs/project_spec.md` for full development roadmap.

## Browser Support

- Chrome/Edge 90+ (recommended)
- Firefox 88+
- Safari 15.2+

Requires WebGL 2.0 and SharedArrayBuffer support.

## Testing with Sample Images

The `test_images/` directory contains curated images perfect for testing:
- `after-yang.png`, `ex-machina.png` - Cinematic film stills
- `columbus-a.png`, `columbus-b.png` - Architectural photography
- `sf-day.png`, `sf-night.png` - Urban landscapes
- Various portraits and concept art

These images work well because they have clear depth layers and interesting subjects.

## Contributing

This is a prototype. Contributions welcome for:
- Backend integration (FastAPI + Depth Pro)
- Improved shader effects
- Performance optimizations
- UI/UX enhancements

## License

MIT

## Credits

- Built with [Svelte](https://svelte.dev/)
- 3D rendering by [Three.js](https://threejs.org/)
- Video encoding by [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- Inspired by cinematic parallax effects in film and photography

---

**Note**: This is an early prototype focused on client-side functionality. For production use, integrate with a depth estimation backend (see project spec for details).
