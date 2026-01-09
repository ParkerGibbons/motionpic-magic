uniform sampler2D colorMap;
uniform sampler2D depthMap;
uniform float parallaxStrength;
uniform float depthScale;
uniform float focusDistance;
uniform float aperture;
uniform vec2 resolution;
uniform vec3 customCameraPos;
uniform float time;

// DOF uniforms
uniform int bokehQuality; // 0=fast, 1=medium, 2=high
uniform bool tiltShiftEnabled;
uniform float tiltShiftAngle;
uniform float tiltShiftPosition;
uniform float tiltShiftBlur;

// Atmosphere uniforms
uniform bool fogEnabled;
uniform float fogDensity;
uniform float fogNear;
uniform float fogFar;
uniform vec3 fogColor;
uniform bool depthTintEnabled;
uniform vec3 depthTintNearColor;
uniform vec3 depthTintFarColor;
uniform float depthTintIntensity;

// Color grading uniforms
uniform int colorPreset; // 0=none, 1=portra, 2=cinematic, 3=noir, 4=vintage, 5=cool-blue
uniform float temperature;
uniform float tint;
uniform float contrast;
uniform float saturation;
uniform float exposure;
uniform bool splitToneEnabled;
uniform float splitToneShadowHue;
uniform float splitToneHighlightHue;
uniform float splitToneBalance;

// Lens FX uniforms
uniform bool anamorphicEnabled;
uniform float anamorphicStretch;
uniform bool lensFlareEnabled;
uniform float lensFlareIntensity;

// Post-processing uniforms
uniform bool filmGrainEnabled;
uniform float filmGrainIntensity;
uniform bool chromaticAberrationEnabled;
uniform float chromaticAberrationIntensity;
uniform bool vignetteEnabled;
uniform float vignetteIntensity;
uniform bool lensDistortionEnabled;
uniform float lensDistortionAmount;
uniform bool bloomEnabled;
uniform float bloomThreshold;
uniform float bloomIntensity;
uniform bool halationEnabled;
uniform float halationIntensity;
uniform bool sharpenEnabled;
uniform float sharpenIntensity;

// Render mode uniform
uniform int renderMode; // 0=normal, 1=depth, 2=depth-color, 3=normals, 4=split

// Parallax mode uniform
uniform int parallaxMode; // 0=offset, 1=raymarch

varying vec2 vUv;

// ============================================
// UTILITY FUNCTIONS
// ============================================

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Simplex-style noise for camera shake
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// RGB to HSL conversion
vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float l = (maxC + minC) / 2.0;
  
  if (maxC == minC) {
    return vec3(0.0, 0.0, l);
  }
  
  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
  
  float h;
  if (maxC == c.r) {
    h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h /= 6.0;
  
  return vec3(h, s, l);
}

// Helper for HSL to RGB
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

// HSL to RGB conversion
vec3 hsl2rgb(vec3 hsl) {
  if (hsl.y == 0.0) {
    return vec3(hsl.z);
  }
  
  float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
  float p = 2.0 * hsl.z - q;
  
  return vec3(
    hue2rgb(p, q, hsl.x + 1.0/3.0),
    hue2rgb(p, q, hsl.x),
    hue2rgb(p, q, hsl.x - 1.0/3.0)
  );
}

// Luminance calculation
float getLuma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// ============================================
// COLOR GRADING
// ============================================

vec3 applyTemperature(vec3 color, float temp) {
  // Warm: boost red/yellow, Cool: boost blue
  color.r += temp * 0.1;
  color.b -= temp * 0.1;
  color.g += temp * 0.02;
  return clamp(color, 0.0, 1.0);
}

vec3 applyTint(vec3 color, float t) {
  // Green-magenta shift
  color.g += t * 0.1;
  color.r -= t * 0.05;
  color.b -= t * 0.05;
  return clamp(color, 0.0, 1.0);
}

vec3 applyContrast(vec3 color, float c) {
  return clamp((color - 0.5) * c + 0.5, 0.0, 1.0);
}

vec3 applySaturation(vec3 color, float s) {
  float lum = getLuma(color);
  return clamp(mix(vec3(lum), color, s), 0.0, 1.0);
}

vec3 applyExposure(vec3 color, float e) {
  return clamp(color * pow(2.0, e), 0.0, 1.0);
}

