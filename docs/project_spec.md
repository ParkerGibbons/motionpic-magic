# MotionPic-Magic Project Specification

## Overview

Build a web application called **MotionPic Magic** that transforms static images into cinematic 2.5D parallax animations. The app uses AI-generated depth maps to create a raymarched parallax effect with depth-of-field, then applies film-look post-processing and exports high-quality video.

**Project Directory:** `/Users/parkergibbons/Documents/pg-projects/motionpic-magic`

**Style/UI Reference:** `/Users/parkergibbons/Documents/pg-projects/pg-css-svelte5`
- Use this project's CSS patterns, component structure, and UI conventions as a starting point
- Copy over relevant styles and adapt them for this project

## Tech Stack

- **Frontend:** Svelte 5 + SvelteKit
- **3D Rendering:** Three.js with custom GLSL shaders
- **Backend:** Python FastAPI (for depth map generation)
- **Depth Model:** Apple's Depth Pro (https://github.com/apple/ml-depth-pro)
- **Video Export:** FFmpeg (server-side) or CCapture.js (client-side fallback)
    (note: would prefer to experiment client-side as far as we can. can experiment with ffmpeg.wasm and use the preloaded motionpic-magic/test_images/) 

---

## Core Features

### 1. Image Upload & Processing
- Drag-and-drop or click-to-upload image input
- Send image to backend `/api/depth` endpoint
- Receive depth map PNG back
- Display both original image and depth map in UI

### 2. Parallax Renderer (Three.js + Custom Shader)

This is the core visual magic. Use a **raymarched parallax occlusion mapping** approach, NOT a displacement mesh.

**ParallaxMaterial (Custom ShaderMaterial):**

```glsl
// Key uniforms needed:
uniform sampler2D colorMap;      // Original image
uniform sampler2D depthMap;      // Depth Pro output
uniform float parallaxStrength;  // How extreme the 3D effect is (0.0 - 1.0)
uniform float focusDistance;     // Where the focal plane is (0.0 - 1.0 in depth)
uniform float aperture;          // DOF strength (0.0 = everything sharp)
uniform vec2 resolution;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
```

**Fragment shader approach:**
1. Calculate view direction from camera to fragment
2. Ray-march through the depth map to find the correct UV offset
3. Sample the color texture at the displaced UV
4. Calculate circle-of-confusion based on depth vs focus distance
5. Apply depth-based blur (can be a separate post-process pass for performance)

**Edge handling:**
- Feather edges where depth discontinuities occur
- Avoid hard silhouette artifacts at object boundaries
- Consider soft falloff at image edges to hide parallax limits

### 3. Camera System

**Camera Rig:**
- Perspective camera looking at a fullscreen quad
- Support these movement types:
  - **Dolly:** Push in/pull out (z-axis)
  - **Truck:** Left/right (x-axis)  
  - **Pedestal:** Up/down (y-axis)
  - **Orbit:** Subtle rotation around center point
  - **Focus Pull:** Animate the focal plane depth

**Preset Animations:**
- "Gentle Push" — slow dolly in with slight orbit
- "Ken Burns" — classic slow pan across image
- "Reveal" — start tight, pull back to reveal scene
- "Drama" — push in with focus rack from background to foreground
- "Drift" — subtle random wandering movement

**Custom Keyframes (Phase 2):**
- Timeline UI at bottom of viewport
- Keyframes for: camera position, rotation, focus distance
- Easing curve selection (linear, ease-in-out, cubic bezier)
- Scrubbing and preview playback

### 4. Depth of Field

**Controls:**
- Focus distance slider (0.0 = near, 1.0 = far)
- Aperture slider (0.0 = deep focus, 1.0 = very shallow)
- Optional: click-to-focus on viewport (sample depth at click point)

**Implementation:**
- Calculate circle of confusion per-pixel based on depth
- Apply variable blur based on CoC
- Bokeh quality options: Gaussian (fast) vs Hexagonal (pretty)

### 5. Post-Processing Stack

Use Three.js EffectComposer with custom passes:

