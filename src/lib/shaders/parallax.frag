uniform sampler2D colorMap;
uniform sampler2D depthMap;
uniform float parallaxStrength;
uniform float focusDistance;
uniform float aperture;
uniform vec2 resolution;
uniform vec3 customCameraPos;
uniform float time;

// Post-processing uniforms
uniform bool filmGrainEnabled;
uniform float filmGrainIntensity;
uniform bool chromaticAberrationEnabled;
uniform float chromaticAberrationIntensity;
uniform bool vignetteEnabled;
uniform float vignetteIntensity;
uniform bool lensDistortionEnabled;
uniform float lensDistortionAmount;

varying vec2 vUv;

// Random function for film grain
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Film grain effect
vec3 applyFilmGrain(vec3 color, vec2 uv) {
  if (!filmGrainEnabled) return color;

  float grain = random(uv * time) * 2.0 - 1.0;
  return color + grain * filmGrainIntensity * 0.1;
}

// Chromatic aberration
vec3 applyChromaticAberration(sampler2D tex, vec2 uv) {
  if (!chromaticAberrationEnabled) {
    return texture2D(tex, uv).rgb;
  }

  vec2 direction = uv - 0.5;
  float dist = length(direction);

  vec2 offset = direction * dist * chromaticAberrationIntensity * 0.01;

  float r = texture2D(tex, uv - offset).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv + offset).b;

  return vec3(r, g, b);
}

// Vignette effect
vec3 applyVignette(vec3 color, vec2 uv) {
  if (!vignetteEnabled) return color;

  vec2 centered = uv - 0.5;
  float dist = length(centered);
  float vignette = smoothstep(0.8, 0.3, dist);
  vignette = mix(1.0, vignette, vignetteIntensity);

  return color * vignette;
}

// Lens distortion
vec2 applyLensDistortion(vec2 uv) {
  if (!lensDistortionEnabled || abs(lensDistortionAmount) < 0.001) return uv;

  vec2 centered = uv - 0.5;
  float dist = length(centered);
  float distortion = 1.0 + lensDistortionAmount * dist * dist;

  return 0.5 + centered * distortion;
}

// Simple parallax with depth-based offset
vec3 parallaxColor(vec2 uv) {
  // Apply lens distortion first
  vec2 distortedUv = applyLensDistortion(uv);

  // Clamp to avoid sampling outside texture
  if (distortedUv.x < 0.0 || distortedUv.x > 1.0 || distortedUv.y < 0.0 || distortedUv.y > 1.0) {
    return vec3(0.0);
  }

  // Sample depth
  float depth = texture2D(depthMap, distortedUv).r;

  // Calculate parallax offset based on depth and camera position
  vec2 parallaxOffset = vec2(customCameraPos.x, customCameraPos.y) * depth * parallaxStrength * 0.1;
  vec2 parallaxUv = distortedUv + parallaxOffset;

  // Apply chromatic aberration
  vec3 color = applyChromaticAberration(colorMap, parallaxUv);

  // Simple depth of field simulation
  float depthDiff = abs(depth - focusDistance);
  float blur = depthDiff * aperture;

  // If high blur, sample neighbors (simple box blur)
  if (blur > 0.1) {
    vec3 blurred = color;
    float samples = 0.0;
    float blurSize = blur * 0.01;

    for (float x = -1.0; x <= 1.0; x += 1.0) {
      for (float y = -1.0; y <= 1.0; y += 1.0) {
        vec2 offset = vec2(x, y) * blurSize;
        blurred += texture2D(colorMap, parallaxUv + offset).rgb;
        samples += 1.0;
      }
    }

    color = mix(color, blurred / samples, clamp(blur * 2.0, 0.0, 1.0));
  }

  return color;
}

void main() {
  vec3 color = parallaxColor(vUv);

  // Apply post-processing effects
  color = applyFilmGrain(color, vUv);
  color = applyVignette(color, vUv);

  gl_FragColor = vec4(color, 1.0);
}