vec3 applySplitTone(vec3 color, float shadowHue, float highlightHue, float balance) {
  float lum = getLuma(color);
  
  // Convert hue (0-360) to normalized (0-1)
  float sHue = shadowHue / 360.0;
  float hHue = highlightHue / 360.0;
  
  // Create tint colors
  vec3 shadowTint = hsl2rgb(vec3(sHue, 0.5, 0.5));
  vec3 highlightTint = hsl2rgb(vec3(hHue, 0.5, 0.5));
  
  // Blend based on luminance
  float shadowAmount = smoothstep(balance, 0.0, lum) * 0.3;
  float highlightAmount = smoothstep(1.0 - balance, 1.0, lum) * 0.3;
  
  color = mix(color, color * shadowTint * 2.0, shadowAmount);
  color = mix(color, color * highlightTint * 2.0, highlightAmount);
  
  return clamp(color, 0.0, 1.0);
}

vec3 applyColorPreset(vec3 color, int preset) {
  if (preset == 0) return color; // none
  
  if (preset == 1) { // portra - warm, lifted blacks, soft contrast
    color = applyTemperature(color, 0.15);
    color = applyContrast(color, 0.9);
    color = applySaturation(color, 0.85);
    color = mix(color, color + vec3(0.02, 0.01, 0.0), 0.5); // lift shadows
    color.r *= 1.05;
  }
  else if (preset == 2) { // cinematic - teal shadows, orange highlights
    float lum = getLuma(color);
    vec3 teal = vec3(0.0, 0.15, 0.2);
    vec3 orange = vec3(0.2, 0.1, 0.0);
    color = mix(color + teal * (1.0 - lum), color + orange * lum, lum);
    color = applyContrast(color, 1.15);
    color = applySaturation(color, 0.9);
  }
  else if (preset == 3) { // noir - B&W with slight blue tint
    float lum = getLuma(color);
    color = vec3(lum);
    color = applyContrast(color, 1.3);
    color = mix(color, color + vec3(-0.02, 0.0, 0.05), 0.5);
  }
  else if (preset == 4) { // vintage - faded, warm, low saturation
    color = applyTemperature(color, 0.2);
    color = applySaturation(color, 0.7);
    color = applyContrast(color, 0.85);
    color = mix(color, color + vec3(0.05, 0.03, -0.02), 0.5); // fade
    color.b *= 0.9;
  }
  else if (preset == 5) { // cool-blue - cold, high contrast
    color = applyTemperature(color, -0.25);
    color = applyContrast(color, 1.1);
    color = applySaturation(color, 0.95);
    color.b *= 1.1;
  }
  
  return clamp(color, 0.0, 1.0);
}

vec3 applyColorGrading(vec3 color) {
  // Apply manual adjustments first
  color = applyExposure(color, exposure);
  color = applyTemperature(color, temperature);
  color = applyTint(color, tint);
  color = applyContrast(color, contrast);
  color = applySaturation(color, saturation);
  
  // Apply split toning
  if (splitToneEnabled) {
    color = applySplitTone(color, splitToneShadowHue, splitToneHighlightHue, splitToneBalance);
  }
  
  // Apply preset on top
  color = applyColorPreset(color, colorPreset);
  
  return color;
}

// ============================================
// ATMOSPHERE EFFECTS
// ============================================

vec3 applyFog(vec3 color, float depth) {
  if (!fogEnabled) return color;
  
  float fogFactor = smoothstep(fogNear, fogFar, depth) * fogDensity;
  return mix(color, fogColor, fogFactor);
}

vec3 applyDepthTint(vec3 color, float depth) {
  if (!depthTintEnabled) return color;
  
  vec3 tint = mix(depthTintNearColor, depthTintFarColor, depth);
  return mix(color, color * tint, depthTintIntensity);
}

// ============================================
// LENS EFFECTS
// ============================================

vec2 applyLensDistortion(vec2 uv) {
  if (!lensDistortionEnabled || abs(lensDistortionAmount) < 0.001) return uv;

  vec2 centered = uv - 0.5;
  float dist = length(centered);
  float distortion = 1.0 + lensDistortionAmount * dist * dist;

  return 0.5 + centered * distortion;
}

vec2 applyAnamorphicDistortion(vec2 uv) {
  if (!anamorphicEnabled) return uv;
  
  vec2 centered = uv - 0.5;
  centered.x *= anamorphicStretch;
  return centered + 0.5;
}