| Effect | Controls |
|--------|----------|
| **Film Grain** | Intensity, size, animated |
| **Chromatic Aberration** | Intensity (RGB split toward edges) |
| **Vignette** | Intensity, softness, roundness |
| **Lens Distortion** | Barrel/pincushion amount |
| **Color Grading** | Contrast, saturation, temperature (optional: LUT support) |

Each effect should be toggleable with a checkbox and have appropriate sliders.

### 6. Export

**Settings:**
- Resolution: 1080p, 4K, Custom
- Duration: 3s, 5s, 10s, Custom
- Frame rate: 24, 30, 60 fps
- Format: MP4 (H.264), WebM, ProRes (if server-side)

**Process:**
- Show progress bar during export
- Either client-side frame capture (CCapture.js) or server-side rendering
- Download resulting video file

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MOTION PIC MAGIC                                    [Export] [Settings]│
├────────────────────────────────────────────────┬────────────────────────┤
│                                                │                        │
│                                                │  CAMERA                │
│                                                │  ├─ Preset: [Dropdown] │
│                                                │  ├─ Speed: [Slider]    │
│              VIEWPORT                          │                        │
│         (Three.js Canvas)                      │  DEPTH OF FIELD        │
│                                                │  ├─ Focus: [Slider]    │
│                                                │  ├─ Aperture: [Slider] │
│                                                │                        │
│                                                │  POST PROCESSING       │
│                                                │  ├─ [x] Film Grain     │
│                                                │  │   └─ Intensity      │
│                                                │  ├─ [x] Chromatic Ab.  │
│                                                │  ├─ [ ] Vignette       │
│                                                │  └─ [ ] Lens Distort.  │
├────────────────────────────────────────────────┴────────────────────────┤
│  [Timeline / Keyframe Editor - Phase 2]                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

**Empty State:**
- When no image is loaded, show a large drop zone with instructions
- "Drop an image to begin" with subtle animation

**Loading State:**
- While depth map is generating, show spinner over viewport
- "Generating depth map..." message

---

## Backend API

### POST /api/depth

**Request:**
- Multipart form data with image file
- Accepts: JPEG, PNG, WebP

**Response:**
```json
{
  "depth_map_url": "/outputs/depth_abc123.png",
  "focal_length_px": 1234.5,
  "processing_time_ms": 892
}
```

**Implementation:**
- Load Depth Pro model on startup (cache in memory)
- Run inference on uploaded image
- Save depth map to accessible location
- Return URL to depth map

### POST /api/export (Phase 2)

For server-side video rendering if needed.

---

## Development Phases

### Phase 1: Foundation + Basic Parallax
**Goal:** Get something visual working end-to-end

1. Set up SvelteKit project structure using pg-css-svelte5 as reference
2. Create basic layout with viewport and sidebar
3. Implement image upload (drag-drop + file picker)
4. Create Three.js scene with fullscreen quad
5. Write basic parallax shader (simple UV offset based on depth, not full raymarching yet)
6. Use a hardcoded test image + depth map for iteration
7. Add basic camera orbit controls for testing

**Deliverable:** Can load an image + depth map and see basic parallax effect when moving camera

### Phase 2: Depth Generation Backend
**Goal:** Generate real depth maps from any image

1. Set up FastAPI backend
2. Install and configure Depth Pro
3. Create /api/depth endpoint
4. Connect frontend upload to backend
5. Display generated depth map in UI

**Deliverable:** Upload any image → get depth map → see parallax

### Phase 3: Advanced Parallax Shader
**Goal:** Production-quality parallax rendering

1. Implement proper parallax occlusion mapping with ray marching
2. Add soft edge feathering
3. Handle depth discontinuities gracefully
4. Add parallax strength control
5. Optimize step count for performance

**Deliverable:** Smooth, artifact-free parallax with proper occlusion

### Phase 4: Depth of Field
**Goal:** Cinematic focus effects

1. Add focus distance and aperture uniforms
2. Implement circle-of-confusion calculation
3. Create DOF blur pass
4. Add UI controls for focus and aperture
5. Optional: click-to-focus in viewport

**Deliverable:** Adjustable DOF that looks cinematic

### Phase 5: Camera Presets
**Goal:** One-click cinematic movements

