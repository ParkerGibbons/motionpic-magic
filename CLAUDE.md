# MotionPic Magic - Claude Instructions

## Project Overview

MotionPic Magic transforms static images into cinematic 2.5D parallax animations with depth-of-field effects and film-look post-processing. Built with Svelte 5, Three.js, and WebGL shaders.

**Full specification:** `/docs/project_spec.md`

## Architecture

- **Framework:** Vite + Svelte 5 (NOT SvelteKit - simpler for static deployment)
- **3D Rendering:** Three.js with custom GLSL shaders
- **Backend:** FastAPI with PyTorch for AI depth map generation
- **Styling:** Vanilla CSS with Flexoki color scheme and Recursive font
- **Video Export:** Client-side using @ffmpeg/ffmpeg (ffmpeg.wasm)

## Key Implementation Patterns

### Component Structure
```
src/
├── App.svelte                    # Main app shell with header
├── lib/
│   ├── components/
│   │   ├── Viewport.svelte       # Three.js canvas + image upload + depth API
│   │   ├── CropOverlay.svelte    # Export frame preview overlay
│   │   ├── Sidebar.svelte        # All controls (camera, DOF, post-fx)
│   │   └── ExportModal.svelte    # Video export with ffmpeg.wasm
│   ├── stores/
│   │   ├── settings.ts           # Global app state (Svelte store)
│   │   └── theme.ts              # Theme management (dark/light)
│   ├── three/
│   │   └── scene.ts              # Three.js setup and camera presets
│   ├── shaders/
│   │   ├── parallax.vert
│   │   └── parallax.frag         # All effects in single shader
│   └── utils/
│       └── api.ts                # Backend API client for depth generation

backend/
├── main.py                       # FastAPI server with CORS
├── depth.py                      # Depth Pro + MiDaS depth generation
└── requirements.txt              # Python dependencies
```

### State Management
- Single Svelte store (`settings.ts`) for all UI state
- Settings updates automatically propagate to Three.js uniforms
- No complex state management needed - keep it simple

### Shader Architecture
All visual effects are in `parallax.frag`:
- Parallax offset based on depth map
- Depth of field (simple box blur for now - can be enhanced)
- Film grain, chromatic aberration, vignette, lens distortion
- All toggleable via uniforms from UI controls

**IMPORTANT:** Three.js provides `cameraPosition` as a built-in uniform. Use `customCameraPos` or similar to avoid naming conflicts.

### Camera Presets
Defined in `scene.ts` as simple update functions that return position/rotation based on time:
- `gentle-push`: Slow dolly with subtle orbit
- `ken-burns`: Classic pan across image
- `reveal`: Pull back to reveal scene
- `drama`: Push in with focus rack
- `drift`: Subtle random wandering

Easy to add more - just add to `cameraPresets` object.

### Video Export
Uses @ffmpeg/ffmpeg for client-side rendering:
1. Captures frames from canvas during playback
2. Writes frames to virtual filesystem
3. Encodes to MP4 with H.264
4. Downloads to user

Currently working but could be optimized for longer/higher-res exports.

## Development Workflow

### Frontend
```bash
npm install
npm run dev      # Start dev server at localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py            # Start at localhost:8000
```

See `backend/README.md` for Depth Pro vs MiDaS setup details.

## Code Style Preferences

1. **Keep it simple** - No over-engineering. Direct solutions over abstractions.
2. **Minimal dependencies** - Use what's needed, nothing more
3. **Inline styles in components** - Svelte scoped CSS, no CSS modules or styled-components
4. **TypeScript for clarity** - Types where helpful, but don't go overboard
5. **No comments for self-evident code** - Code should be readable
6. **Functional over OOP** - Functions and stores, not classes

## UI/UX Design Patterns

### Theme System
- Dark theme by default (media/creative tool aesthetic)
- Light theme available via toggle
- Colors: Orange accents in dark, blue accents in light
- Theme persisted to localStorage
- Flexoki color scheme for accessible, warm palette

### User Feedback
- Progressive loading: Show image immediately, generate depth in background
- Loading states: Full-screen spinner overlay with backdrop blur
- Error handling: Dismissible toast notifications with clear messages
- Export preview: Crop overlay showing export frame with dimmed outside areas