vec3 applyChromaticAberration(sampler2D tex, vec2 uv) {
  if (!chromaticAberrationEnabled) {
    return texture2D(tex, uv).rgb;
  }

  // Radial chromatic aberration - stronger at edges
  vec2 direction = uv - 0.5;
  float dist = length(direction);

  // Quadratic falloff for more cinematic look
  float strength = dist * dist * chromaticAberrationIntensity * 0.003;
  vec2 offset = normalize(direction) * strength;

  // Sample with slight offset
  float r = texture2D(tex, uv - offset * 1.5).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv + offset * 1.5).b;

  return vec3(r, g, b);
}

// Anamorphic horizontal lens flare
vec3 applyLensFlare(vec3 color, vec2 uv, float depth) {
  if (!lensFlareEnabled || !anamorphicEnabled) return color;
  
  float brightness = getLuma(color);
  if (brightness < 0.7) return color;
  
  // Horizontal streak
  float streak = 0.0;
  for (float i = -8.0; i <= 8.0; i += 1.0) {
    vec2 sampleUv = uv + vec2(i * 0.01, 0.0);
    if (sampleUv.x >= 0.0 && sampleUv.x <= 1.0) {
      vec3 sampleColor = texture2D(colorMap, sampleUv).rgb;
      float sampleBright = getLuma(sampleColor);
      if (sampleBright > 0.8) {
        streak += sampleBright * exp(-abs(i) * 0.3);
      }
    }
  }
  
  streak *= lensFlareIntensity * 0.1;
  vec3 flareColor = vec3(0.9, 0.95, 1.0) * streak;
  
  return color + flareColor;
}

// ============================================
// DEPTH OF FIELD
// ============================================

// Tilt-shift blur calculation
float getTiltShiftBlur(vec2 uv) {
  if (!tiltShiftEnabled) return 0.0;
  
  // Rotate UV based on angle
  float angle = tiltShiftAngle * 3.14159 / 180.0;
  vec2 centered = uv - 0.5;
  float rotatedY = -centered.x * sin(angle) + centered.y * cos(angle);
  float pos = rotatedY + 0.5;
  
  // Distance from focus band
  float dist = abs(pos - tiltShiftPosition);
  return smoothstep(0.0, 0.3, dist) * tiltShiftBlur;
}

// Bokeh sampling patterns
vec3 sampleBokeh(sampler2D tex, vec2 uv, float blurAmount, int quality) {
  if (blurAmount < 0.01) return texture2D(tex, uv).rgb;
  
  vec3 color = vec3(0.0);
  float totalWeight = 0.0;
  float blurSize = blurAmount * 0.015;
  
  if (quality == 0) { // Fast - 9 samples box
    for (float x = -1.0; x <= 1.0; x += 1.0) {
      for (float y = -1.0; y <= 1.0; y += 1.0) {
        vec2 offset = vec2(x, y) * blurSize;
        if (anamorphicEnabled) offset.x *= anamorphicStretch; // Oval bokeh
        vec3 sample_color = texture2D(tex, uv + offset).rgb;
        color += sample_color;
        totalWeight += 1.0;
      }
    }
  }
  else if (quality == 1) { // Medium - 13 samples circular
    float samples[26];
    samples[0] = 0.0; samples[1] = 0.0;
    samples[2] = 1.0; samples[3] = 0.0;
    samples[4] = -1.0; samples[5] = 0.0;
    samples[6] = 0.0; samples[7] = 1.0;
    samples[8] = 0.0; samples[9] = -1.0;
    samples[10] = 0.707; samples[11] = 0.707;
    samples[12] = -0.707; samples[13] = 0.707;
    samples[14] = 0.707; samples[15] = -0.707;
    samples[16] = -0.707; samples[17] = -0.707;
    samples[18] = 0.5; samples[19] = 0.0;
    samples[20] = -0.5; samples[21] = 0.0;
    samples[22] = 0.0; samples[23] = 0.5;
    samples[24] = 0.0; samples[25] = -0.5;
    
    for (int i = 0; i < 26; i += 2) {
      vec2 offset = vec2(samples[i], samples[i+1]) * blurSize;
      if (anamorphicEnabled) offset.x *= anamorphicStretch;
      vec3 sample_color = texture2D(tex, uv + offset).rgb;
      // Highlight bloom - bright samples get extra weight
      float brightness = getLuma(sample_color);
      float weight = 1.0 + brightness * brightness * 2.0;
      color += sample_color * weight;
      totalWeight += weight;
    }
  }
  else { // High - 25 samples disk with highlight bloom
    for (float angle = 0.0; angle < 6.28; angle += 0.785) {
      for (float r = 0.33; r <= 1.0; r += 0.33) {
        vec2 offset = vec2(cos(angle), sin(angle)) * r * blurSize;
        if (anamorphicEnabled) offset.x *= anamorphicStretch;
        vec3 sample_color = texture2D(tex, uv + offset).rgb;
        float brightness = getLuma(sample_color);
        float weight = 1.0 + pow(brightness, 3.0) * 4.0;
        color += sample_color * weight;
        totalWeight += weight;
      }
    }
    // Center sample
    vec3 centerSample = texture2D(tex, uv).rgb;
    color += centerSample;
    totalWeight += 1.0;
  }
  
  return color / totalWeight;
}

