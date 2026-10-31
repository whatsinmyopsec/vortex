import { DistortionMode, LayerBlendStyle } from './types';

export const VERTEX_SHADER_SOURCE = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const SHARED_GLSL_UTILS = `
#define PI 3.14159265359

vec2 h2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
        v += amp * valueNoise(p);
        p = rot * p * 2.02 + vec2(1.7, 9.2);
        amp *= 0.5;
    }
    return v;
}
`;

export const MOUSE_DISTORTION_GLSL = `
    // Audio-Reactive Kick & Bassline Optical Zoom:
    // Zooms the visualizer camera inward when a kick transient or heavy bassline comes in
    float bassZoomScale = 1.0 / (1.0 + max(0.0, uBassZoom));
    vec2 p0 = ((fc - 0.5 * iResolution.xy) / iResolution.y) * bassZoomScale;
    vec2 m = uMouse * bassZoomScale;

    vec2 dVec = p0 - m;
    float dMouse = length(dVec);
    float velMag = clamp(length(uMouseVel) * 18.0, 0.0, 1.5);
    float boost = 1.0 + uPulse * 0.85 + velMag * 0.35;
    float str = uDistortion * boost;

    vec2 p = p0;
    float a = 0.0;
    float r = 0.0;
    vec2 uv = vec2(0.0);

    if (uMode == 0) {
        // Mode 0: Gravitational Vortex & Apex Shift
        vec2 shifted = p0 - m * (0.55 * clamp(uDistortion, 0.0, 2.0));
        float falloff = exp(-dMouse * 2.8);
        vec2 ortho = vec2(-dVec.y, dVec.x);
        p = shifted
            - dVec * (0.42 * str * falloff)
            + ortho * (0.35 * uSwirl * str * falloff);

        a = atan(p.y, p.x);
        r = max(length(p), 0.0005);

        float vortexAngle = (m.x * uSwirl * 0.9) / (r + 0.18) + (m.y * uSwirl * 0.65) * r;
        float depthMod = max(0.04, uDepth * (1.0 + dot(m, p) * 0.45 * str));

        uv = vec2(
            depthMod / r + iTime * uFlowSpeed,
            (a + vortexAngle) * 0.5 + iTime * uAngularSpeed
        );
    } else if (uMode == 1) {
        // Mode 1: Bipolar Singularity Interference (Seamless 2*PI periodic angle)
        vec2 pA = p0;
        vec2 pB = p0 - m * clamp(str, 0.1, 2.5);

        float rA = max(length(pA), 0.001);
        float rB = max(length(pB), 0.001);
        float aA = atan(pA.y, pA.x);
        float aB = atan(pB.y, pB.x);

        float blend = clamp(str * 0.55, 0.0, 1.5);
        r = mix(rA, sqrt(rA * rB) * 1.35, clamp(blend, 0.0, 1.0));
        // Keep integer winding (aA + aB) + smooth periodic modulation sin(aB - aA) so there is zero branch cut seam
        a = aA + aB + sin(aB - aA) * (0.75 * uSwirl * blend) + (rA - rB) * uSwirl * 1.2;
        p = vec2(r * cos(a), r * sin(a));

        uv = vec2(
            uDepth / max(r, 0.0005) + iTime * uFlowSpeed,
            a * 0.5 + iTime * uAngularSpeed
        );
    } else if (uMode == 2) {
        // Mode 2: Harmonic Lens & Ripple Pinch
        float falloff = exp(-dMouse * 2.2);
        float wave = sin(dMouse * 14.0 - iTime * 4.5 - uPulse * 3.14159);
        vec2 dir = dVec / (dMouse + 0.001);
        vec2 ortho = vec2(-dir.y, dir.x);

        p = p0 - m * 0.25 * uDistortion
            + dir * (wave * 0.12 * str * falloff)
            + ortho * (uSwirl * 0.45 * str * falloff);

        a = atan(p.y, p.x);
        r = max(length(p), 0.0005);

        float rippleUv = wave * 0.18 * str * falloff;
        uv = vec2(
            uDepth / r + iTime * uFlowSpeed + rippleUv,
            (a + falloff * uSwirl * 1.2) * 0.5 + iTime * uAngularSpeed
        );
    } else {
        // Mode 3: Anisotropic Shear & Torsion
        p = p0 - m * 0.35;
        a = atan(p.y, p.x);
        r = max(length(p), 0.0005);

        float radialExp = clamp(1.0 + m.y * 0.65 * str, 0.35, 2.2);
        float spiralTwist = m.x * 2.4 * uSwirl * str * (r + 0.2 / (r + 0.15));
        float angularShear = dot(p, m) * 2.0 * str;

        uv = vec2(
            uDepth / pow(r, radialExp) + iTime * uFlowSpeed + angularShear * 0.3,
            (a + spiralTwist) * 0.5 + iTime * uAngularSpeed
        );
    }
`;

export const DISTORTION_MODES: {
  id: DistortionMode;
  name: string;
  shortLabel: string;
  formulaSummary: string;
  description: string;
}[] = [
  {
    id: 0,
    name: 'Gravitational Vortex & Apex Shift',
    shortLabel: 'Vortex Warp',
    formulaSummary: 'p -= m * 0.55; p += ortho * swirl * exp(-d * 2.8)',
    description:
      'Shifts the polar tunnel origin toward your cursor while applying a distance-weighted radial lens pinch and angular swirl.',
  },
  {
    id: 1,
    name: 'Bipolar Singularity Interference',
    shortLabel: 'Bipolar Field',
    formulaSummary: 'r = sqrt(rA * rB); a = atan(pA) + atan(pB) * swirl',
    description:
      'Treats screen center as a fixed primary pole and your cursor as a live secondary singularity, bending all active layers between both poles.',
  },
  {
    id: 2,
    name: 'Harmonic Lens & Ripple Pinch',
    shortLabel: 'Gravity Ripple',
    formulaSummary: 'p += normalize(p - m) * sin(d * 14.0 - iTime * 4.5) * exp(-d * 2.2)',
    description:
      'Emits concentric refractive gravity waves outward from the cursor that compress and stretch all active shader layers.',
  },
  {
    id: 3,
    name: 'Anisotropic Shear & Torsion',
    shortLabel: 'Shear & Torsion',
    formulaSummary: 'a += m.x * swirl * r; r = pow(r, 1.0 + m.y * str)',
    description:
      'Maps Mouse X to spiral torsion and Mouse Y to non-linear radial compression across the tunnel and active layers.',
  },
];

export const LAYER_BLEND_STYLES: {
  id: LayerBlendStyle;
  name: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 0,
    name: 'Tunnel-Sculpted HDR Fusion',
    shortLabel: 'Tunnel Fusion',
    description:
      'Sculpts active shader layers into the 3D polar tunnel walls with filmic HDR tone-mapping so bright ridges and stars never clip.',
  },
  {
    id: 1,
    name: 'Optical Additive Screen',
    shortLabel: 'Optical Glow',
    description:
      'Superimposes all active shader layers with pure additive light and soft filmic roll-off.',
  },
  {
    id: 2,
    name: 'Normalized Layer Crossfade',
    shortLabel: 'Linear Mix',
    description:
      'Blends active layers proportionally by their percentage weights using their exact native colors.',
  },
];