### CSS Techniques
- Box-shadow trick for overlays: `0 0 0 9999px rgba(0,0,0,0.4)` creates full-screen dim effect
- backdrop-filter for modern glass effects
- CSS custom properties for theming
- Collapsible sections for control organization

## Current Status

### Implemented ✓
- ✓ Full Three.js parallax rendering with custom shaders
- ✓ Camera presets with smooth animations
- ✓ OrbitControls for manual camera interaction
- ✓ Depth of field and post-processing effects
- ✓ Client-side video export with ffmpeg.wasm
- ✓ FastAPI backend with Depth Pro + MiDaS depth generation
- ✓ API integration with progressive loading
- ✓ Loading states and error handling
- ✓ Export frame preview overlay
- ✓ Dark/light theme system
- ✓ Complete deployment documentation

### Not Yet Implemented
- **Advanced raymarched parallax** - Current shader uses simple UV offset
  - Can be enhanced with proper parallax occlusion mapping
  - See spec Phase 3
- **Timeline/keyframe editor** - All camera movement is preset-based
  - Would need timeline UI component
  - See spec for timeline feature

### Known Issues
- Export can be slow for 4K/long duration (inherent to client-side encoding)
- Depth blur is simple box filter (could use better DOF algorithm)
- Large Three.js bundle size (could split chunks)
- First depth generation slow on CPU-only backend (normal - model loading)

## Deployment

See `DEPLOYMENT.md` for complete deployment guide.

### Quick Summary

**Frontend:** Static Vite app - deploy to Netlify, Vercel, or Cloudflare Pages
- Requires COOP/COEP headers for ffmpeg.wasm
- Pre-configured in `netlify.toml` and `vercel.json`

**Backend:** FastAPI with PyTorch - needs separate deployment
- Railway (recommended) - GPU support, simple setup
- Heroku - CPU only, $7/month, simpler but slower
- AWS EC2 - Best performance, more complex, $120-150/month

**Cost estimates:**
- Demo/feedback: $0-7/month (frontend free, backend CPU)
- Production: $30-150/month (backend with GPU)

## Common Tasks

### Adding a new camera preset
Edit `src/lib/three/scene.ts`:
```typescript
const cameraPresets: Record<string, CameraPreset> = {
  'my-preset': {
    update(time, speed) {
      return {
        position: new THREE.Vector3(...),
        rotation: new THREE.Euler(...)
      }
    }
  }
}
```
Then add to dropdown in `Sidebar.svelte`.

### Adding a new post-processing effect
1. Add uniforms to `scene.ts` material
2. Add effect function in `parallax.frag`
3. Add controls to `Sidebar.svelte`
4. Add settings to `settings.ts` store

### Testing with different images
Use the test images in `/test_images/` - they're pre-selected for cinematic qualities.

## Backend API Integration Pattern

The depth generation follows a progressive loading pattern:

1. User uploads image → show immediately with placeholder depth
2. POST image to `/api/depth` in background
3. Display loading overlay with spinner
4. When depth map returns, reload textures with real depth
5. Handle errors with dismissible toast

**Key code locations:**
- API client: `src/lib/utils/api.ts`
- Integration: `src/lib/components/Viewport.svelte` in `loadImage()`
- Backend: `backend/main.py` endpoint at `/api/depth`

## Notes for Future Development

1. **Performance optimization**:
   - Consider Three.js EffectComposer for post-processing (separate passes)
   - Implement proper raymarching in shader (see spec references)
   - Add LOD for depth map resolution

2. **UX improvements**:
   - Click-to-focus in viewport (sample depth at click point)
   - Preset preview thumbnails
   - Export queue for batch processing
   - Backend health check indicator in UI

3. **Advanced features** (see spec):
   - Timeline/keyframe editor
   - Custom camera paths
   - Advanced parallax occlusion mapping
   - Better DOF algorithms (bokeh)

## Getting Help

- Three.js docs: https://threejs.org/docs/
- Svelte 5 docs: https://svelte.dev/docs/svelte/overview
- FFmpeg.wasm: https://ffmpegwasm.netlify.app/
- GLSL reference: https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language

Project spec has full technical details and reference links.