// ============================================
// POST PROCESSING
// ============================================

vec3 applyFilmGrain(vec3 color, vec2 uv) {
  if (!filmGrainEnabled) return color;

  float grain = random(uv * time) * 2.0 - 1.0;
  return color + grain * filmGrainIntensity * 0.1;
}

vec3 applyVignette(vec3 color, vec2 uv) {
  if (!vignetteEnabled) return color;

  vec2 centered = uv - 0.5;
  if (anamorphicEnabled) centered.x /= anamorphicStretch;
  float dist = length(centered);
  float vignette = smoothstep(0.8, 0.3, dist);
  vignette = mix(1.0, vignette, vignetteIntensity);

  return color * vignette;
}

vec3 applyBloom(vec3 color) {
  if (!bloomEnabled) return color;

  // Simple highlight bloom - just brighten bright areas
  float brightness = getLuma(color);
  if (brightness > bloomThreshold) {
    vec3 bloom = (color - vec3(bloomThreshold)) * bloomIntensity * 0.3;
    color += bloom;
  }

  return clamp(color, 0.0, 1.0);
}

vec3 applyHalation(vec3 color) {
  if (!halationEnabled) return color;

  // Film halation - subtle red glow in highlights
  float brightness = getLuma(color);
  if (brightness > 0.7) {
    vec3 glow = vec3(brightness * 1.2, brightness * 0.9, brightness * 0.7);
    color += glow * halationIntensity * 0.15 * (brightness - 0.7);
  }

  return clamp(color, 0.0, 1.0);
}

vec3 applySharpen(vec3 color) {
  if (!sharpenEnabled) return color;

  // Simple luminance-based sharpening
  float lum = getLuma(color);
  vec3 sharpened = color * (1.0 + sharpenIntensity * 0.3);

  return clamp(sharpened, 0.0, 1.0);
}

// ============================================
// RENDER MODES
// ============================================

// Heat map for depth visualization
vec3 depthToHeatmap(float depth) {
  vec3 cold = vec3(0.0, 0.0, 0.5);
  vec3 cool = vec3(0.0, 0.5, 1.0);
  vec3 mid = vec3(0.0, 1.0, 0.0);
  vec3 warm = vec3(1.0, 1.0, 0.0);
  vec3 hot = vec3(1.0, 0.0, 0.0);
  
  if (depth < 0.25) return mix(cold, cool, depth * 4.0);
  if (depth < 0.5) return mix(cool, mid, (depth - 0.25) * 4.0);
  if (depth < 0.75) return mix(mid, warm, (depth - 0.5) * 4.0);
  return mix(warm, hot, (depth - 0.75) * 4.0);
}

// Derive normals from depth
vec3 computeNormals(vec2 uv) {
  vec2 texel = 1.0 / resolution;
  
  float depthC = texture2D(depthMap, uv).r;
  float depthR = texture2D(depthMap, uv + vec2(texel.x, 0.0)).r;
  float depthU = texture2D(depthMap, uv + vec2(0.0, texel.y)).r;
  
  vec3 dx = vec3(texel.x, 0.0, (depthR - depthC) * 2.0);
  vec3 dy = vec3(0.0, texel.y, (depthU - depthC) * 2.0);
  
  vec3 normal = normalize(cross(dx, dy));
  
  // Map to 0-1 range for visualization
  return normal * 0.5 + 0.5;
}

// ============================================
// MAIN PARALLAX FUNCTION
// ============================================