1. Create animation system with easing functions
2. Implement preset camera movements
3. Add preset selector dropdown
4. Add duration/speed controls
5. Preview playback with play/pause

**Deliverable:** Select a preset, hit play, see smooth cinematic animation

### Phase 6: Post-Processing
**Goal:** Film-look finishing

1. Set up EffectComposer pipeline
2. Implement film grain pass
3. Implement chromatic aberration pass
4. Implement vignette pass
5. Implement lens distortion pass
6. Add UI toggles and sliders for each

**Deliverable:** Full post-processing stack with controls

### Phase 7: Export
**Goal:** Get video files out

1. Implement frame capture system
2. Add export settings UI
3. Progress indication during export
4. Download completed video

**Deliverable:** Export working animations as video files

---

## File Structure

```
motionpic-magic/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main app page
│   │   └── +layout.svelte        # App shell
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Viewport.svelte   # Three.js canvas wrapper
│   │   │   ├── Sidebar.svelte    # Controls panel
│   │   │   ├── DropZone.svelte   # Image upload
│   │   │   ├── Timeline.svelte   # Keyframe editor (Phase 2)
│   │   │   └── ExportModal.svelte
│   │   ├── three/
│   │   │   ├── scene.ts          # Three.js scene setup
│   │   │   ├── ParallaxMaterial.ts
│   │   │   ├── shaders/
│   │   │   │   ├── parallax.vert
│   │   │   │   └── parallax.frag
│   │   │   ├── postfx/
│   │   │   │   ├── FilmGrainPass.ts
│   │   │   │   ├── ChromaticAberrationPass.ts
│   │   │   │   └── ...
│   │   │   └── camera.ts         # Camera rig and animations
│   │   ├── stores/
│   │   │   ├── scene.ts          # Three.js scene state
│   │   │   ├── settings.ts       # All UI settings
│   │   │   └── animation.ts      # Playback state
│   │   └── utils/
│   │       └── api.ts            # Backend communication
│   └── app.css                   # Global styles (from pg-css-svelte5)
├── backend/
│   ├── main.py                   # FastAPI app
│   ├── depth.py                  # Depth Pro wrapper
│   └── requirements.txt
├── static/
│   └── test/                     # Test images for development
├── package.json
└── svelte.config.js
```

---

## Key Technical Notes

### Three.js in Svelte
- Create the Three.js renderer in `onMount`
- Clean up in `onDestroy`
- Use Svelte stores to bridge UI state → Three.js uniforms
- Consider using `threlte` if you want Svelte-native Three.js, but raw Three.js is fine too

### Shader Development
- Keep shaders in separate .vert/.frag files for syntax highlighting
- Import as raw strings with `?raw` suffix in Vite
- Start simple, add complexity incrementally
- Console.log uniform values to debug visual issues

### Performance Considerations
- Depth map generation is slow (~1-3 seconds) — show loading state
- Parallax ray marching: start with 16 steps, can increase to 32-64 for quality
- DOF blur is expensive — consider half-resolution blur pass
- Film grain should be animated but not regenerated every frame

### Depth Pro Specifics
- Requires Python 3.9+
- Needs ~4GB VRAM for inference
- Output is metric depth (actual distances), normalize to 0-1 for shader
- Also outputs focal length estimate (useful for realistic DOF)

---

## Reference Links

- Depth Pro: https://github.com/apple/ml-depth-pro
- Three.js ShaderMaterial: https://threejs.org/docs/#api/en/materials/ShaderMaterial
- Parallax Occlusion Mapping: https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
- Three.js EffectComposer: https://threejs.org/docs/#examples/en/postprocessing/EffectComposer

---

## Getting Started

1. First, examine the pg-css-svelte5 template project to understand the styling patterns and component conventions
2. Set up the basic SvelteKit project in the motionpic-magic directory
3. Copy over relevant CSS and adapt the layout
4. Get a simple Three.js scene rendering in the viewport
5. Work through Phase 1 deliverables before moving on

Start with Phase 1. Don't try to build everything at once. Get basic parallax working with test images before touching the backend or advanced features.