// Enhanced Parallax Occlusion Mapping with raymarching
vec3 parallaxColorRaymarch(vec2 uv, out float outDepth) {
  // Apply lens distortion first
  vec2 distortedUv = applyLensDistortion(uv);
  distortedUv = applyAnamorphicDistortion(distortedUv);

  // Clamp to avoid sampling outside texture
  if (distortedUv.x < 0.0 || distortedUv.x > 1.0 || distortedUv.y < 0.0 || distortedUv.y > 1.0) {
    outDepth = 0.0;
    return vec3(0.0);
  }

  // Calculate view direction from camera position
  // Positive direction creates proper parallax: camera moves right -> closer objects shift left
  vec2 viewDir = vec2(customCameraPos.x, customCameraPos.y);

  // Scale by parallax strength and depth scale
  float parallaxScale = parallaxStrength * 0.2 * depthScale;
  viewDir *= parallaxScale;

  // Adaptive quality based on view angle - steeper angles need more steps
  float viewLength = length(viewDir);
  int numSteps = int(mix(20.0, 50.0, clamp(viewLength * 2.0, 0.0, 1.0)));
  numSteps = max(numSteps, 20);

  // Initialize raymarch from the surface (height = 1.0) going down
  vec2 currentUv = distortedUv;
  float currentLayerHeight = 1.0;
  float layerStep = 1.0 / float(numSteps);

  // UV offset per step
  vec2 uvStep = viewDir / float(numSteps);

  // Sample initial depth
  float currentDepthValue = texture2D(depthMap, currentUv).r;

  // Apply depth scaling with power curve
  // Higher depthScale = more exaggerated depth separation
  if (depthScale != 1.0) {
    currentDepthValue = pow(currentDepthValue, 1.0 / max(depthScale, 0.1));
  }

  // Raymarch down through layers until we hit the surface
  for (int i = 0; i < 50; i++) {
    if (i >= numSteps) break;

    // If we've gone below the surface, we found intersection
    if (currentLayerHeight <= currentDepthValue) break;

    // Step to next layer
    currentLayerHeight -= layerStep;
    currentUv += uvStep;

    // Bounds check
    if (currentUv.x < 0.0 || currentUv.x > 1.0 || currentUv.y < 0.0 || currentUv.y > 1.0) {
      currentUv = clamp(currentUv, 0.0, 1.0);
      break;
    }

    // Sample depth at new position
    currentDepthValue = texture2D(depthMap, currentUv).r;
    if (depthScale != 1.0) {
      currentDepthValue = pow(currentDepthValue, 1.0 / max(depthScale, 0.1));
    }
  }

  // Parallax occlusion mapping with binary search for smooth intersection
  vec2 prevUv = currentUv - uvStep;
  float prevLayerHeight = currentLayerHeight + layerStep;
  float prevDepthValue = texture2D(depthMap, prevUv).r;
  if (depthScale != 1.0) {
    prevDepthValue = pow(prevDepthValue, 1.0 / max(depthScale, 0.1));
  }

  // Binary search refinement (5 iterations for smoothness)
  for (int i = 0; i < 5; i++) {
    vec2 midUv = (currentUv + prevUv) * 0.5;
    float midLayerHeight = (currentLayerHeight + prevLayerHeight) * 0.5;

    // Bounds check
    if (midUv.x >= 0.0 && midUv.x <= 1.0 && midUv.y >= 0.0 && midUv.y <= 1.0) {
      float midDepthValue = texture2D(depthMap, midUv).r;
      if (depthScale != 1.0) {
        midDepthValue = pow(midDepthValue, 1.0 / max(depthScale, 0.1));
      }

      // Refine based on which side of surface we're on
      if (midLayerHeight > midDepthValue) {
        // Still above surface
        prevUv = midUv;
        prevLayerHeight = midLayerHeight;
      } else {
        // Below surface
        currentUv = midUv;
        currentLayerHeight = midLayerHeight;
      }
    }
  }

  // Final UV with bounds check
  vec2 finalUv = clamp(currentUv, 0.0, 1.0);

  // Sample final depth for effects
  float depth = texture2D(depthMap, finalUv).r;
  if (depthScale != 1.0) {
    depth = pow(depth, 1.0 / max(depthScale, 0.1));
  }
  outDepth = depth;

  // Calculate blur amount from DOF and tilt-shift
  float depthDiff = abs(depth - focusDistance);
  float dofBlur = depthDiff * aperture;
  float tsBlur = getTiltShiftBlur(distortedUv);
  float totalBlur = max(dofBlur, tsBlur);

  // Sample with appropriate bokeh quality
  vec3 color;
  if (chromaticAberrationEnabled && totalBlur < 0.1) {
    color = applyChromaticAberration(colorMap, finalUv);
  } else {
    color = sampleBokeh(colorMap, finalUv, totalBlur, bokehQuality);

    // Apply chromatic aberration on top if enabled and not too blurry
    if (chromaticAberrationEnabled && totalBlur < 0.5) {
      vec3 caColor = applyChromaticAberration(colorMap, finalUv);
      color = mix(caColor, color, totalBlur * 2.0);
    }
  }

  return color;
}

// Simple UV offset parallax (original method)
vec3 parallaxColorOffset(vec2 uv, out float outDepth) {
  // Apply lens distortion first
  vec2 distortedUv = applyLensDistortion(uv);
  distortedUv = applyAnamorphicDistortion(distortedUv);

  // Clamp to avoid sampling outside texture
  if (distortedUv.x < 0.0 || distortedUv.x > 1.0 || distortedUv.y < 0.0 || distortedUv.y > 1.0) {
    outDepth = 0.0;
    return vec3(0.0);
  }

  // Sample depth
  float depth = texture2D(depthMap, distortedUv).r;
  outDepth = depth;

  // Calculate parallax offset based on depth and camera position
  vec2 parallaxOffset = vec2(customCameraPos.x, customCameraPos.y) * depth * parallaxStrength * 0.1;
  vec2 parallaxUv = distortedUv + parallaxOffset;

  // Clamp parallax UV
  parallaxUv = clamp(parallaxUv, 0.0, 1.0);

  // Calculate blur amount from DOF and tilt-shift
  float depthDiff = abs(depth - focusDistance);
  float dofBlur = depthDiff * aperture;
  float tsBlur = getTiltShiftBlur(distortedUv);
  float totalBlur = max(dofBlur, tsBlur);

  // Sample with appropriate bokeh quality
  vec3 color;
  if (chromaticAberrationEnabled && totalBlur < 0.1) {
    color = applyChromaticAberration(colorMap, parallaxUv);
  } else {
    color = sampleBokeh(colorMap, parallaxUv, totalBlur, bokehQuality);

    // Apply chromatic aberration on top if enabled and not too blurry
    if (chromaticAberrationEnabled && totalBlur < 0.5) {
      vec3 caColor = applyChromaticAberration(colorMap, parallaxUv);
      color = mix(caColor, color, totalBlur * 2.0);
    }
  }

  return color;
}

// Main parallax dispatcher
vec3 parallaxColor(vec2 uv, out float outDepth) {
  if (parallaxMode == 1) {
    return parallaxColorRaymarch(uv, outDepth);
  } else {
    return parallaxColorOffset(uv, outDepth);
  }
}

// ============================================
// MAIN
// ============================================

void main() {
  float depth;
  vec2 uv = vUv;
  
  // Handle split view
  bool isSplitRight = false;
  if (renderMode == 4 && uv.x > 0.5) {
    isSplitRight = true;
  }
  
  vec3 color = parallaxColor(uv, depth);
  
  // Render modes
  if (renderMode == 1) { // Depth grayscale
    color = vec3(depth);
  }
  else if (renderMode == 2) { // Depth heatmap
    color = depthToHeatmap(depth);
  }
  else if (renderMode == 3) { // Normals
    color = computeNormals(uv);
  }
  else if (renderMode == 4 && !isSplitRight) { // Split - left side is original
    color = texture2D(colorMap, uv).rgb;
  }
  else {
    // Normal rendering with all effects
    
    // Apply atmosphere
    color = applyFog(color, depth);
    color = applyDepthTint(color, depth);
    
    // Apply lens effects
    color = applyLensFlare(color, uv, depth);
    
    // Apply color grading
    color = applyColorGrading(color);
    
    // Apply post-processing (order matters!)
    color = applyBloom(color);
    color = applyHalation(color);
    color = applySharpen(color);
    color = applyFilmGrain(color, uv);
    color = applyVignette(color, uv);
  }
  
  // Split view divider
  if (renderMode == 4) {
    float divider = abs(uv.x - 0.5);
    if (divider < 0.002) {
      color = vec3(1.0);
    }
  }

  gl_FragColor = vec4(color, 1.0);
}
