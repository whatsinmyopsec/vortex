import { ShaderLayerDefinition } from '../types';

/**
 * Layer 01: Non-Rainbow Polar Harmonic Tunnel
 * Restores the exact `sin(uv.x * 12.0) * sin(uv.y * 12.0)` polar tunnel structure
 * without the rainbow cosine palette—using a refined monochrome silver, warm amber, or deep sapphire palette.
 */
export const polarTunnelLayer: ShaderLayerDefinition = {
  id: 'tunnel',
  name: '01. Polar Harmonic Tunnel',
  shortName: 'Tunnel',
  description:
    'The classic sin(uv.x * 12) * sin(uv.y * 12) polar vortex grid rendered in brushed silver, warm tungsten amber, or deep sapphire—without rainbow colors.',
  mixUniform: 'uTunnelMix',
  defaultMix: 0.85,
  lfoMix: { freq: 0.34, phase: 0.0, min: 0.45, max: 1.0, decimals: 2 },
  subParams: [
    {
      key: 'freq',
      uniformName: 'uTunnelFreq',
      label: 'Grid Frequency (12.0)',
      min: 4.0,
      max: 28.0,
      step: 0.5,
      defaultValue: 12.0,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.31, phase: 2.5, min: 6.0, max: 20.0, decimals: 1 },
    },
    {
      key: 'tone',
      uniformName: 'uTunnelTone',
      label: 'Tone (Silver · Amber · Cobalt)',
      min: 0.0,
      max: 1.0,
      step: 0.02,
      defaultValue: 0.45,
      format: (v) => (v < 0.33 ? 'Silver' : v < 0.67 ? 'Amber' : 'Cobalt'),
      lfo: { freq: 0.26, phase: 1.1, min: 0.0, max: 1.0, decimals: 2 },
    },
    {
      key: 'contrast',
      uniformName: 'uTunnelContrast',
      label: 'Depth Contrast',
      min: 0.8,
      max: 3.5,
      step: 0.05,
      defaultValue: 2.5,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.42, phase: 0.7, min: 1.5, max: 3.2, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalPolarTunnel(vec2 uv, float r, float freq, float tone, float contrast) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    // Snap angular frequency to an even integer so uv.y * angFreq jumps by 2*k*PI across the -PI/+PI branch cut (zero seam)
    float angFreq = max(2.0, floor(freq * 0.5 + 0.5) * 2.0);
    float f = sin(uv.x * freq) * sin(uv.y * angFreq);
    float mask = smoothstep(-0.2 - subBoost * 0.12, 0.6, f);
    float ribHighlight = smoothstep(0.45 - highBoost * 0.15, 0.96, f);

    // Non-rainbow architectural palettes: Silver -> Warm Amber -> Deep Cobalt
    vec3 silverBase = mix(vec3(0.14, 0.17, 0.22), vec3(0.82, 0.88, 0.96), ribHighlight);
    vec3 amberBase  = mix(vec3(0.12, 0.14, 0.24), vec3(0.98, 0.76, 0.38), ribHighlight);
    vec3 cobaltBase = mix(vec3(0.06, 0.18, 0.38), vec3(0.38, 0.86, 1.00), ribHighlight);

    vec3 baseHue = tone < 0.5
        ? mix(silverBase, amberBase, tone * 2.0)
        : mix(amberBase, cobaltBase, (tone - 0.5) * 2.0);

    // Subtle longitudinal depth shimmer without rainbow cycling
    float depthPulse = (0.85 + 0.15 * cos(uv.x * 2.0 - iTime * 0.8)) * (1.0 + subBoost * 0.35 + highBoost * 0.2);
    return baseHue * mask * depthPulse * clamp(r * contrast, 0.0, 2.4);
}
`,
  glslEvalExpr: 'evalPolarTunnel(uv, r, uTunnelFreq, uTunnelTone, uTunnelContrast)',
  shadertoyMain: (mix, v) => {
    const freq = (v.freq ?? 12.0).toFixed(1);
    const contrast = (v.contrast ?? 2.5).toFixed(2);
    return `    // Layer 01: Non-Rainbow Polar Harmonic Tunnel
    float tf = sin(uv.x * ${freq}) * sin(uv.y * ${freq});
    float tMask = smoothstep(-0.2, 0.6, tf);
    vec3 tHue = mix(vec3(0.12, 0.15, 0.24), vec3(0.96, 0.78, 0.44), smoothstep(0.45, 0.96, tf));
    col += tHue * tMask * (r * ${contrast}) * ${mix.toFixed(2)};`;
  },
};

/**
 * Layer 02: 3x3 Voronoi Cellular Ridge Lattice
 */
export const voronoiLayer: ShaderLayerDefinition = {
  id: 'voronoi',
  name: '02. Voronoi Cellular Ridge',
  shortName: 'Voronoi',
  description:
    '3x3 cellular neighbor search (d2 - d1) with golden ridges and deep sapphire interiors wrapped seamlessly around the tunnel.',
  mixUniform: 'uVoronoiMix',
  defaultMix: 0.65,
  lfoMix: { freq: 0.52, phase: 2.8, min: 0.15, max: 0.9, decimals: 2 },
  subParams: [
    {
      key: 'scale',
      uniformName: 'uVoronoiScale',
      label: 'Cell Ring Density',
      min: 3.0,
      max: 14.0,
      step: 1.0,
      defaultValue: 6.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.22, phase: 0.4, min: 4.0, max: 11.0, decimals: 0 },
    },
    {
      key: 'edge',
      uniformName: 'uVoronoiEdge',
      label: 'Golden Ridge Width',
      min: 0.01,
      max: 0.2,
      step: 0.01,
      defaultValue: 0.06,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.73, phase: 1.5, min: 0.02, max: 0.15, decimals: 2 },
    },
    {
      key: 'jitter',
      uniformName: 'uVoronoiJitter',
      label: 'Cell Oscillation',
      min: 0.0,
      max: 0.5,
      step: 0.02,
      defaultValue: 0.45,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.64, phase: 3.7, min: 0.15, max: 0.48, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalVoronoiLayer(vec2 coord, float scale, float jitter, float edgeW, bool isPolar) {
    float angularCells = max(2.0, floor(scale + 0.5));
    vec2 vp = isPolar
        ? vec2(coord.x * scale * 0.5, coord.y * (angularCells / PI))
        : coord * scale;
    vec2 i = floor(vp);
    vec2 f = fract(vp);

    float d1 = 9.0;
    float d2 = 9.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 cellId = i + g;
            if (isPolar) {
                cellId.y = mod(cellId.y, angularCells);
            }
            vec2 c = g + 0.5 + jitter * sin(iTime + 6.2831853 * h2(cellId));
            float d = length(c - f);
            if (d < d1) {
                d2 = d1;
                d1 = d;
            } else if (d < d2) {
                d2 = d;
            }
        }
    }
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;
    float edge = smoothstep(0.0, edgeW * (1.0 + subBoost * 0.38), d2 - d1);
    vec3 ridgeGold = vec3(1.0, 0.9, 0.6) * (1.0 + highBoost * 0.35);
    vec3 cellCore = vec3(0.1, 0.2, 0.5) * (1.0 + subBoost * 0.25) + 0.4 * d1;
    return mix(ridgeGold, cellCore, edge);
}
`,
  glslEvalExpr: 'evalVoronoiLayer(isPolar ? uv : p, uVoronoiScale, uVoronoiJitter, uVoronoiEdge, isPolar)',
  shadertoyMain: (mix, v) => {
    const scale = Math.round(v.scale ?? 6).toFixed(1);
    const edge = (v.edge ?? 0.06).toFixed(2);
    const jitter = (v.jitter ?? 0.45).toFixed(2);
    return `    // Layer 02: 3x3 Voronoi Cellular Ridge Lattice
    vec2 vp = vec2(uv.x * ${scale} * 0.5, uv.y * (${scale} / 3.14159265));
    vec2 vi = floor(vp), vf = fract(vp);
    float d1 = 9.0, d2 = 9.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(x, y);
        vec2 cellId = vec2(vi.x + g.x, mod(vi.y + g.y, ${scale}));
        vec2 c = g + 0.5 + ${jitter} * sin(iTime + 6.28 * h2(cellId));
        float distCell = length(c - vf);
        if (distCell < d1) { d2 = d1; d1 = distCell; } else if (distCell < d2) d2 = distCell;
    }
    float vEdge = smoothstep(0.0, ${edge}, d2 - d1);
    col += mix(vec3(1.0, 0.9, 0.6), vec3(0.1, 0.2, 0.5) + 0.4 * d1, vEdge) * ${mix.toFixed(2)};`;
  },
};

/**
 * Layer 03: Orbital Starfield Drift
 */
export const starfieldLayer: ShaderLayerDefinition = {
  id: 'starfield',
  name: '03. Orbital Starfield Drift',
  shortName: 'Starfield',
  description:
    '19-plane tangential starfield with near-plane fade and central eye clearance so stars glide along the tunnel walls.',
  mixUniform: 'uStarfieldMix',
  defaultMix: 0.65,
  lfoMix: { freq: 0.55, phase: 0.2, min: 0.25, max: 0.95, decimals: 2 },
  subParams: [
    {
      key: 'speed',
      uniformName: 'uStarfieldSpeed',
      label: 'Orbit Speed',
      min: 0.1,
      max: 3.0,
      step: 0.05,
      defaultValue: 1.0,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.42, phase: 1.1, min: 0.4, max: 2.2, decimals: 2 },
    },
    {
      key: 'size',
      uniformName: 'uStarfieldSize',
      label: 'Star Radius',
      min: 0.015,
      max: 0.1,
      step: 0.005,
      defaultValue: 0.05,
      format: (v) => v.toFixed(3),
      lfo: { freq: 0.68, phase: 2.4, min: 0.025, max: 0.08, decimals: 3 },
    },
  ],
  glslFunction: `
vec3 evalStarfield(vec2 pWarped, float speed, float starRadius) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.22;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.28;
    vec3 col = vec3(0.0);
    float t = iTime * 0.22 * speed;
    float rDist = length(pWarped);
    float eyeClearance = smoothstep(0.06, 0.28, rDist);
    float dynRadius = starRadius * (1.0 + subBoost * 0.22 + highBoost * 0.18);

    for (int idx = 1; idx < 20; idx++) {
        float i = float(idx);
        float zCycle = mod(i * 9.5 - t * 8.0, 44.0);
        float z = 8.0 + zCycle;
        float farFade = 1.0 - zCycle / 44.0;
        float nearFade = smoothstep(0.0, 12.0, zCycle);
        float d = farFade * nearFade;

        float angle = i * 0.45 + t * (0.35 + 0.02 * i);
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 lateralDrift = vec2(t * 1.4, sin(t * 0.6 + i) * 0.8);

        vec2 p = rot * pWarped * (z * 0.45) + lateralDrift + i * 0.5;
        float star = smoothstep(dynRadius, 0.0, length(fract(p) - 0.5));
        col += star * d * eyeClearance * vec3(0.8, 0.9, 1.0);
    }
    return col * (1.25 + highBoost * 0.45);
}
`,
  glslEvalExpr: 'evalStarfield(p, uStarfieldSpeed, uStarfieldSize)',
  shadertoyHelper: (v) => `vec3 orbitalStarfield(vec2 uv) {
    vec3 col = vec3(0.0);
    float t = iTime * ${(0.22 * (v.speed ?? 1.0)).toFixed(2)};
    float eyeClearance = smoothstep(0.06, 0.28, length(uv));
    for (float i = 1.0; i < 20.0; i++) {
        float zCycle = mod(i * 9.5 - t * 8.0, 44.0);
        float z = 8.0 + zCycle;
        float d = (1.0 - zCycle / 44.0) * smoothstep(0.0, 12.0, zCycle);
        float ang = i * 0.45 + t * (0.35 + 0.02 * i);
        mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        vec2 p = rot * uv * (z * 0.45) + vec2(t * 1.4, sin(t * 0.6 + i) * 0.8) + i * 0.5;
        float star = smoothstep(${(v.size ?? 0.05).toFixed(3)}, 0.0, length(fract(p) - 0.5));
        col += star * d * eyeClearance * vec3(0.8, 0.9, 1.0);
    }
    return col;
}`,
  shadertoyMain: (mix) => `    // Layer 03: Orbital Starfield Drift
    col += orbitalStarfield(p) * ${mix.toFixed(2)} * 1.25;`,
};

/**
 * Layer 04: Domain-Warped FBM Nebula & Aurora
 */
export const nebulaLayer: ShaderLayerDefinition = {
  id: 'nebula',
  name: '04. FBM Nebula & Aurora Clouds',
  shortName: 'Nebula',
  description:
    '5-octave Fractional Brownian Motion with dual-pass domain warping creating volumetric cosmic gas filaments.',
  mixUniform: 'uNebulaMix',
  defaultMix: 0.45,
  lfoMix: { freq: 0.41, phase: 0.5, min: 0.15, max: 0.9, decimals: 2 },
  subParams: [
    {
      key: 'scale',
      uniformName: 'uNebulaScale',
      label: 'Cloud Scale',
      min: 1.0,
      max: 6.0,
      step: 0.1,
      defaultValue: 2.8,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.32, phase: 1.4, min: 1.5, max: 4.8, decimals: 1 },
    },
    {
      key: 'warp',
      uniformName: 'uNebulaWarp',
      label: 'Domain Warp',
      min: 0.2,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.2,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.53, phase: 2.2, min: 0.5, max: 2.1, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalNebula(vec2 p, float scale, float warpStr) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float midBoost = clamp(uAudioMid * uAudioReactivity, 0.0, 1.0) * 0.25;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    vec2 q = p * scale;
    float t = iTime * 0.18;
    float dynWarp = warpStr;
    vec2 w1 = vec2(
        fbm(q + vec2(0.0, t)),
        fbm(q + vec2(5.2, 1.3 - t * 0.8))
    );
    vec2 w2 = vec2(
        fbm(q + dynWarp * 3.0 * w1 + vec2(1.7, 9.2 + t * 0.6)),
        fbm(q + dynWarp * 3.0 * w1 + vec2(8.3, 2.8 - t * 0.5))
    );
    float n = fbm(q + dynWarp * 3.5 * w2);

    vec3 deepSpace = vec3(0.03, 0.07, 0.16);
    vec3 tealVeil = vec3(0.06, 0.52, 0.68) * (1.0 + midBoost * 0.28);
    vec3 amberCore = vec3(0.96, 0.58, 0.22);
    vec3 violetFilament = vec3(0.42, 0.18, 0.65) * (1.0 + highBoost * 0.3);

    vec3 col = mix(deepSpace, tealVeil, clamp(n * n * 2.2, 0.0, 1.0));
    col = mix(col, violetFilament, clamp(length(w1) * 0.75, 0.0, 1.0));
    col += amberCore * pow(clamp(n * 1.25, 0.0, 1.0), 3.2) * (0.95 + subBoost * 0.45);
    return col;
}
`,
  glslEvalExpr: 'evalNebula(domainCoord, uNebulaScale, uNebulaWarp)',
  shadertoyMain: (mix, v) => {
    const scale = (v.scale ?? 2.8).toFixed(2);
    const warp = (v.warp ?? 1.2).toFixed(2);
    return `    // Layer 04: Domain-Warped FBM Nebula
    vec2 qNeb = domainCoord * ${scale};
    float nNeb = fbm(qNeb + fbm(qNeb + iTime * 0.18) * ${warp});
    col += mix(vec3(0.03, 0.07, 0.16), vec3(0.06, 0.52, 0.68), clamp(nNeb * nNeb * 2.2, 0.0, 1.0)) * ${mix.toFixed(2)};`;
  },
};

/**
 * Layer 05: Event Horizon Accretion Disk
 */
export const accretionLayer: ShaderLayerDefinition = {
  id: 'accretion',
  name: '05. Event Horizon Accretion Disk',
  shortName: 'Accretion',
  description:
    'Relativistic black hole photon ring, Doppler-beamed spiral plasma bands, and central event horizon shadow.',
  mixUniform: 'uAccretionMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.37, phase: 1.8, min: 0.1, max: 0.92, decimals: 2 },
  subParams: [
    {
      key: 'radius',
      uniformName: 'uAccretionRadius',
      label: 'Horizon Radius',
      min: 0.1,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.24,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.46, phase: 0.6, min: 0.15, max: 0.38, decimals: 2 },
    },
    {
      key: 'spin',
      uniformName: 'uAccretionSpin',
      label: 'Disk Spin',
      min: 0.2,
      max: 3.0,
      step: 0.05,
      defaultValue: 1.2,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.58, phase: 3.1, min: 0.6, max: 2.3, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalAccretionDisk(vec2 p, float horizonR, float spinSpeed) {
    float subPump = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float r = length(p);
    float a = atan(p.y, p.x);

    float dynR = horizonR;
    float ringDist = abs(r - dynR);
    float photonRing = 0.014 / (ringDist + 0.008);

    float diskMask = smoothstep(dynR * 0.82, dynR * 1.12, r) * exp(-max(0.0, r - dynR) * 2.6);
    float spiralCoord = a * 3.0 + 3.2 / (r + 0.08) - iTime * 2.4 * spinSpeed;
    float turbulence = fbm(vec2(r * 8.0 - iTime * 0.5, sin(a) * 2.5 + cos(a) * 2.5));
    float bands = 0.5 + 0.5 * sin(spiralCoord + turbulence * 4.5);

    float doppler = 0.7 + 0.35 * cos(a - 0.6);

    vec3 hotGold = vec3(1.0, 0.82, 0.42);
    vec3 plasmaOrange = vec3(0.95, 0.36, 0.12);
    vec3 outerCrimson = vec3(0.38, 0.08, 0.28);

    vec3 diskCol = mix(outerCrimson, plasmaOrange, bands);
    diskCol = mix(diskCol, hotGold, pow(bands, 2.5));

    vec3 col = diskCol * diskMask * doppler * (1.8 + subPump * 0.28) + hotGold * photonRing * (0.75 + subPump * 0.25);
    float shadow = smoothstep(dynR * 0.72, dynR * 0.98, r);
    return col * (0.15 + 0.85 * shadow);
}
`,
  glslEvalExpr: 'evalAccretionDisk(p, uAccretionRadius, uAccretionSpin)',
  shadertoyMain: (mix, v) => {
    const hR = (v.radius ?? 0.24).toFixed(2);
    const spin = (v.spin ?? 1.2).toFixed(2);
    return `    // Layer 05: Event Horizon Accretion Disk
    float photonRing = 0.014 / (abs(r - ${hR}) + 0.008);
    float diskMask = smoothstep(${hR} * 0.82, ${hR} * 1.12, r) * exp(-max(0.0, r - ${hR}) * 2.6);
    float bands = 0.5 + 0.5 * sin(a * 3.0 + 3.2 / (r + 0.08) - iTime * ${(2.4 * Number(spin)).toFixed(2)});
    col += (mix(vec3(0.95, 0.36, 0.12), vec3(1.0, 0.82, 0.42), bands) * diskMask * 1.6 + vec3(1.0, 0.82, 0.42) * photonRing * 0.75) * ${mix.toFixed(2)};`;
  },
};

/**
 * Layer 06: Truchet Cyber-Conduit Lattice
 */
export const truchetLayer: ShaderLayerDefinition = {
  id: 'truchet',
  name: '06. Truchet Cyber-Conduit Lattice',
  shortName: 'Truchet',
  description:
    'Procedural Smith Truchet quarter-circle conduits with glowing energy packets racing along the warped geometry.',
  mixUniform: 'uTruchetMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.44, phase: 4.5, min: 0.0, max: 0.85, decimals: 2 },
  subParams: [
    {
      key: 'scale',
      uniformName: 'uTruchetScale',
      label: 'Grid Scale',
      min: 3.0,
      max: 16.0,
      step: 1.0,
      defaultValue: 7.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.25, phase: 1.9, min: 4.0, max: 12.0, decimals: 0 },
    },
    {
      key: 'pulse',
      uniformName: 'uTruchetPulse',
      label: 'Pulse Speed',
      min: 0.2,
      max: 3.0,
      step: 0.05,
      defaultValue: 1.2,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.61, phase: 0.7, min: 0.5, max: 2.4, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalTruchetConduits(vec2 coord, float scale, float pulseSpeed, bool isPolar) {
    float angularCells = max(2.0, floor(scale * 0.5 + 0.5) * 2.0);
    vec2 uv = isPolar
        ? vec2(coord.x * scale * 0.45, coord.y * (angularCells / PI))
        : coord * scale;
    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);
    if (isPolar) {
        id.y = mod(id.y, angularCells);
    }

    float rnd = hash21(id);
    if (rnd < 0.5) {
        gv.x *= -1.0;
    }

    vec2 cUv = gv - sign(gv.x + gv.y + 0.0001) * 0.5;
    float dCircle = abs(length(cUv) - 0.5);

    float line = smoothstep(0.085, 0.015, dCircle);
    float core = smoothstep(0.032, 0.0, dCircle);
    float glow = 0.025 / (dCircle + 0.025);

    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    float arcAngle = atan(cUv.y, cUv.x);
    float checker = mod(id.x + id.y, 2.0) * 2.0 - 1.0;
    float packet = 0.5 + 0.5 * sin(arcAngle * 4.0 * checker - iTime * 3.5 * pulseSpeed);
    packet = pow(packet, 3.0);

    vec3 baseCyan = vec3(0.08, 0.65, 0.88);
    vec3 pulseGold = vec3(1.0, 0.78, 0.28);

    vec3 col = baseCyan * (line * 0.75 + glow * (0.35 + subBoost * 0.22));
    col += mix(baseCyan, pulseGold, packet) * core * (0.7 + 0.9 * packet + highBoost * 0.4);
    return col;
}
`,
  glslEvalExpr: 'evalTruchetConduits(isPolar ? uv : p, uTruchetScale, uTruchetPulse, isPolar)',
  shadertoyMain: (mix, v) => {
    const scale = (v.scale ?? 7.0).toFixed(1);
    return `    // Layer 06: Truchet Cyber-Conduit Lattice
    vec2 tuv = domainCoord * ${scale}, tgv = fract(tuv) - 0.5, tid = floor(tuv);
    if (hash21(tid) < 0.5) tgv.x *= -1.0;
    float dCirc = abs(length(tgv - sign(tgv.x + tgv.y + 1e-4) * 0.5) - 0.5);
    col += vec3(0.08, 0.65, 0.88) * (smoothstep(0.08, 0.01, dCirc) + 0.02 / (dCirc + 0.02)) * ${mix.toFixed(2)};`;
  },
};

/**
 * Layer 07: Neon Plasma Wave Caustics
 */
export const plasmaLayer: ShaderLayerDefinition = {
  id: 'plasma',
  name: '07. Neon Plasma Wave Caustics',
  shortName: 'Plasma',
  description:
    '3-iteration domain-warped sine/cosine plasma with harmonic caustic division and high-frequency audio palette shift.',
  mixUniform: 'uPlasmaMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.47, phase: 1.7, min: 0.0, max: 0.82, decimals: 2 },
  subParams: [
    {
      key: 'speed',
      uniformName: 'uPlasmaSpeed',
      label: 'Wave Speed',
      min: 0.2,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.0,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.38, phase: 0.5, min: 0.5, max: 2.0, decimals: 2 },
    },
    {
      key: 'scale',
      uniformName: 'uPlasmaScale',
      label: 'Caustic Scale',
      min: 0.6,
      max: 4.0,
      step: 0.1,
      defaultValue: 1.8,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.51, phase: 3.1, min: 1.0, max: 3.2, decimals: 1 },
    },
  ],
  glslFunction: `
vec3 evalNeonPlasma(vec2 uvIn, float speed) {
    vec2 uv = uvIn;
    vec3 finalColor = vec3(0.0);
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.22;
    float t = iTime * speed;

    for (int idx = 0; idx < 3; idx++) {
        float i = float(idx);
        uv.x += sin(uv.y + i + t * 0.5) * 0.3;
        uv.y += cos(uv.x + i + t * 0.4) * 0.3;

        // Gentle high-frequency tint shift without phase strobing
        vec3 col = vec3(
            sin(uv.x + t + i + highBoost * 0.45),
            cos(uv.y + t * 0.8 + i + highBoost * 0.6),
            sin(uv.x + uv.y + t * 0.3 + highBoost * 0.75)
        );

        float denom = max(length(vec2(sin(uv.x * 4.0), cos(uv.y * 4.0))), 0.035);
        finalColor += col / denom;
    }

    finalColor = sin(finalColor * 0.5 + vec3(0.0, 0.35, 0.7) * highBoost) * 0.5 + 0.5;
    return finalColor;
}
`,
  glslEvalExpr: 'evalNeonPlasma(domainCoord * uPlasmaScale, uPlasmaSpeed)',
  shadertoyHelper: (v) => `vec3 neonPlasmaWave(vec2 uv) {
    vec3 finalColor = vec3(0.0);
    float t = iTime * ${(v.speed ?? 1.0).toFixed(2)};
    for (float i = 0.0; i < 3.0; i++) {
        uv.x += sin(uv.y + i + t * 0.5) * 0.3;
        uv.y += cos(uv.x + i + t * 0.4) * 0.3;
        vec3 col = vec3(sin(uv.x + t + i), cos(uv.y + t * 0.8 + i), sin(uv.x + uv.y + t * 0.3));
        finalColor += col / max(length(vec2(sin(uv.x * 4.0), cos(uv.y * 4.0))), 0.025);
    }
    return sin(finalColor * 0.5) * 0.5 + 0.5;
}`,
  shadertoyMain: (mix, v) =>
    `    // Layer 07: Neon Plasma Wave Caustics
    col += neonPlasmaWave(domainCoord * ${(v.scale ?? 1.8).toFixed(2)}) * ${mix.toFixed(2)};`,
};

/**
 * Layer 08: Animated Julia Set Fractal
 */
export const juliaLayer: ShaderLayerDefinition = {
  id: 'julia',
  name: '08. Animated Julia Set Fractal',
  shortName: 'Julia',
  description:
    '400-iteration smooth-renormalized complex fractal where cursor position morphs the complex constant c.',
  mixUniform: 'uJuliaMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.36, phase: 4.0, min: 0.0, max: 0.85, decimals: 2 },
  subParams: [
    {
      key: 'zoom',
      uniformName: 'uJuliaZoom',
      label: 'Fractal Zoom',
      min: 0.8,
      max: 4.0,
      step: 0.05,
      defaultValue: 2.3,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.44, phase: 2.0, min: 1.2, max: 3.1, decimals: 2 },
    },
    {
      key: 'morph',
      uniformName: 'uJuliaMouseMorph',
      label: 'Mouse c-Morph',
      min: 0.0,
      max: 0.5,
      step: 0.02,
      defaultValue: 0.2,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.62, phase: 0.9, min: 0.06, max: 0.4, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalJuliaSet(vec2 uvIn, vec2 mouseOffset, float zoom, float mouseMorph) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.22;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    vec2 z = uvIn * zoom;
    vec2 c = vec2(-0.7, 0.27015)
           + vec2(cos(iTime * 0.3), sin(iTime * 0.2)) * 0.15
           + mouseOffset * mouseMorph;

    float n = 0.0;
    float maxIt = 400.0;
    bool escaped = false;
    for (int idx = 0; idx < 400; idx++) {
        if (dot(z, z) > 4.0) {
            n = float(idx);
            escaped = true;
            break;
        }
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    }

    if (!escaped) {
        // Interior basin is negative space so the next layer in the stack shines inside the Julia set
        return vec3(0.0);
    }

    float zz = max(dot(z, z), 1.0001);
    float smooth_n = n - log2(max(1.0, log2(zz) * 0.5));
    float f = clamp(smooth_n / maxIt, 0.0, 1.0);

    vec3 col = 0.5 + 0.5 * cos(3.0 + f * 6.0 + highBoost * 0.45 + vec3(0.0, 0.6, 1.0));
    col *= smoothstep(0.0, 1.0, f) * (1.0 + subBoost * 0.28);
    return col;
}
`,
  glslEvalExpr: 'evalJuliaSet(domainCoord, m, uJuliaZoom, uJuliaMouseMorph)',
  shadertoyHelper: (v) => `vec3 animatedJuliaSet(vec2 uv, vec2 m) {
    vec2 z = uv * ${(v.zoom ?? 2.3).toFixed(2)};
    vec2 c = vec2(-0.7, 0.27015) + vec2(cos(iTime * 0.3), sin(iTime * 0.2)) * 0.15 + m * ${(v.morph ?? 0.2).toFixed(2)};
    float n = 0.0, maxIt = 400.0;
    for (float i = 0.0; i < 400.0; i++) {
        if (dot(z, z) > 4.0) { n = i; break; }
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    }
    if (n == 0.0 && dot(z, z) <= 4.0) n = maxIt;
    float smooth_n = n - log2(max(1.0, log2(max(dot(z, z), 1.0001)) * 0.5));
    float f = clamp(smooth_n / maxIt, 0.0, 1.0);
    return (0.5 + 0.5 * cos(3.0 + f * 6.0 + vec3(0.0, 0.6, 1.0))) * smoothstep(0.0, 1.0, f);
}`,
  shadertoyMain: (mix) =>
    `    // Layer 08: Animated Julia Set Fractal (400 Iterations)
    col += animatedJuliaSet(domainCoord, m) * ${mix.toFixed(2)};`,
};

/**
 * Layer 09: Bioluminescent Turing Coral Wave
 */
export const coralLayer: ShaderLayerDefinition = {
  id: 'coral',
  name: '09. Bioluminescent Turing Coral',
  shortName: 'Coral',
  description:
    'Coupled multi-pass reaction-diffusion wave patterns with emerald and electric aqua bioluminescent veins.',
  mixUniform: 'uCoralMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.39, phase: 5.2, min: 0.0, max: 0.85, decimals: 2 },
  subParams: [
    {
      key: 'scale',
      uniformName: 'uCoralScale',
      label: 'Coral Scale',
      min: 4.0,
      max: 20.0,
      step: 0.5,
      defaultValue: 10.0,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.28, phase: 2.7, min: 6.0, max: 15.0, decimals: 1 },
    },
    {
      key: 'ripple',
      uniformName: 'uCoralRipple',
      label: 'Wave Ripple',
      min: 0.2,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.0,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.54, phase: 1.3, min: 0.4, max: 2.0, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalTuringCoral(vec2 p, float scale, float rippleSpeed) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.24;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    vec2 q = p * scale;
    float t = iTime * 0.6 * rippleSpeed;

    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        q += 0.42 * vec2(
            sin(q.y * 1.35 + t + fi * 1.7),
            cos(q.x * 1.35 - t * 0.85 + fi * 2.1)
        );
    }

    float pattern = sin(q.x) * cos(q.y) + sin((q.x + q.y) * 0.7);
    float ridges = smoothstep(-0.15, 0.25, abs(pattern) - 0.35);
    float veins = 1.0 - smoothstep(0.0, 0.22 + subBoost * 0.04, abs(pattern));

    vec3 abyssalBio = vec3(0.03, 0.16, 0.22);
    vec3 emeraldCoral = vec3(0.10, 0.85, 0.64);
    vec3 electricAqua = vec3(0.35, 0.95, 1.0);

    vec3 col = mix(abyssalBio, emeraldCoral * 0.55, ridges);
    col += electricAqua * pow(veins, 1.8) * (1.15 + subBoost * 0.32 + highBoost * 0.32);
    return col;
}
`,
  glslEvalExpr: 'evalTuringCoral(domainCoord, uCoralScale, uCoralRipple)',
  shadertoyMain: (mix, v) => {
    const scale = (v.scale ?? 10.0).toFixed(1);
    return `    // Layer 09: Bioluminescent Turing Coral
    vec2 cq = domainCoord * ${scale};
    for (int i = 0; i < 4; i++) cq += 0.42 * vec2(sin(cq.y * 1.35 + iTime), cos(cq.x * 1.35 - iTime * 0.85));
    float cPat = sin(cq.x) * cos(cq.y) + sin((cq.x + cq.y) * 0.7);
    col += vec3(0.15, 0.9, 0.75) * (1.0 - smoothstep(0.0, 0.22, abs(cPat))) * ${mix.toFixed(2)};`;
  },
};

/**
 * Layer 10: Kaleidoscopic IFS Sacred Mandala
 */
export const kaleidoscopeLayer: ShaderLayerDefinition = {
  id: 'kaleidoscope',
  name: '10. Kaleidoscopic IFS Mandala',
  shortName: 'Mandala',
  description:
    'Dihedral mirror-folded Iterative Function System (Kaliset inversion + rotation) generating hypnotic sacred geometric mandalas.',
  mixUniform: 'uKaleidoMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.35, phase: 0.9, min: 0.0, max: 0.92, decimals: 2 },
  subParams: [
    {
      key: 'folds',
      uniformName: 'uKaleidoFolds',
      label: 'Symmetry Folds',
      min: 4.0,
      max: 16.0,
      step: 2.0,
      defaultValue: 8.0,
      format: (v) => `${Math.round(v)}-Fold`,
      lfo: { freq: 0.21, phase: 1.2, min: 6.0, max: 14.0, decimals: 0 },
    },
    {
      key: 'zoom',
      uniformName: 'uKaleidoZoom',
      label: 'Mandala Zoom',
      min: 0.6,
      max: 3.2,
      step: 0.05,
      defaultValue: 1.45,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.43, phase: 2.5, min: 0.9, max: 2.4, decimals: 2 },
    },
    {
      key: 'morph',
      uniformName: 'uKaleidoMorph',
      label: 'Fractal Fold Drift',
      min: 0.2,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.0,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.56, phase: 0.4, min: 0.5, max: 2.0, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalKaleidoscopeIFS(vec2 p, float folds, float zoom, float morphSpeed) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.24;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    float r = length(p) * zoom;
    float a = atan(p.y, p.x);

    // Dihedral N-fold mirror symmetry
    float symFolds = max(4.0, floor(folds * 0.5 + 0.5) * 2.0);
    float sector = 6.2831853 / symFolds;
    a = mod(a, sector);
    a = abs(a - sector * 0.5);

    vec2 z = vec2(cos(a), sin(a)) * r;
    float t = iTime * 0.35 * morphSpeed;
    vec3 col = vec3(0.0);

    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float rotAng = t * 0.4 + fi * 0.52;
        mat2 rot = mat2(cos(rotAng), -sin(rotAng), sin(rotAng), cos(rotAng));
        z = abs(rot * z);
        // Kaliset sphere inversion fold
        float d2 = clamp(dot(z, z), 0.12, 2.5);
        z = z / d2 - vec2(0.72 + 0.14 * sin(t + fi), 0.58 + 0.14 * cos(t * 0.8 - fi));

        float line = exp(-abs(z.x * z.y) * 18.0);
        float ring = exp(-abs(length(z) - 0.65) * 12.0);
        vec3 pal = 0.5 + 0.5 * cos(fi * 0.85 + t * 1.4 + highBoost * 0.4 + vec3(0.1, 2.1, 4.2));
        col += pal * (line * 0.55 + ring * 0.45) * (1.0 - fi * 0.12);
    }

    return col * (0.85 + subBoost * 0.28 + highBoost * 0.25);
}
`,
  glslEvalExpr: 'evalKaleidoscopeIFS(p, uKaleidoFolds, uKaleidoZoom, uKaleidoMorph)',
  shadertoyHelper: (v) => {
    const folds = Math.round(v.folds ?? 8).toFixed(1);
    const zoom = (v.zoom ?? 1.45).toFixed(2);
    const morph = (v.morph ?? 1.0).toFixed(2);
    return `// Kaleidoscopic IFS Sacred Mandala
vec3 evalKaleidoscopeIFS(vec2 p) {
    float r = length(p) * ${zoom}, a = atan(p.y, p.x);
    float sector = 6.2831853 / ${folds};
    a = abs(mod(a, sector) - sector * 0.5);
    vec2 z = vec2(cos(a), sin(a)) * r;
    float t = iTime * ${(0.35 * Number(morph)).toFixed(2)};
    vec3 col = vec3(0.0);
    for (float i = 0.0; i < 6.0; i++) {
        float ang = t * 0.4 + i * 0.52;
        z = abs(mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * z);
        z = z / clamp(dot(z, z), 0.12, 2.5) - vec2(0.72 + 0.14 * sin(t + i), 0.58 + 0.14 * cos(t * 0.8 - i));
        vec3 pal = 0.5 + 0.5 * cos(i * 0.85 + t * 1.4 + vec3(0.1, 2.1, 4.2));
        col += pal * (exp(-abs(z.x * z.y) * 18.0) * 0.55 + exp(-abs(length(z) - 0.65) * 12.0) * 0.45) * (1.0 - i * 0.12);
    }
    return col * 0.85;
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 10: Kaleidoscopic IFS Sacred Mandala
    col += evalKaleidoscopeIFS(p) * ${mix.toFixed(2)};`,
};

/**
 * Layer 12: Psychedelic Iridescent Ferrofluid Oil
 */
export const liquidOilLayer: ShaderLayerDefinition = {
  id: 'liquidoil',
  name: '11. Iridescent Ferrofluid Oil',
  shortName: 'Liquid Oil',
  description:
    'Iterative domain-folded fluid advection mapped through thin-film soap-bubble spectral interference.',
  mixUniform: 'uLiquidOilMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.41, phase: 3.3, min: 0.0, max: 0.88, decimals: 2 },
  subParams: [
    {
      key: 'density',
      uniformName: 'uLiquidDensity',
      label: 'Wave Density',
      min: 1.5,
      max: 8.0,
      step: 0.2,
      defaultValue: 3.6,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.34, phase: 0.7, min: 2.2, max: 5.8, decimals: 1 },
    },
    {
      key: 'viscosity',
      uniformName: 'uLiquidViscosity',
      label: 'Swirl Viscosity',
      min: 0.3,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.15,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.49, phase: 1.9, min: 0.6, max: 1.9, decimals: 2 },
    },
    {
      key: 'iridescence',
      uniformName: 'uLiquidIridescence',
      label: 'Film Iridescence',
      min: 1.0,
      max: 8.0,
      step: 0.2,
      defaultValue: 4.2,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.57, phase: 4.1, min: 2.0, max: 6.8, decimals: 1 },
    },
  ],
  glslFunction: `
vec3 evalLiquidOil(vec2 coord, float density, float viscosity, float iridescence) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.24;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.26;

    vec2 q = coord * density;
    float t = iTime * 0.45;
    float dynVisc = viscosity;

    for (int i = 1; i < 6; i++) {
        float fi = float(i);
        q.x += (dynVisc / fi) * sin(fi * q.y + t + 0.3 * fi);
        q.y += (dynVisc / fi) * cos(fi * q.x - t * 0.85 + 0.5 * fi);
    }

    float filmThickness = sin(q.x + q.y) * 0.5 + 0.5;
    float ridge = smoothstep(0.0, 0.15, abs(sin(q.x * 2.0) * cos(q.y * 2.0)));

    // Thin-film spectral interference
    vec3 filmCol = 0.5 + 0.5 * cos(filmThickness * iridescence + iTime * 0.6 + highBoost * 0.5 + vec3(0.0, 1.8, 3.6));
    vec3 darkFerro = vec3(0.03, 0.04, 0.07);
    return mix(darkFerro, filmCol * (1.35 + subBoost * 0.28), ridge * (0.35 + 0.65 * filmThickness));
}
`,
  glslEvalExpr: 'evalLiquidOil(domainCoord, uLiquidDensity, uLiquidViscosity, uLiquidIridescence)',
  shadertoyHelper: (v) => {
    const dens = (v.density ?? 3.6).toFixed(2);
    const visc = (v.viscosity ?? 1.15).toFixed(2);
    const irid = (v.iridescence ?? 4.2).toFixed(2);
    return `// Iridescent Ferrofluid Oil Interference
vec3 evalLiquidOil(vec2 coord) {
    vec2 q = coord * ${dens};
    float t = iTime * 0.45;
    for (float i = 1.0; i < 6.0; i++) {
        q.x += (${visc} / i) * sin(i * q.y + t + 0.3 * i);
        q.y += (${visc} / i) * cos(i * q.x - t * 0.85 + 0.5 * i);
    }
    float film = sin(q.x + q.y) * 0.5 + 0.5;
    float ridge = smoothstep(0.0, 0.15, abs(sin(q.x * 2.0) * cos(q.y * 2.0)));
    vec3 filmCol = 0.5 + 0.5 * cos(film * ${irid} + iTime * 0.6 + vec3(0.0, 1.8, 3.6));
    return mix(vec3(0.03, 0.04, 0.07), filmCol * 1.35, ridge * (0.35 + 0.65 * film));
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 11: Iridescent Ferrofluid Oil
    col += evalLiquidOil(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * Layer 13: Hyperbolic 3D Gyroid Labyrinth
 */
export const gyroidLayer: ShaderLayerDefinition = {
  id: 'gyroid',
  name: '12. Hyperbolic 3D Gyroid Labyrinth',
  shortName: 'Gyroid',
  description:
    'Volumetric 3D minimal surface (sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)) sliced through hyperbolic space with glowing neon contours.',
  mixUniform: 'uGyroidMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.38, phase: 2.1, min: 0.0, max: 0.9, decimals: 2 },
  subParams: [
    {
      key: 'freq',
      uniformName: 'uGyroidFreq',
      label: 'Gyroid Scale',
      min: 2.0,
      max: 12.0,
      step: 0.25,
      defaultValue: 5.5,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.27, phase: 1.5, min: 3.5, max: 8.5, decimals: 2 },
    },
    {
      key: 'speed',
      uniformName: 'uGyroidSpeed',
      label: 'Z-Slice Speed',
      min: 0.1,
      max: 2.5,
      step: 0.05,
      defaultValue: 0.9,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.45, phase: 0.2, min: 0.4, max: 1.8, decimals: 2 },
    },
  ],
  glslFunction: `
float sdGyroid(vec3 p, float scale) {
    p *= scale;
    return dot(sin(p), cos(p.yzx)) / scale;
}

vec3 evalGyroidLabyrinth(vec2 p, float freq, float sliceSpeed) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.24;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    // Hyperbolic dome projection into 3D space
    float r2 = dot(p, p);
    vec3 pos = vec3(p * (1.8 / (1.0 + r2 * 0.65)), iTime * 0.45 * sliceSpeed);

    // Multi-slice volumetric raymarch (6 steps)
    vec3 col = vec3(0.0);
    vec3 rayDir = normalize(vec3(p, 0.85));

    float t = 0.0;
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec3 samplePos = pos + rayDir * t;
        float g1 = sdGyroid(samplePos, freq);
        float g2 = sdGyroid(samplePos + vec3(0.0, 0.0, iTime * 0.2), freq * 2.03);
        float d = abs(g1 - g2 * 0.28);

        float glow = 0.018 / (d + 0.015);
        float contour = smoothstep(0.04, 0.0, abs( fract(g1 * freq * 1.5) - 0.5 ));

        vec3 sliceColor = mix(vec3(0.08, 0.82, 0.72), vec3(0.98, 0.42, 0.65), fi / 6.0);
        col += sliceColor * (glow * (0.22 + subBoost * 0.1) + contour * (0.35 + highBoost * 0.15)) * exp(-t * 0.85);
        t += max(0.08, d * 0.65);
    }

    return col;
}
`,
  glslEvalExpr: 'evalGyroidLabyrinth(domainCoord, uGyroidFreq, uGyroidSpeed)',
  shadertoyHelper: (v) => {
    const freq = (v.freq ?? 5.5).toFixed(2);
    const spd = (v.speed ?? 0.9).toFixed(2);
    return `// Hyperbolic 3D Gyroid Labyrinth
vec3 evalGyroidLabyrinth(vec2 p) {
    vec3 pos = vec3(p * (1.8 / (1.0 + dot(p, p) * 0.65)), iTime * ${(0.45 * Number(spd)).toFixed(2)});
    vec3 rayDir = normalize(vec3(p, 0.85)), col = vec3(0.0);
    float t = 0.0, freq = ${freq};
    for (float i = 0.0; i < 6.0; i++) {
        vec3 sp = pos + rayDir * t;
        float g1 = dot(sin(sp * freq), cos(sp.yzx * freq)) / freq;
        float g2 = dot(sin(sp * freq * 2.03), cos(sp.yzx * freq * 2.03)) / (freq * 2.03);
        float d = abs(g1 - g2 * 0.28);
        vec3 sliceCol = mix(vec3(0.08, 0.82, 0.72), vec3(0.98, 0.42, 0.65), i / 6.0);
        col += sliceCol * (0.018 / (d + 0.015) * 0.22) * exp(-t * 0.85);
        t += max(0.08, d * 0.65);
    }
    return col;
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 12: Hyperbolic 3D Gyroid Labyrinth
    col += evalGyroidLabyrinth(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * Layer 14: Hypnotic Op-Art Moiré Interference Matrix
 */
export const moireLayer: ShaderLayerDefinition = {
  id: 'moire',
  name: '13. Op-Art Moiré Interference',
  shortName: 'Moiré',
  description:
    'Counter-rotating logarithmic spirals and shifted Bessel wave rings creating shimmering optical Moiré beats.',
  mixUniform: 'uMoireMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.31, phase: 4.8, min: 0.0, max: 0.82, decimals: 2 },
  subParams: [
    {
      key: 'rings',
      uniformName: 'uMoireRings',
      label: 'Ring Frequency',
      min: 15.0,
      max: 80.0,
      step: 1.0,
      defaultValue: 42.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.29, phase: 0.5, min: 24.0, max: 64.0, decimals: 0 },
    },
    {
      key: 'arms',
      uniformName: 'uMoireArms',
      label: 'Spiral Arms',
      min: 2.0,
      max: 24.0,
      step: 2.0,
      defaultValue: 10.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.23, phase: 2.1, min: 4.0, max: 18.0, decimals: 0 },
    },
  ],
  glslFunction: `
vec3 evalMoireInterference(vec2 p, vec2 m, float ringFreq, float spiralArms) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.22;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    float arms = max(2.0, floor(spiralArms * 0.5 + 0.5) * 2.0);
    vec2 offset = vec2(cos(iTime * 0.7), sin(iTime * 0.55)) * 0.14 + m * 0.35;

    vec2 p1 = p - offset * 0.5;
    vec2 p2 = p + offset * 0.5;

    float r1 = length(p1), a1 = atan(p1.y, p1.x);
    float r2 = length(p2), a2 = atan(p2.y, p2.x);

    float wave1 = sin(r1 * ringFreq + a1 * arms - iTime * 2.2);
    float wave2 = sin(r2 * (ringFreq * 1.04) - a2 * arms + iTime * 1.8);

    // Multiplicative & additive interference beat
    float moire = wave1 * wave2;
    float fringe = smoothstep(-0.2, 0.85, moire);
    float beat = 0.5 + 0.5 * cos((r1 - r2) * ringFreq * 0.8 + iTime * 1.5);

    vec3 neonGold = vec3(1.0, 0.84, 0.32);
    vec3 cyberViolet = vec3(0.55, 0.18, 0.92);
    vec3 electricCyan = vec3(0.12, 0.88, 0.96);

    vec3 hue = mix(cyberViolet, electricCyan, beat);
    hue = mix(hue, neonGold, smoothstep(0.65 - highBoost * 0.15, 1.0, fringe));
    return hue * fringe * (1.15 + subBoost * 0.25 + highBoost * 0.22);
}
`,
  glslEvalExpr: 'evalMoireInterference(p, m, uMoireRings, uMoireArms)',
  shadertoyHelper: (v) => {
    const rings = (v.rings ?? 42.0).toFixed(1);
    const arms = Math.round(v.arms ?? 10.0).toFixed(1);
    return `// Op-Art Moire Interference
vec3 evalMoireInterference(vec2 p, vec2 m) {
    vec2 off = vec2(cos(iTime * 0.7), sin(iTime * 0.55)) * 0.14 + m * 0.35;
    vec2 p1 = p - off * 0.5, p2 = p + off * 0.5;
    float w1 = sin(length(p1) * ${rings} + atan(p1.y, p1.x) * ${arms} - iTime * 2.2);
    float w2 = sin(length(p2) * (${rings} * 1.04) - atan(p2.y, p2.x) * ${arms} + iTime * 1.8);
    float fringe = smoothstep(-0.2, 0.85, w1 * w2);
    vec3 hue = mix(vec3(0.55, 0.18, 0.92), vec3(0.12, 0.88, 0.96), 0.5 + 0.5 * cos((length(p1) - length(p2)) * ${rings} * 0.8));
    return mix(hue, vec3(1.0, 0.84, 0.32), smoothstep(0.65, 1.0, fringe)) * fringe * 1.15;
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 13: Op-Art Moire Interference
    col += evalMoireInterference(p, m) * ${mix.toFixed(2)};`,
};

/**
 * Layer 15: Quasicrystal Penrose Light Web
 */
export const quantumWebLayer: ShaderLayerDefinition = {
  id: 'quantumweb',
  name: '14. Quasicrystal Penrose Light Web',
  shortName: 'Quasicrystal',
  description:
    '7-wave plane-wave superposition at golden-ratio angles creating aperiodic Penrose quasicrystal light lattices.',
  mixUniform: 'uQuantumMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.43, phase: 1.4, min: 0.0, max: 0.88, decimals: 2 },
  subParams: [
    {
      key: 'scale',
      uniformName: 'uQuantumScale',
      label: 'Crystal Frequency',
      min: 6.0,
      max: 36.0,
      step: 0.5,
      defaultValue: 18.0,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.33, phase: 2.9, min: 10.0, max: 28.0, decimals: 1 },
    },
    {
      key: 'sharpness',
      uniformName: 'uQuantumSharpness',
      label: 'Filament Focus',
      min: 1.0,
      max: 6.0,
      step: 0.1,
      defaultValue: 2.8,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.51, phase: 0.8, min: 1.6, max: 4.8, decimals: 1 },
    },
  ],
  glslFunction: `
vec3 evalQuasicrystalWeb(vec2 coord, float scale, float sharpness) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    vec2 q = coord * scale;
    float t = iTime * 0.8;

    // 7-fold plane wave superposition (Quasicrystal theorem)
    float sum = 0.0;
    for (int i = 0; i < 7; i++) {
        float ang = float(i) * (3.14159265 / 7.0);
        vec2 dir = vec2(cos(ang), sin(ang));
        sum += cos(dot(q, dir) + t * (mod(float(i), 2.0) * 2.0 - 1.0));
    }

    float norm = abs(sum / 7.0);
    float web = pow(clamp(1.0 - norm * 1.8, 0.0, 1.0), sharpness);
    float nodes = pow(clamp(norm * 1.35, 0.0, 1.0), 3.0);

    vec3 filamentCol = vec3(0.22, 0.92, 0.98) * web * (1.6 + highBoost * 0.4);
    vec3 nodeCol = vec3(1.0, 0.62, 0.24) * nodes * (1.4 + subBoost * 0.45);
    return filamentCol + nodeCol;
}
`,
  glslEvalExpr: 'evalQuasicrystalWeb(domainCoord, uQuantumScale, uQuantumSharpness)',
  shadertoyHelper: (v) => {
    const scale = (v.scale ?? 18.0).toFixed(1);
    const sharp = (v.sharpness ?? 2.8).toFixed(1);
    return `// Quasicrystal Penrose Light Web (7-Wave Superposition)
vec3 evalQuasicrystalWeb(vec2 coord) {
    vec2 q = coord * ${scale};
    float sum = 0.0, t = iTime * 0.8;
    for (float i = 0.0; i < 7.0; i++) {
        float ang = i * (3.14159265 / 7.0);
        sum += cos(dot(q, vec2(cos(ang), sin(ang))) + t * (mod(i, 2.0) * 2.0 - 1.0));
    }
    float norm = abs(sum / 7.0);
    return vec3(0.22, 0.92, 0.98) * pow(clamp(1.0 - norm * 1.8, 0.0, 1.0), ${sharp}) * 1.6
         + vec3(1.0, 0.62, 0.24) * pow(clamp(norm * 1.35, 0.0, 1.0), 3.0) * 1.4;
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 14: Quasicrystal Penrose Light Web
    col += evalQuasicrystalWeb(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * Layer 16: Chladni Acoustic Cymatics Plate (Audio-Reactive Nodal Geometry)
 */
export const chladniLayer: ShaderLayerDefinition = {
  id: 'chladni',
  name: '15. Chladni Acoustic Cymatics',
  shortName: 'Cymatics',
  description:
    'Resonant acoustic standing-wave nodal plate (cos(n*pi*x)cos(m*pi*y) - cos(m*pi*x)cos(n*pi*y)) whose harmonic modes morph with live sub-bass and mid frequencies.',
  mixUniform: 'uChladniMix',
  defaultMix: 0.55,
  lfoMix: { freq: 0.36, phase: 1.2, min: 0.15, max: 0.92, decimals: 2 },
  subParams: [
    {
      key: 'modeN',
      uniformName: 'uChladniModeN',
      label: 'Harmonic Mode N',
      min: 1.5,
      max: 9.0,
      step: 0.25,
      defaultValue: 3.5,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.24, phase: 0.3, min: 2.0, max: 7.5, decimals: 2 },
    },
    {
      key: 'modeM',
      uniformName: 'uChladniModeM',
      label: 'Harmonic Mode M',
      min: 1.5,
      max: 9.0,
      step: 0.25,
      defaultValue: 5.5,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.31, phase: 1.9, min: 2.5, max: 8.0, decimals: 2 },
    },
    {
      key: 'sharpness',
      uniformName: 'uChladniSharpness',
      label: 'Nodal Ridge Focus',
      min: 6.0,
      max: 32.0,
      step: 1.0,
      defaultValue: 18.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.48, phase: 2.8, min: 10.0, max: 26.0, decimals: 0 },
    },
  ],
  glslFunction: `
vec3 evalChladniCymatics(vec2 coord, float modeN, float modeM, float sharpness) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float midBoost = clamp(uAudioMid * uAudioReactivity, 0.0, 1.0) * 0.25;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    // Smooth harmonic eigenmode drift without fracturing nodal lines
    float n = modeN + sin(iTime * 0.22) * 0.45;
    float m = modeM + cos(iTime * 0.17) * 0.45;

    vec2 p = coord * 3.14159265 * 0.85;
    float w1 = cos(n * p.x) * cos(m * p.y) - cos(m * p.x) * cos(n * p.y);
    float w2 = sin((n + 1.0) * p.x) * sin((m - 0.5) * p.y) + sin((m - 0.5) * p.x) * sin((n + 1.0) * p.y);

    float wave = mix(w1, w2, 0.35 + 0.2 * sin(iTime * 0.35));
    float dNode = abs(wave);

    // Sharp glowing nodal sand lines + harmonic overtone aura
    float nodalLine = exp(-dNode * sharpness);
    float overtoneHalo = 0.035 / (dNode + 0.035);

    vec3 goldSand = vec3(1.0, 0.82, 0.38);
    vec3 cyanHarmonic = vec3(0.14, 0.88, 0.98);
    vec3 crimsonAntinode = vec3(0.92, 0.24, 0.52);

    vec3 col = mix(cyanHarmonic, goldSand, nodalLine) * (nodalLine * (1.25 + subBoost * 0.35) + overtoneHalo * 0.42);
    col += crimsonAntinode * smoothstep(0.65, 1.4, dNode) * (0.22 + highBoost * 0.25);
    return col;
}
`,
  glslEvalExpr:
    'evalChladniCymatics(domainCoord, uChladniModeN, uChladniModeM, uChladniSharpness)',
  shadertoyHelper: (v) => {
    const n = (v.modeN ?? 3.5).toFixed(2);
    const m = (v.modeM ?? 5.5).toFixed(2);
    const sh = (v.sharpness ?? 18.0).toFixed(1);
    return `// Chladni Acoustic Cymatics Standing-Wave Plate
vec3 evalChladniCymatics(vec2 coord) {
    float n = ${n} + sin(iTime * 0.25) * 0.65;
    float m = ${m} + cos(iTime * 0.19) * 0.65;
    vec2 p = coord * 2.67;
    float w1 = cos(n * p.x) * cos(m * p.y) - cos(m * p.x) * cos(n * p.y);
    float dNode = abs(w1);
    float nodal = exp(-dNode * ${sh});
    return mix(vec3(0.14, 0.88, 0.98), vec3(1.0, 0.82, 0.38), nodal) * (nodal * 1.35 + 0.035 / (dNode + 0.035) * 0.45);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 15: Chladni Acoustic Cymatics
    col += evalChladniCymatics(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * Layer 17: Clifford Strange Attractor Phase-Space Ribbon
 */
export const attractorLayer: ShaderLayerDefinition = {
  id: 'attractor',
  name: '16. Clifford Strange Attractor',
  shortName: 'Attractor',
  description:
    'Chaotic phase-space flow field iterating Clifford strange attractor equations (sin(a*y) + c*cos(a*x)) into silky bioluminescent ribbons.',
  mixUniform: 'uAttractorMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.34, phase: 2.3, min: 0.0, max: 0.9, decimals: 2 },
  subParams: [
    {
      key: 'chaos',
      uniformName: 'uAttractorChaos',
      label: 'Attractor Parameter a',
      min: 1.1,
      max: 2.6,
      step: 0.05,
      defaultValue: 1.75,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.26, phase: 0.9, min: 1.3, max: 2.3, decimals: 2 },
    },
    {
      key: 'fold',
      uniformName: 'uAttractorFold',
      label: 'Phase Fold Gain',
      min: 0.4,
      max: 2.2,
      step: 0.05,
      defaultValue: 1.15,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.41, phase: 3.1, min: 0.65, max: 1.85, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalCliffordAttractor(vec2 coord, float paramA, float foldGain) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.22;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    vec2 z = coord * 2.2;
    float a = paramA + 0.18 * sin(iTime * 0.28);
    float b = 1.82 + 0.18 * cos(iTime * 0.24);
    float c = 0.95 + 0.15 * sin(iTime * 0.19);
    float d = 1.35 + 0.15 * cos(iTime * 0.21);

    float minTrap = 10.0;
    float orbitLength = 0.0;

    for (int i = 0; i < 6; i++) {
        vec2 nextZ = vec2(
            sin(a * z.y) + c * cos(a * z.x),
            sin(b * z.x) + d * cos(b * z.y)
        ) * foldGain;
        float stepDist = length(nextZ - z);
        orbitLength += stepDist;
        minTrap = min(minTrap, abs(nextZ.x * nextZ.y));
        z = mix(z, nextZ, 0.68);
    }

    float filament = exp(-minTrap * 14.0);
    float caustic = 0.5 + 0.5 * sin(orbitLength * 2.2 - iTime * 1.4);

    vec3 neonEmerald = vec3(0.12, 0.95, 0.68);
    vec3 solarAmber = vec3(1.0, 0.68, 0.22);
    vec3 deepIndigo = vec3(0.16, 0.08, 0.42);

    vec3 col = mix(deepIndigo, neonEmerald, caustic) * (0.35 + 0.65 * filament);
    col += solarAmber * pow(filament, 2.2) * (1.15 + highBoost * 0.35);
    return col;
}
`,
  glslEvalExpr: 'evalCliffordAttractor(domainCoord, uAttractorChaos, uAttractorFold)',
  shadertoyHelper: (v) => {
    const a = (v.chaos ?? 1.75).toFixed(2);
    const fold = (v.fold ?? 1.15).toFixed(2);
    return `// Clifford Strange Attractor Phase-Space Ribbon
vec3 evalCliffordAttractor(vec2 coord) {
    vec2 z = coord * 2.2;
    float a = ${a} + 0.22 * sin(iTime * 0.31), b = 1.82 + 0.22 * cos(iTime * 0.27);
    float minTrap = 10.0, orbitLen = 0.0;
    for (float i = 0.0; i < 6.0; i++) {
        vec2 nz = vec2(sin(a * z.y) + 0.95 * cos(a * z.x), sin(b * z.x) + 1.35 * cos(b * z.y)) * ${fold};
        orbitLen += length(nz - z);
        minTrap = min(minTrap, abs(nz.x * nz.y));
        z = mix(z, nz, 0.68);
    }
    float fil = exp(-minTrap * 14.0);
    vec3 col = mix(vec3(0.16, 0.08, 0.42), vec3(0.12, 0.95, 0.68), 0.5 + 0.5 * sin(orbitLen * 2.2 - iTime * 1.4)) * (0.35 + 0.65 * fil);
    return col + vec3(1.0, 0.68, 0.22) * pow(fil, 2.2) * 1.2;
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 16: Clifford Strange Attractor
    col += evalCliffordAttractor(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * Layer 18: 4D Hypersphere Hopf Fibration & Clifford Torus
 */
export const tesseractLayer: ShaderLayerDefinition = {
  id: 'tesseract',
  name: '17. 4D Hypersphere Hopf Fibration',
  shortName: '4D Hopf',
  description:
    'Stereographic projection of linked 4D Hopf fibration circles and Clifford tori rotating through R4 hyperspace.',
  mixUniform: 'uTesseractMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.32, phase: 0.6, min: 0.0, max: 0.92, decimals: 2 },
  subParams: [
    {
      key: 'spin4d',
      uniformName: 'uTesseractSpin',
      label: '4D Clifford Rotation',
      min: 0.2,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.0,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.35, phase: 1.4, min: 0.45, max: 2.0, decimals: 2 },
    },
    {
      key: 'fibers',
      uniformName: 'uTesseractFibers',
      label: 'Hopf Fiber Count',
      min: 4.0,
      max: 16.0,
      step: 2.0,
      defaultValue: 8.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.22, phase: 2.7, min: 6.0, max: 14.0, decimals: 0 },
    },
  ],
  glslFunction: `
vec3 evalHopfFibration4D(vec2 p, float spin4d, float fiberCount) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.24;
    float midBoost = clamp(uAudioMid * uAudioReactivity, 0.0, 1.0) * 0.24;

    // Inverse stereographic lift from R2/R3 into S3 unit hypersphere in R4
    vec2 q = p * 1.55;
    float r2 = dot(q, q);
    float denom = 1.0 + r2;
    vec4 s4 = vec4(
        2.0 * q.x / denom,
        2.0 * q.y / denom,
        (1.0 - r2) / denom,
        sin(length(q) * 3.0 - iTime * 0.8) * 0.45
    );
    s4 = normalize(s4);

    // Smooth double-isoclinic 4D Clifford rotation in (X,W) and (Y,Z) planes
    float t1 = iTime * 0.55 * spin4d;
    float t2 = iTime * 0.38 * spin4d;
    float c1 = cos(t1), s1 = sin(t1);
    float c2 = cos(t2), s2 = sin(t2);

    vec4 rot4 = vec4(
        s4.x * c1 - s4.w * s1,
        s4.y * c2 - s4.z * s2,
        s4.y * s2 + s4.z * c2,
        s4.x * s1 + s4.w * c1
    );

    // Hopf map S3 -> S2 invariants
    float eta = atan(length(rot4.zw), length(rot4.xy));
    float xi1 = atan(rot4.y, rot4.x);
    float xi2 = atan(rot4.w, rot4.z);

    float fibers = max(4.0, floor(fiberCount * 0.5 + 0.5) * 2.0);
    float torusWalls = abs(sin(eta * 4.0));
    float linkedRings = abs(sin((xi1 + xi2) * fibers * 0.5) * cos((xi1 - xi2) * fibers * 0.5));

    float fiberGlow = 0.04 / (linkedRings * torusWalls + 0.028);
    float meridian = smoothstep(0.12, 0.0, abs(sin(eta * 6.0)));

    vec3 holoCyan = vec3(0.18, 0.88, 1.0);
    vec3 hyperGold = vec3(1.0, 0.72, 0.25);
    vec3 plasmaViolet = vec3(0.62, 0.22, 0.96);

    vec3 col = mix(plasmaViolet, holoCyan, 0.5 + 0.5 * cos(eta * 4.0)) * fiberGlow * (0.4 + subBoost * 0.14);
    col += hyperGold * (meridian * 0.65 + smoothstep(1.2, 2.8, fiberGlow) * (0.42 + midBoost * 0.25));
    return col;
}
`,
  glslEvalExpr: 'evalHopfFibration4D(p, uTesseractSpin, uTesseractFibers)',
  shadertoyHelper: (v) => {
    const spin = (v.spin4d ?? 1.0).toFixed(2);
    const fib = Math.round(v.fibers ?? 8.0).toFixed(1);
    return `// 4D Hypersphere Hopf Fibration & Clifford Torus
vec3 evalHopfFibration4D(vec2 p) {
    vec2 q = p * 1.55;
    float r2 = dot(q, q), den = 1.0 + r2;
    vec4 s4 = normalize(vec4(2.0 * q / den, (1.0 - r2) / den, sin(length(q) * 3.0 - iTime * 0.8) * 0.45));
    float t1 = iTime * ${(0.55 * Number(spin)).toFixed(2)}, t2 = iTime * ${(0.38 * Number(spin)).toFixed(2)};
    vec4 r4 = vec4(s4.x * cos(t1) - s4.w * sin(t1), s4.y * cos(t2) - s4.z * sin(t2), s4.y * sin(t2) + s4.z * cos(t2), s4.x * sin(t1) + s4.w * cos(t1));
    float eta = atan(length(r4.zw), length(r4.xy)), xi1 = atan(r4.y, r4.x), xi2 = atan(r4.w, r4.z);
    float glow = 0.04 / (abs(sin((xi1 + xi2) * ${fib} * 0.5) * cos((xi1 - xi2) * ${fib} * 0.5)) * abs(sin(eta * 4.0)) + 0.028);
    return mix(vec3(0.62, 0.22, 0.96), vec3(0.18, 0.88, 1.0), 0.5 + 0.5 * cos(eta * 4.0)) * glow * 0.42;
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 17: 4D Hypersphere Hopf Fibration
    col += evalHopfFibration4D(p) * ${mix.toFixed(2)};`,
};

/**
 * Layer 18: Apollonian Gasket Kleinian Sphere Packing
 */
export const apollonianLayer: ShaderLayerDefinition = {
  id: 'apollonian',
  name: '18. Apollonian Kleinian Fractal',
  shortName: 'Apollonian',
  description:
    'Recursive Kleinian circle-inversion lattice (p / dot(p,p)) generating infinitely nested Apollonian sphere packings.',
  mixUniform: 'uApollonianMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.37, phase: 3.7, min: 0.0, max: 0.88, decimals: 2 },
  subParams: [
    {
      key: 'scale',
      uniformName: 'uApollonianScale',
      label: 'Inversion Zoom',
      min: 0.8,
      max: 3.2,
      step: 0.05,
      defaultValue: 1.65,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.29, phase: 1.1, min: 1.1, max: 2.5, decimals: 2 },
    },
    {
      key: 'fold',
      uniformName: 'uApollonianFold',
      label: 'Kleinian Fold Offset',
      min: 0.9,
      max: 1.8,
      step: 0.02,
      defaultValue: 1.28,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.44, phase: 0.4, min: 1.05, max: 1.55, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalApollonianGasket(vec2 coord, float zoomScale, float foldOffset) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.2;
    vec3 z = vec3(coord * zoomScale, 0.65 + 0.22 * sin(iTime * 0.32) + subBoost * 0.03);
    float scaleAcc = 1.0;

    for (int i = 0; i < 7; i++) {
        z = -1.0 + 2.0 * fract(0.5 * z + 0.5);
        float r2 = dot(z, z);
        float k = max(foldOffset / max(r2, 0.08), 1.0);
        z *= k;
        scaleAcc *= k;
    }

    float d = length(z.xy) / scaleAcc;
    float ridges = smoothstep(0.035, 0.0, abs(d - 0.012));
    float filGlow = 0.0045 / (d + 0.0035);

    vec3 crystalTeal = vec3(0.10, 0.86, 0.82);
    vec3 warmGold = vec3(1.0, 0.78, 0.32);
    vec3 deepObsidian = vec3(0.05, 0.10, 0.22);

    float phase = log(scaleAcc) * 0.35 - iTime * 0.5;
    vec3 hue = mix(crystalTeal, warmGold, 0.5 + 0.5 * sin(phase));
    return mix(deepObsidian, hue, clamp(filGlow * 0.45 + ridges * 0.85, 0.0, 1.5));
}
`,
  glslEvalExpr: 'evalApollonianGasket(domainCoord, uApollonianScale, uApollonianFold)',
  shadertoyHelper: (v) => {
    const sc = (v.scale ?? 1.65).toFixed(2);
    const fold = (v.fold ?? 1.28).toFixed(2);
    return `// Apollonian Gasket Kleinian Sphere Packing
vec3 evalApollonianGasket(vec2 coord) {
    vec3 z = vec3(coord * ${sc}, 0.65 + 0.25 * sin(iTime * 0.35));
    float scaleAcc = 1.0;
    for (float i = 0.0; i < 7.0; i++) {
        z = -1.0 + 2.0 * fract(0.5 * z + 0.5);
        float k = max(${fold} / max(dot(z, z), 0.08), 1.0);
        z *= k; scaleAcc *= k;
    }
    float d = length(z.xy) / scaleAcc;
    vec3 hue = mix(vec3(0.10, 0.86, 0.82), vec3(1.0, 0.78, 0.32), 0.5 + 0.5 * sin(log(scaleAcc) * 0.35 - iTime * 0.5));
    return hue * clamp(0.0045 / (d + 0.0035) * 0.45 + smoothstep(0.035, 0.0, abs(d - 0.012)) * 0.85, 0.0, 1.5);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 18: Apollonian Kleinian Fractal
    col += evalApollonianGasket(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * Layer 19: Lissajous Vector Laser Oscilloscope
 */
export const lissajousLayer: ShaderLayerDefinition = {
  id: 'lissajous',
  name: '19. Lissajous Laser Oscilloscope',
  shortName: 'Lissajous',
  description:
    'Vector CRT phosphor laser harmonic curves with real-time audio-reactive frequency modulation and persistence bloom.',
  mixUniform: 'uLissajousMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.46, phase: 1.6, min: 0.0, max: 0.9, decimals: 2 },
  subParams: [
    {
      key: 'ratioX',
      uniformName: 'uLissajousRatioX',
      label: 'Harmonic Ratio X',
      min: 1.0,
      max: 8.0,
      step: 1.0,
      defaultValue: 3.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.19, phase: 0.5, min: 2.0, max: 7.0, decimals: 0 },
    },
    {
      key: 'ratioY',
      uniformName: 'uLissajousRatioY',
      label: 'Harmonic Ratio Y',
      min: 1.0,
      max: 8.0,
      step: 1.0,
      defaultValue: 4.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.23, phase: 2.2, min: 2.0, max: 7.0, decimals: 0 },
    },
    {
      key: 'glow',
      uniformName: 'uLissajousGlow',
      label: 'Phosphor Bloom',
      min: 0.5,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.35,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.52, phase: 1.1, min: 0.8, max: 2.1, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalLissajousLaser(vec2 p, float ratioX, float ratioY, float bloom) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.22;
    float midBoost = clamp(uAudioMid * uAudioReactivity, 0.0, 1.0) * 0.22;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    vec2 q = p * 1.85;
    float rx = max(1.0, floor(ratioX + 0.5));
    float ry = max(1.0, floor(ratioY + 0.5));

    // Smooth harmonic Lissajous field
    float delta = iTime * 0.85;
    float field1 = sin(q.x * rx * 2.2 + delta) - sin(q.y * ry * 2.2 - iTime * 0.6);
    float field2 = cos(q.x * ry * 2.2 - delta * 0.7) - cos(q.y * rx * 2.2 + iTime * 0.9);

    // Parametric rotating vector laser ring
    float r = length(q);
    float a = atan(q.y, q.x);
    float laserOrbit = abs(r - (0.62 + 0.22 * sin(a * rx + iTime * 2.4) * cos(a * ry - iTime * 1.8)));

    float d1 = abs(field1);
    float d2 = abs(field2);

    float beam1 = 0.018 * bloom / (d1 + 0.018);
    float beam2 = 0.014 * bloom / (d2 + 0.02);
    float orbitBeam = 0.016 * bloom / (laserOrbit + 0.014);

    vec3 crtEmerald = vec3(0.18, 1.0, 0.58);
    vec3 laserCyan = vec3(0.22, 0.92, 1.0);
    vec3 amberSpark = vec3(1.0, 0.76, 0.28);

    vec3 col = crtEmerald * beam1 * 0.55 + laserCyan * beam2 * 0.55;
    col += amberSpark * orbitBeam * (0.85 + highBoost * 0.35);
    return col;
}
`,
  glslEvalExpr: 'evalLissajousLaser(p, uLissajousRatioX, uLissajousRatioY, uLissajousGlow)',
  shadertoyHelper: (v) => {
    const rx = Math.round(v.ratioX ?? 3.0).toFixed(1);
    const ry = Math.round(v.ratioY ?? 4.0).toFixed(1);
    const gl = (v.glow ?? 1.35).toFixed(2);
    return `// Lissajous Vector Laser Oscilloscope
vec3 evalLissajousLaser(vec2 p) {
    vec2 q = p * 1.85;
    float d1 = abs(sin(q.x * ${rx} * 2.2 + iTime * 0.85) - sin(q.y * ${ry} * 2.2 - iTime * 0.6));
    float d2 = abs(cos(q.x * ${ry} * 2.2 - iTime * 0.6) - cos(q.y * ${rx} * 2.2 + iTime * 0.9));
    float orb = abs(length(q) - (0.62 + 0.22 * sin(atan(q.y, q.x) * ${rx} + iTime * 2.4) * cos(atan(q.y, q.x) * ${ry} - iTime * 1.8)));
    return vec3(0.18, 1.0, 0.58) * (0.018 * ${gl} / (d1 + 0.016)) * 0.55
         + vec3(0.22, 0.92, 1.0) * (0.014 * ${gl} / (d2 + 0.018)) * 0.55
         + vec3(1.0, 0.76, 0.28) * (0.016 * ${gl} / (orb + 0.012)) * 0.85;
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 19: Lissajous Laser Oscilloscope
    col += evalLissajousLaser(p) * ${mix.toFixed(2)};`,
};

/**
 * Layer 20: Relativistic Cherenkov Hex-Warp Matrix
 */
export const cherenkovLayer: ShaderLayerDefinition = {
  id: 'cherenkov',
  name: '20. Cherenkov Hex-Warp Matrix',
  shortName: 'Cherenkov',
  description:
    'Hexagonal quantum reactor containment lattice with relativistic Cherenkov shockwave pulses driven by sub-bass energy.',
  mixUniform: 'uCherenkovMix',
  defaultMix: 0.0,
  lfoMix: { freq: 0.39, phase: 2.9, min: 0.0, max: 0.92, decimals: 2 },
  subParams: [
    {
      key: 'hexScale',
      uniformName: 'uCherenkovScale',
      label: 'Hex Grid Density',
      min: 4.0,
      max: 20.0,
      step: 1.0,
      defaultValue: 9.0,
      format: (v) => `${Math.round(v)}`,
      lfo: { freq: 0.25, phase: 1.7, min: 6.0, max: 16.0, decimals: 0 },
    },
    {
      key: 'pulseSpeed',
      uniformName: 'uCherenkovPulse',
      label: 'Shockwave Velocity',
      min: 0.2,
      max: 3.0,
      step: 0.05,
      defaultValue: 1.35,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.49, phase: 0.6, min: 0.6, max: 2.4, decimals: 2 },
    },
  ],
  glslFunction: `
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

vec3 evalCherenkovMatrix(vec2 coord, float rRadial, float hexScale, float pulseSpeed) {
    float subBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float highBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.25;

    vec2 q = coord * hexScale;
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(q, r) - h;
    vec2 b = mod(q - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    vec2 cellId = q - gv;

    float dHex = 0.5 - hexDist(gv);
    float cellDist = length(cellId) / hexScale;

    // Smooth Relativistic Cherenkov radial shockwave rings
    float wavePhase = cellDist * 10.0 - iTime * 2.4 * pulseSpeed;
    float shockwave = pow(0.5 + 0.5 * sin(wavePhase), 4.0);

    float hexWall = smoothstep(0.06, 0.008, dHex);
    float hexCore = smoothstep(0.28, 0.05, 0.5 - dHex) * shockwave;
    float rimGlow = 0.018 / (dHex + 0.015);

    vec3 cherenkovBlue = vec3(0.08, 0.62, 1.0);
    vec3 coreCyan = vec3(0.38, 0.96, 1.0);
    vec3 reactorGold = vec3(1.0, 0.72, 0.22);

    vec3 col = cherenkovBlue * (hexWall * 0.75 + rimGlow * 0.35);
    col += mix(coreCyan, reactorGold, highBoost * 0.45 + shockwave * 0.35) * hexCore * (1.05 + subBoost * 0.45);
    col *= smoothstep(0.03, 0.22, rRadial);
    return col;
}
`,
  glslEvalExpr:
    'evalCherenkovMatrix(domainCoord, r, uCherenkovScale, uCherenkovPulse)',
  shadertoyHelper: (v) => {
    const sc = (v.hexScale ?? 9.0).toFixed(1);
    const spd = (v.pulseSpeed ?? 1.35).toFixed(2);
    return `// Relativistic Cherenkov Hex-Warp Matrix
vec3 evalCherenkovMatrix(vec2 coord, float rRadial) {
    vec2 q = coord * ${sc}, r = vec2(1.0, 1.7320508), h = r * 0.5;
    vec2 a = mod(q, r) - h, b = mod(q - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    vec2 p = abs(gv);
    float dHex = 0.5 - max(dot(p, normalize(r)), p.x);
    float shock = pow(0.5 + 0.5 * sin(length(q - gv) / ${sc} * 10.0 - iTime * ${(2.6 * Number(spd)).toFixed(2)}), 4.0);
    vec3 col = vec3(0.08, 0.62, 1.0) * (smoothstep(0.06, 0.008, dHex) * 0.75 + 0.018 / (dHex + 0.015) * 0.35);
    col += vec3(0.38, 0.96, 1.0) * smoothstep(0.28, 0.05, 0.5 - dHex) * shock * 1.1;
    return col * smoothstep(0.03, 0.22, rRadial);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 20: Cherenkov Hex-Warp Matrix
    col += evalCherenkovMatrix(domainCoord, r) * ${mix.toFixed(2)};`,
};

/**
 * 21. MORPHING MANDELBROT ZOOM (Audio-Reactive Sub-Bass & Highs)
 */
export const mandelbrotLayer: ShaderLayerDefinition = {
  id: 'mandelbrot',
  name: '21. Morphing Mandelbrot Zoom',
  shortName: 'Mandelbrot',
  description:
    'Smooth-renormalized 100-iteration Mandelbrot fractal centered on Seahorse Valley (-0.74364388, 0.1318259), where Web Audio sub-bass dynamically pulls the zoom and high frequencies shift the cosine color palette and kick flash.',
  mixUniform: 'uMandelbrotMix',
  defaultMix: 0.85,
  lfoMix: {
    freq: 0.31,
    phase: 1.4,
    min: 0.0,
    max: 1.0,
    decimals: 2,
  },
  subParams: [
    {
      key: 'baseZoom',
      uniformName: 'uMandelbrotZoom',
      label: 'Base Zoom Radius',
      min: 0.15,
      max: 1.2,
      step: 0.01,
      defaultValue: 0.5,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.22, phase: 0.5, min: 0.25, max: 0.85, decimals: 2 },
    },
    {
      key: 'audioPull',
      uniformName: 'uMandelbrotAudioPull',
      label: 'Audio Sub-Bass & Highs Drive',
      min: 0.0,
      max: 2.0,
      step: 0.05,
      defaultValue: 1.0,
      format: (v) => `${Math.round(v * 100)}%`,
      lfo: { freq: 0.38, phase: 2.1, min: 0.5, max: 1.6, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalMandelbrotZoom(vec2 coord, float baseZoom, float audioPull) {
    float uSubBass = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * audioPull;
    float uHighs = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * audioPull;

    vec2 uv = coord;

    // Sub-bass dynamically pushes and pulls the fractal zoom!
    float zoom = max(0.02, baseZoom + 0.4 * sin(iTime * 0.2) - (uSubBass * 0.3));
    vec2 c = uv * (2.0 * zoom) + vec2(-0.74364388, 0.1318259);

    vec2 z = vec2(0.0);
    float n = 0.0;
    float maxIt = 100.0;
    bool escaped = false;

    for (int i = 0; i < 100; i++) {
        if (dot(z, z) > 4.0) {
            n = float(i);
            escaped = true;
            break;
        }
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    }

    if (!escaped) {
        // Interior bulbs are pure negative space so the next layer in the stack fills inside the Mandelbrot set
        return vec3(0.0);
    }

    float smooth_n = n - log2(max(1.0, log2(max(dot(z, z), 1.0001)) * 0.5));
    float f = clamp(smooth_n / maxIt, 0.0, 1.0);

    // High frequencies and sub-bass shift the color palette dynamically
    float activeAudio = clamp((uSubBass + uHighs) * 2.5, 0.0, 1.0);
    vec3 colorShift = vec3(uSubBass * 1.5, mix(0.6, uHighs * 2.0, activeAudio), 1.0);
    vec3 col = 0.5 + 0.5 * cos(3.0 + f * 12.0 + colorShift);

    // Flash intensity boosts with audio kicks
    col += vec3(uSubBass * 0.2, uSubBass * 0.4, uSubBass * 0.6);

    return col * smoothstep(0.0, 1.0, f);
}
`,
  glslEvalExpr:
    'evalMandelbrotZoom(domainCoord, uMandelbrotZoom, uMandelbrotAudioPull)',
  shadertoyHelper: (v) => {
    const zm = (v.baseZoom ?? 0.5).toFixed(2);
    return `// Morphing Mandelbrot Zoom (Seahorse Valley)
vec3 evalMandelbrotZoom(vec2 coord) {
    float zoom = ${zm} + 0.4 * sin(iTime * 0.2);
    vec2 c = coord * (2.0 * zoom) + vec2(-0.74364388, 0.1318259);
    vec2 z = vec2(0.0);
    float n = 0.0, maxIt = 100.0;
    bool escaped = false;
    for (int i = 0; i < 100; i++) {
        if (dot(z, z) > 4.0) { n = float(i); escaped = true; break; }
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    }
    if (!escaped) return vec3(0.0);
    float smooth_n = n - log2(max(1.0, log2(max(dot(z, z), 1.0001)) * 0.5));
    float f = clamp(smooth_n / maxIt, 0.0, 1.0);
    vec3 col = 0.5 + 0.5 * cos(3.0 + f * 12.0 + vec3(0.0, 0.6, 1.0));
    return col * smoothstep(0.0, 1.0, f);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 21: Morphing Mandelbrot Zoom
    col += evalMandelbrotZoom(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * 22. RECURSIVE CIRCLE PACKING
 */
export const circlePackingLayer: ShaderLayerDefinition = {
  id: 'circlepacking',
  name: '22. Recursive Circle Packing',
  shortName: 'Circle Pack',
  description:
    'Iterated abs/dot conformal circle inversion lattice with harmonic orbital drift and multi-frequency RGB radial wave coloring.',
  mixUniform: 'uCirclePackMix',
  defaultMix: 0.75,
  lfoMix: {
    freq: 0.34,
    phase: 2.3,
    min: 0.0,
    max: 0.9,
    decimals: 2,
  },
  subParams: [
    {
      key: 'scale',
      uniformName: 'uCirclePackScale',
      label: 'Packing Domain Scale',
      min: 0.6,
      max: 2.6,
      step: 0.05,
      defaultValue: 1.4,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.26, phase: 1.1, min: 0.9, max: 2.0, decimals: 2 },
    },
    {
      key: 'drift',
      uniformName: 'uCirclePackDrift',
      label: 'Orbital Fold Drift',
      min: 0.0,
      max: 0.6,
      step: 0.01,
      defaultValue: 0.25,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.39, phase: 2.8, min: 0.1, max: 0.45, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalCirclePacking(vec2 coord, float scale, float drift) {
    vec2 uv = coord * (2.0 * scale);

    for (int i = 0; i < 6; i++) {
        uv = abs(uv) / clamp(dot(uv, uv), 0.15, 1.0) - vec2(0.8, 0.4);
        uv += vec2(sin(iTime * 0.15), cos(iTime * 0.1)) * drift;
    }

    float d = length(uv);
    vec3 col = vec3(
        sin(d * 4.0 + iTime),
        cos(d * 5.0 + iTime * 0.7),
        sin(d * 6.0 + iTime * 0.4)
    ) * 0.5 + 0.5;

    return col * smoothstep(2.0, 0.0, d);
}
`,
  glslEvalExpr:
    'evalCirclePacking(domainCoord, uCirclePackScale, uCirclePackDrift)',
  shadertoyHelper: (v) => {
    const sc = (v.scale ?? 1.4).toFixed(2);
    const dr = (v.drift ?? 0.25).toFixed(2);
    return `// Recursive Circle Packing
vec3 evalCirclePacking(vec2 coord) {
    vec2 uv = coord * (2.0 * ${sc});
    for (int i = 0; i < 6; i++) {
        uv = abs(uv) / clamp(dot(uv, uv), 0.15, 1.0) - vec2(0.8, 0.4);
        uv += vec2(sin(iTime * 0.15), cos(iTime * 0.1)) * ${dr};
    }
    float d = length(uv);
    vec3 col = vec3(sin(d * 4.0 + iTime), cos(d * 5.0 + iTime * 0.7), sin(d * 6.0 + iTime * 0.4)) * 0.5 + 0.5;
    return col * smoothstep(2.0, 0.0, d);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 22: Recursive Circle Packing
    col += evalCirclePacking(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * 23. PENTAGONAL WAVE INTERFERENCE
 */
export const pentagonalWaveLayer: ShaderLayerDefinition = {
  id: 'pentagonalwave',
  name: '23. Pentagonal Wave Interference',
  shortName: 'Pentagonal',
  description:
    'Superposition of 5 plane waves separated by 72-degree pentagonal angles with counter-rotating phase drift and nonlinear sine modulation.',
  mixUniform: 'uPentWaveMix',
  defaultMix: 0.0,
  lfoMix: {
    freq: 0.29,
    phase: 3.7,
    min: 0.0,
    max: 0.85,
    decimals: 2,
  },
  subParams: [
    {
      key: 'scale',
      uniformName: 'uPentWaveScale',
      label: 'Wave Spatial Scale',
      min: 2.0,
      max: 14.0,
      step: 0.2,
      defaultValue: 6.0,
      format: (v) => `${v.toFixed(1)}x`,
      lfo: { freq: 0.25, phase: 0.9, min: 3.5, max: 10.0, decimals: 1 },
    },
    {
      key: 'modDepth',
      uniformName: 'uPentWaveMod',
      label: 'Harmonic Fold Depth',
      min: 0.8,
      max: 5.0,
      step: 0.1,
      defaultValue: 2.5,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.37, phase: 2.2, min: 1.4, max: 3.8, decimals: 1 },
    },
  ],
  glslFunction: `
vec3 evalPentagonalWave(vec2 coord, float waveScale, float modDepth) {
    vec2 uv = coord * (2.0 * waveScale);

    float t = iTime * 0.3;
    float sum = 0.0;

    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float angle = fi * 1.256637;
        vec2 dir = vec2(cos(angle + t * 0.1), sin(angle - t * 0.1));
        sum += cos(dot(uv, dir) + t);
    }

    sum = sin(sum * modDepth + t * 2.0);
    vec3 col = 0.5 + 0.5 * cos(sum * 3.14159 + vec3(0.0, 0.6, 1.2));
    return col;
}
`,
  glslEvalExpr:
    'evalPentagonalWave(domainCoord, uPentWaveScale, uPentWaveMod)',
  shadertoyHelper: (v) => {
    const sc = (v.scale ?? 6.0).toFixed(1);
    const md = (v.modDepth ?? 2.5).toFixed(1);
    return `// Pentagonal Wave Interference
vec3 evalPentagonalWave(vec2 coord) {
    vec2 uv = coord * (2.0 * ${sc});
    float t = iTime * 0.3, sum = 0.0;
    for (int i = 0; i < 5; i++) {
        float angle = float(i) * 1.256637;
        vec2 dir = vec2(cos(angle + t * 0.1), sin(angle - t * 0.1));
        sum += cos(dot(uv, dir) + t);
    }
    sum = sin(sum * ${md} + t * 2.0);
    return 0.5 + 0.5 * cos(sum * 3.14159 + vec3(0.0, 0.6, 1.2));
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 23: Pentagonal Wave Interference
    col += evalPentagonalWave(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * 24. KALEIDOSCOPIC IFS CRYSTAL
 */
export const kifsCrystalLayer: ShaderLayerDefinition = {
  id: 'kifscrystal',
  name: '24. Kaleidoscopic IFS Crystal',
  shortName: 'KIFS Crystal',
  description:
    'Volumetric 64-step 3D raymarched Kaleidoscopic Iterated Function System (KIFS) crystal with 5-fold octahedral coordinate sorting and spherical inversion.',
  mixUniform: 'uKifsCrystalMix',
  defaultMix: 0.0,
  lfoMix: {
    freq: 0.27,
    phase: 4.5,
    min: 0.0,
    max: 0.9,
    decimals: 2,
  },
  subParams: [
    {
      key: 'camDist',
      uniformName: 'uKifsCamDist',
      label: 'Camera Orbit Distance',
      min: 2.2,
      max: 5.5,
      step: 0.05,
      defaultValue: 3.5,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.21, phase: 1.5, min: 2.6, max: 4.4, decimals: 2 },
    },
    {
      key: 'scale',
      uniformName: 'uKifsCrystalScale',
      label: 'IFS Fold Scale',
      min: 1.5,
      max: 2.4,
      step: 0.02,
      defaultValue: 2.0,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.32, phase: 0.4, min: 1.75, max: 2.2, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalKifsCrystal(vec2 coord, float camDist, float crystalScale) {
    vec2 uv = coord * 2.0;
    vec3 ro = vec3(0.0, 0.0, -camDist);
    vec3 rd = normalize(vec3(uv, 1.5));

    float t = iTime * 0.15;
    mat2 rot = mat2(cos(t), -sin(t), sin(t), cos(t));
    ro.xy = rot * ro.xy;
    rd.xy = rot * rd.xy;

    float acc = 0.0;
    vec3 p = ro;
    float totalDist = 0.0;

    for (int i = 0; i < 64; i++) {
        vec3 z = p;
        float scale = 1.0;

        for (int j = 0; j < 5; j++) {
            z = abs(z) - vec3(0.5, 0.8, 0.5);
            if (z.x < z.y) z.xy = z.yx;
            if (z.x < z.z) z.xz = z.zx;
            if (z.y < z.z) z.yz = z.zy;

            float m = max(dot(z, z), 1e-4);
            float k = clamp(max(1.0 / m, 0.2), 0.0, 2.0) * crystalScale;
            z *= k;
            scale *= k;
            z += vec3(-1.0, -2.0, -1.0) + vec3(sin(iTime * 0.2) * 0.1);
        }

        float d = (length(z) - 1.2) / scale;
        totalDist += d;
        p += rd * d;

        if (abs(d) < 0.001 || totalDist > 10.0) {
            acc = float(i);
            break;
        }
    }

    vec3 col = mix(vec3(0.05, 0.0, 0.15), vec3(0.2, 0.9, 1.0), acc / 64.0);
    col += vec3(0.8, 0.3, 1.0) * (totalDist * 0.05);
    return col;
}
`,
  glslEvalExpr:
    'evalKifsCrystal(domainCoord, uKifsCamDist, uKifsCrystalScale)',
  shadertoyHelper: (v) => {
    const cd = (v.camDist ?? 3.5).toFixed(2);
    const sc = (v.scale ?? 2.0).toFixed(2);
    return `// Kaleidoscopic IFS Crystal
vec3 evalKifsCrystal(vec2 coord) {
    vec2 uv = coord * 2.0;
    vec3 ro = vec3(0.0, 0.0, -${cd}), rd = normalize(vec3(uv, 1.5));
    float t = iTime * 0.15;
    mat2 rot = mat2(cos(t), -sin(t), sin(t), cos(t));
    ro.xy = rot * ro.xy; rd.xy = rot * rd.xy;
    float acc = 0.0, totalDist = 0.0;
    vec3 p = ro;
    for (int i = 0; i < 64; i++) {
        vec3 z = p; float scale = 1.0;
        for (int j = 0; j < 5; j++) {
            z = abs(z) - vec3(0.5, 0.8, 0.5);
            if (z.x < z.y) z.xy = z.yx;
            if (z.x < z.z) z.xz = z.zx;
            if (z.y < z.z) z.yz = z.zy;
            float m = max(dot(z, z), 1e-4);
            float k = clamp(max(1.0 / m, 0.2), 0.0, 2.0) * ${sc};
            z *= k; scale *= k;
            z += vec3(-1.0, -2.0, -1.0) + vec3(sin(iTime * 0.2) * 0.1);
        }
        float d = (length(z) - 1.2) / scale;
        totalDist += d; p += rd * d;
        if (abs(d) < 0.001 || totalDist > 10.0) { acc = float(i); break; }
    }
    return mix(vec3(0.05, 0.0, 0.15), vec3(0.2, 0.9, 1.0), acc / 64.0) + vec3(0.8, 0.3, 1.0) * (totalDist * 0.05);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 24: Kaleidoscopic IFS Crystal
    col += evalKifsCrystal(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * 25. LOGARITHMIC SPIRAL QUANTUM VORTEX
 */
export const logSpiralVortexLayer: ShaderLayerDefinition = {
  id: 'logspiralvortex',
  name: '25. Logarithmic Spiral Vortex',
  shortName: 'Log Spiral',
  description:
    'Logarithmic spiral vortex in (log(r) - t, a * arms + t) coordinates folded across 4 octaves of iterated abs(mod) domain reflections.',
  mixUniform: 'uLogSpiralMix',
  defaultMix: 0.0,
  lfoMix: {
    freq: 0.33,
    phase: 5.1,
    min: 0.0,
    max: 0.9,
    decimals: 2,
  },
  subParams: [
    {
      key: 'arms',
      uniformName: 'uLogSpiralArms',
      label: 'Spiral Arms Multiplier',
      min: 1.0,
      max: 8.0,
      step: 1.0,
      defaultValue: 3.0,
      format: (v) => `${Math.round(v)} arms`,
      lfo: { freq: 0.19, phase: 0.7, min: 2.0, max: 6.0, decimals: 0 },
    },
    {
      key: 'foldFreq',
      uniformName: 'uLogSpiralFreq',
      label: 'Fold Wave Frequency',
      min: 1.5,
      max: 8.0,
      step: 0.1,
      defaultValue: 4.0,
      format: (v) => `${v.toFixed(1)}x`,
      lfo: { freq: 0.36, phase: 2.5, min: 2.5, max: 6.5, decimals: 1 },
    },
  ],
  glslFunction: `
vec3 evalLogSpiralVortex(vec2 coord, float spiralArms, float foldFreq) {
    vec2 uv = coord * 2.0;

    float r = max(length(uv), 1e-4);
    float a = atan(uv.y, uv.x);

    float t = iTime * 0.4;
    float arms = floor(spiralArms + 0.5);
    vec2 st = vec2(log(r) - t, a * arms + t);

    vec3 col = vec3(0.0);
    for (int idx = 1; idx < 5; idx++) {
        float i = float(idx);
        st = abs(mod(st * 1.6, 2.0) - 1.0);
        float val = sin(st.x * foldFreq + st.y * foldFreq + iTime);
        col += vec3(sin(i + t), cos(i * 0.5), sin(i * 0.3 + t)) * abs(val) / (r * 0.4 + 0.2);
    }

    col = smoothstep(0.0, 1.0, col * 0.2);
    return col;
}
`,
  glslEvalExpr:
    'evalLogSpiralVortex(domainCoord, uLogSpiralArms, uLogSpiralFreq)',
  shadertoyHelper: (v) => {
    const arms = Math.round(v.arms ?? 3.0).toFixed(1);
    const fq = (v.foldFreq ?? 4.0).toFixed(1);
    return `// Logarithmic Spiral Quantum Vortex
vec3 evalLogSpiralVortex(vec2 coord) {
    vec2 uv = coord * 2.0;
    float r = max(length(uv), 1e-4), a = atan(uv.y, uv.x), t = iTime * 0.4;
    vec2 st = vec2(log(r) - t, a * ${arms} + t);
    vec3 col = vec3(0.0);
    for (int idx = 1; idx < 5; idx++) {
        float i = float(idx);
        st = abs(mod(st * 1.6, 2.0) - 1.0);
        float val = sin(st.x * ${fq} + st.y * ${fq} + iTime);
        col += vec3(sin(i + t), cos(i * 0.5), sin(i * 0.3 + t)) * abs(val) / (r * 0.4 + 0.2);
    }
    return smoothstep(0.0, 1.0, col * 0.2);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 25: Logarithmic Spiral Quantum Vortex
    col += evalLogSpiralVortex(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * LAYER 26: 4D Kleinian Spherical Inversion Lattice
 * Faithful 80-step 4D raymarched spherical inversion lattice (`k = invScale / dot(p, p)`, `p = abs(p - round(p))`)
 * with 4D audio-reactive & mouse-driven rotation matrices (`R1, R2, R3, RMouse`), 4-component distance field (`d1..d4`),
 * logarithmic phase color modulation (`sin(P + log2(k) + U)`), and `tanh` HDR compression.
 */
export const klein4dLayer: ShaderLayerDefinition = {
  id: 'klein4d',
  name: '26. 4D Kleinian Inversion Lattice',
  shortName: '4D Kleinian',
  mixUniform: 'uKlein4dMix',
  defaultMix: 0.0,
  lfoMix: {
    freq: 0.25,
    phase: 5.5,
    min: 0.0,
    max: 0.92,
    decimals: 2,
  },
  description:
    '80-step 4D raymarched spherical inversion lattice — Pure Spheres (d2 = length(p) - 0.28, d4 = length(p.xw) - 0.2, no line/cylinder metrics) with log2(k) chromatic phase modulation and hyperbolic tanh tone-mapping.',
  subParams: [
    {
      key: 'invScale',
      uniformName: 'uKlein4dScale',
      label: '4D Inversion Scale (k)',
      min: 5.0,
      max: 16.0,
      step: 0.2,
      defaultValue: 10.2,
      format: (v) => v.toFixed(1),
      lfo: { freq: 0.22, phase: 0.8, min: 7.5, max: 13.0, decimals: 1 },
    },
    {
      key: 'speed',
      uniformName: 'uKlein4dSpeed',
      label: 'Forward Journey Speed',
      min: 0.05,
      max: 0.8,
      step: 0.01,
      defaultValue: 0.28,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.28, phase: 2.1, min: 0.15, max: 0.55, decimals: 2 },
    },
  ],
  glslFunction: `
// 4D Kleinian Spherical Inversion Lattice - Pure Spheres (No Lines)
vec4 klein4dRound(vec4 x) {
    return floor(x + 0.5);
}

vec4 klein4dTanh(vec4 x) {
    vec4 cx = clamp(x, -10.0, 10.0);
    vec4 e = exp(2.0 * cx);
    return (e - 1.0) / (e + 1.0);
}

vec3 evalKlein4dLattice(vec2 coord, float invScale, float forwardSpeed) {
    float T = iTime * 0.12;
    float F = fract(T);
    float t = floor(T) + smoothstep(0.0, 1.0, F);

    vec4 o = vec4(0.0);
    vec4 p = vec4(0.0);
    vec4 P = vec4(0.0);
    vec4 U = vec4(1.0, 2.0, 3.0, 0.0);
    float z = 0.0;
    float d = 0.0;
    float k = 0.0;

    mat2 R1 = mat2(cos(0.002), -sin(0.002), sin(0.002), cos(0.002));
    mat2 R2 = mat2(cos(0.0015), -sin(0.0015), sin(0.0015), cos(0.0015));
    mat2 R3 = mat2(cos(0.001), -sin(0.001), sin(0.001), cos(0.001));
    vec3 rayDir = normalize(vec3(coord, 1.0));

    for (int idx = 0; idx < 80; idx++) {
        p = vec4(z * rayDir, 0.15);
        p.z -= 1.5 + iTime * forwardSpeed;
        p.w += 0.4;
        p.xw = R1 * p.xw;
        p.yw = R2 * p.yw;
        p.zw = R3 * p.zw;
        p.xy = R1 * p.xy;

        k = invScale / max(dot(p, p), 1e-5);
        p *= k;
        p -= 0.3 * t;
        P = p;
        p = abs(p - klein4dRound(p));

        // Pure spheres only - removed line/cylinder distance metrics
        float d2 = length(p) - 0.28;
        float d4 = length(p.xw) - 0.2;
        d = abs(min(d2, d4)) / max(k, 1e-5);

        float logK = log2(max(k, 1e-5));
        vec4 colorMod = vec4(
            1.1 + sin(P.z + logK + U.x) * 0.8,
            1.1 + sin(P.w + logK + U.y) * 0.8,
            1.1 + sin(P.x + logK + U.z) * 0.8,
            1.1 + sin(P.y + logK + U.w) * 0.8
        );
        o += U * 0.035 + colorMod / max(d, 1e-3) * 0.7;
        z += 0.7 * d + 1e-3;
    }

    o = klein4dTanh(o / 8500.0) / 0.83;
    return clamp(mix(o.rgb, o.rgb * vec3(1.05, 1.0, 0.98), 0.15), 0.0, 2.5);
}
`,
  glslEvalExpr:
    'evalKlein4dLattice(domainCoord, uKlein4dScale, uKlein4dSpeed)',
  shadertoyHelper: (v) => {
    const sc = (v.invScale ?? 10.2).toFixed(1);
    const sp = (v.speed ?? 0.28).toFixed(2);
    return `// 4D Kleinian Spherical Inversion Lattice - Pure Spheres (No Lines)
vec4 klein4dRound(vec4 x) { return floor(x + 0.5); }
vec4 klein4dTanh(vec4 x) { vec4 cx = clamp(x, -10.0, 10.0); vec4 e = exp(2.0 * cx); return (e - 1.0) / (e + 1.0); }
vec3 evalKlein4dLattice(vec2 coord) {
    float T = iTime * 0.12, F = fract(T), t = floor(T) + smoothstep(0.0, 1.0, F);
    vec4 o = vec4(0.0), p, P, U = vec4(1.0, 2.0, 3.0, 0.0);
    float z = 0.0, d = 0.0, k = 0.0;
    mat2 R1 = mat2(cos(0.002), -sin(0.002), sin(0.002), cos(0.002));
    mat2 R2 = mat2(cos(0.0015), -sin(0.0015), sin(0.0015), cos(0.0015));
    mat2 R3 = mat2(cos(0.001), -sin(0.001), sin(0.001), cos(0.001));
    vec3 rayDir = normalize(vec3(coord, 1.0));
    for (int idx = 0; idx < 80; idx++) {
        p = vec4(z * rayDir, 0.15);
        p.z -= 1.5 + iTime * ${sp};
        p.w += 0.4;
        p.xw = R1 * p.xw; p.yw = R2 * p.yw; p.zw = R3 * p.zw; p.xy = R1 * p.xy;
        k = ${sc} / max(dot(p, p), 1e-5);
        p *= k; P = p -= 0.3 * t;
        p = abs(p - klein4dRound(p));
        // Pure spheres only - removed line/cylinder distance metrics
        float d2 = length(p) - 0.28;
        float d4 = length(p.xw) - 0.2;
        d = abs(min(d2, d4)) / max(k, 1e-5);
        float logK = log2(max(k, 1e-5));
        vec4 colorMod = vec4(1.1 + sin(P.z + logK + U.x) * 0.8, 1.1 + sin(P.w + logK + U.y) * 0.8, 1.1 + sin(P.x + logK + U.z) * 0.8, 1.1 + sin(P.y + logK + U.w) * 0.8);
        o += U * 0.035 + colorMod / max(d, 1e-3) * 0.7;
        z += 0.7 * d + 1e-3;
    }
    o = klein4dTanh(o / 8500.0) / 0.83;
    return clamp(mix(o.rgb, o.rgb * vec3(1.05, 1.0, 0.98), 0.15), 0.0, 2.5);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 26: 4D Kleinian Inversion Lattice (Pure Spheres)
    col += evalKlein4dLattice(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * 27. PS2 BIOS Crystal Towers & 7-Orb Nebula
 * Recreates the iconic Sony PlayStation 2 System BIOS monolithic crystal towers rising out of
 * deep cobalt-indigo abyssal fog, crowned by the 7 orbiting cyan constellation light orbs with comet trails.
 */
export const ps2BiosLayer: ShaderLayerDefinition = {
  id: 'ps2bios',
  name: '27. PS2 BIOS Crystal Towers & 7-Orb Nebula',
  shortName: 'PS2 Towers',
  description:
    'Iconic PlayStation 2 System BIOS 3D translucent cobalt-indigo monolithic crystal towers pulsing to audio frequencies beneath the 7 orbiting cyan constellation orbs and comet trails.',
  mixUniform: 'uMixPs2Bios',
  defaultMix: 0.0,
  lfoMix: { freq: 0.21, phase: 2.4, min: 0.35, max: 0.98, decimals: 2 },
  subParams: [
    {
      key: 'density',
      uniformName: 'uPs2TowerDensity',
      label: 'Tower Matrix Grid',
      min: 3.0,
      max: 10.0,
      step: 0.5,
      defaultValue: 5.5,
      format: (v) => `${v.toFixed(1)}x`,
      lfo: { freq: 0.14, phase: 0.5, min: 4.0, max: 8.0, decimals: 1 },
    },
    {
      key: 'orbGlow',
      uniformName: 'uPs2OrbGlow',
      label: '7-Orb Comet Radiance',
      min: 0.4,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.35,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.28, phase: 1.7, min: 0.85, max: 2.1, decimals: 2 },
    },
    {
      key: 'fogDepth',
      uniformName: 'uPs2FogDepth',
      label: 'Cobalt Abyssal Fog',
      min: 0.3,
      max: 2.0,
      step: 0.05,
      defaultValue: 1.15,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.18, phase: 3.1, min: 0.65, max: 1.65, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalPs2BiosTowers(vec2 coord, float gridScale, float orbGlow, float fogAmount) {
    float bass = clamp(uAudioSub * uAudioReactivity, 0.0, 2.0);
    float mid  = clamp(uAudioMid * uAudioReactivity, 0.0, 2.0);
    float high = clamp(uAudioHigh * uAudioReactivity, 0.0, 2.0);

    // Camera drift looking obliquely into the PS2 monolith matrix
    float camT = iTime * 0.32;
    vec2 camDrift = vec2(sin(camT * 0.7) * 0.45, camT * 0.85);
    vec3 col = vec3(0.0);

    // Deep Y2K Sony PS2 BIOS cobalt-indigo volumetric nebula backdrop
    float neb = fbm(coord * 2.2 + vec2(camT * 0.18, -camT * 0.14));
    float neb2 = fbm(coord * 4.5 - vec2(camT * 0.25, camT * 0.22) + neb * 0.6);
    float rDist = length(coord);
    vec3 abyssCol = mix(vec3(0.008, 0.028, 0.11), vec3(0.035, 0.16, 0.52), smoothstep(0.15, 0.85, neb * neb2 * 1.8));
    col += abyssCol * fogAmount * exp(-rDist * 0.85);

    // Multi-plane 3D perspective monolithic crystal tower extrusion (6 depth slices)
    for (int slice = 0; slice < 6; slice++) {
        float fi = float(slice);
        float zDepth = 1.0 + fi * 0.42 - fract(camT * 0.35) * 0.42;
        float persp = 1.0 / max(zDepth, 0.25);

        // Project 2D coord with parallax offset per depth layer
        vec2 planeUv = coord * (gridScale * zDepth * 0.55) + camDrift * (0.6 + fi * 0.12);
        vec2 cellId = floor(planeUv);
        vec2 cellF = fract(planeUv) - 0.5;

        float hSeed = hash21(cellId + fi * 13.7);
        // Only ~62% of slots hold a memory-card tower (authentic sparse PS2 BIOS layout)
        if (hSeed > 0.38) {
            float freqPhase = hSeed * 6.2831 + iTime * (1.2 + hSeed * 1.4);
            float audioLift = bass * 0.45 * sin(hSeed * 12.0 + iTime * 2.5) + mid * 0.35;
            float towerPulse = 0.55 + 0.45 * sin(freqPhase) + audioLift;

            // Monolith square cross-section with crystal bevels
            float halfW = mix(0.24, 0.36, fract(hSeed * 7.13));
            vec2 dBox = abs(cellF) - vec2(halfW);
            float boxDist = max(dBox.x, dBox.y);

            // Glowing crystal edges + translucent inner glass face
            float edgeGlow = exp(-abs(boxDist) * 28.0) * (0.65 + 0.45 * towerPulse);
            float innerFace = smoothstep(0.02, -0.04, boxDist) * (0.22 + 0.18 * towerPulse);
            // Internal diagonal crystal refraction rib
            float crystalRib = exp(-abs(cellF.x + cellF.y) * 18.0) * smoothstep(0.0, -0.02, boxDist) * 0.35;

            float depthFade = exp(-zDepth * 0.52) * smoothstep(0.05, 0.35, zDepth);
            vec3 towerTint = mix(
                vec3(0.08, 0.32, 0.92),
                vec3(0.28, 0.78, 1.0),
                0.5 + 0.5 * sin(hSeed * 9.0 + fi * 0.7 + high * 0.8)
            );
            // Subtle violet-indigo rim on deep towers
            towerTint = mix(towerTint, vec3(0.42, 0.22, 0.98), clamp((zDepth - 1.2) * 0.35, 0.0, 0.65));

            col += towerTint * (edgeGlow + innerFace + crystalRib) * depthFade * (0.85 + bass * 0.3);
        }
    }

    // Iconic 7 Orbiting PS2 Constellation Light Orbs + Harmonic Comet Trails
    float orbSpeed = iTime * (0.95 + mid * 0.15);
    for (int i = 0; i < 7; i++) {
        float idx = float(i);
        float baseAngle = idx * 0.8975979 + orbSpeed * (0.75 + 0.08 * idx);
        float rad = 0.22 + 0.14 * sin(orbSpeed * 0.62 + idx * 1.35) + bass * 0.04;

        // Sample 5 trail segments behind each orb for silky PS2 BIOS light ribbons
        for (int tStep = 0; tStep < 5; tStep++) {
            float lag = float(tStep) * 0.085;
            float aLag = baseAngle - lag * (1.2 + 0.1 * idx);
            float rLag = rad + 0.03 * sin((orbSpeed - lag) * 1.4 + idx);
            // Figure-8 / 3D tilted orbital projection
            vec2 orbPos = vec2(
                cos(aLag) * rLag + 0.08 * sin(aLag * 2.0 + idx),
                sin(aLag * 1.5) * rLag * 0.72 + 0.06 * cos(aLag - idx)
            );

            float dOrb = length(coord - orbPos);
            float trailWeight = exp(-float(tStep) * 0.58);
            float core = (0.0028 / (dOrb * dOrb + 0.00055)) * trailWeight;
            float halo = exp(-dOrb * 11.0) * 0.28 * trailWeight;

            vec3 orbCol = mix(
                vec3(0.22, 0.75, 1.0),
                vec3(0.65, 0.92, 1.0),
                float(tStep == 0)
            );
            col += orbCol * (core + halo) * orbGlow * (0.85 + high * 0.35);
        }
    }

    return clamp(col, 0.0, 3.0);
}
`,
  glslEvalExpr:
    'evalPs2BiosTowers(domainCoord, uPs2TowerDensity, uPs2OrbGlow, uPs2FogDepth)',
  shadertoyHelper: (v) => {
    const dens = (v.density ?? 5.5).toFixed(1);
    const og = (v.orbGlow ?? 1.35).toFixed(2);
    const fd = (v.fogDepth ?? 1.15).toFixed(2);
    return `// Layer 27: PS2 BIOS Crystal Towers & 7-Orb Nebula
vec3 evalPs2BiosTowers(vec2 coord) {
    float camT = iTime * 0.32;
    vec2 camDrift = vec2(sin(camT * 0.7) * 0.45, camT * 0.85);
    float neb = fbm(coord * 2.2 + vec2(camT * 0.18, -camT * 0.14));
    vec3 col = mix(vec3(0.008, 0.028, 0.11), vec3(0.035, 0.16, 0.52), neb) * ${fd} * exp(-length(coord) * 0.85);
    for (int slice = 0; slice < 6; slice++) {
        float fi = float(slice);
        float zDepth = 1.0 + fi * 0.42 - fract(camT * 0.35) * 0.42;
        vec2 planeUv = coord * (${dens} * zDepth * 0.55) + camDrift * (0.6 + fi * 0.12);
        vec2 cellId = floor(planeUv), cellF = fract(planeUv) - 0.5;
        float hSeed = hash21(cellId + fi * 13.7);
        if (hSeed > 0.38) {
            float halfW = mix(0.24, 0.36, fract(hSeed * 7.13));
            vec2 dBox = abs(cellF) - vec2(halfW);
            float boxDist = max(dBox.x, dBox.y);
            float edgeGlow = exp(-abs(boxDist) * 28.0);
            float innerFace = smoothstep(0.02, -0.04, boxDist) * 0.25;
            col += mix(vec3(0.08, 0.32, 0.92), vec3(0.28, 0.78, 1.0), 0.5 + 0.5 * sin(hSeed * 9.0)) * (edgeGlow + innerFace) * exp(-zDepth * 0.52);
        }
    }
    for (int i = 0; i < 7; i++) {
        float idx = float(i), aLag = idx * 0.8975979 + iTime * (0.75 + 0.08 * idx), rLag = 0.24 + 0.12 * sin(iTime * 0.6 + idx);
        vec2 orbPos = vec2(cos(aLag) * rLag, sin(aLag * 1.5) * rLag * 0.72);
        float dOrb = length(coord - orbPos);
        col += vec3(0.35, 0.85, 1.0) * (0.004 / (dOrb * dOrb + 0.0006)) * ${og};
    }
    return clamp(col, 0.0, 3.0);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 27: PS2 BIOS Crystal Towers & 7-Orb Nebula
    col += evalPs2BiosTowers(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * 28. PS2 VLM Waveform Ribbon & Spectrum Horizon
 * Inspired by the PlayStation 2 CD Audio Player / Jeff Minter Virtual Light Machine (VLM):
 * 3D neon oscilloscope waveform ribbons, mirrored radial spectrum analyzer bars, and pulsing vector horizon.
 */
export const ps2VlmLayer: ShaderLayerDefinition = {
  id: 'ps2vlm',
  name: '28. PS2 VLM Waveform Ribbon & Spectrum Horizon',
  shortName: 'PS2 VLM Wave',
  description:
    'PlayStation 2 CD Audio Player / Virtual Light Machine (VLM) 3D glowing waveform oscilloscope ribbons and mirrored frequency spectrum analyzer bars reactive to sub-bass, mids, and highs.',
  mixUniform: 'uMixPs2Vlm',
  defaultMix: 0.0,
  lfoMix: { freq: 0.25, phase: 0.9, min: 0.35, max: 0.98, decimals: 2 },
  subParams: [
    {
      key: 'waveAmp',
      uniformName: 'uPs2WaveAmp',
      label: 'Waveform Excursion',
      min: 0.3,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.25,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.24, phase: 0.4, min: 0.75, max: 2.1, decimals: 2 },
    },
    {
      key: 'bandCount',
      uniformName: 'uPs2BandCount',
      label: 'Spectrum EQ Bands',
      min: 8.0,
      max: 48.0,
      step: 2.0,
      defaultValue: 24.0,
      format: (v) => `${Math.round(v)} bands`,
      lfo: { freq: 0.12, phase: 1.9, min: 16.0, max: 36.0, decimals: 0 },
    },
    {
      key: 'ribbonGlow',
      uniformName: 'uPs2RibbonGlow',
      label: 'VLM Phosphor Bloom',
      min: 0.5,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.4,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.29, phase: 2.6, min: 0.9, max: 2.2, decimals: 2 },
    },
  ],
  glslFunction: `
vec3 evalPs2VlmVisualizer(vec2 coord, float r, float a, float waveAmp, float bandCount, float ribbonGlow) {
    float bass = clamp(uAudioSub * uAudioReactivity, 0.0, 2.2);
    float mid  = clamp(uAudioMid * uAudioReactivity, 0.0, 2.2);
    float high = clamp(uAudioHigh * uAudioReactivity, 0.0, 2.2);
    float energy = 0.35 + bass * 0.45 + mid * 0.35 + high * 0.25;

    vec3 col = vec3(0.0);
    float t = iTime * 1.65;

    // 1. Five 3D Perspective Oscilloscope Waveform Ribbons (PS2 CD Player signature)
    for (int w = 0; w < 5; w++) {
        float fw = float(w);
        float zPersp = 1.0 - fw * 0.13;
        vec2 wUv = coord / max(zPersp, 0.35);

        float freq1 = 3.5 + fw * 1.4;
        float freq2 = 8.0 + fw * 2.3;
        float freq3 = 17.0 + fw * 3.1;

        float waveSignal =
            sin(wUv.x * freq1 + t * (1.1 + fw * 0.18)) * (0.14 + bass * 0.16) +
            cos(wUv.x * freq2 - t * (1.7 - fw * 0.12)) * (0.07 + mid * 0.11) +
            sin(wUv.x * freq3 + t * 2.9 + fw) * (0.03 + high * 0.065);

        float targetY = waveSignal * waveAmp + (fw - 2.0) * 0.055 * (0.6 + bass * 0.4);
        float dRibbon = abs(wUv.y - targetY);

        float coreLine = 0.0026 / (dRibbon + 0.0018);
        float wideSheen = exp(-dRibbon * 14.0) * 0.42;

        // Y2K PS2 palette cycling from electric cyan -> sapphire -> neon violet -> magenta
        vec3 ribCol = 0.55 + 0.45 * cos(vec3(0.0, 1.8, 3.4) + fw * 0.65 + wUv.x * 1.8 - iTime * 0.7);
        ribCol = mix(ribCol, vec3(0.18, 0.72, 1.0), 0.42);

        col += ribCol * (coreLine + wideSheen) * zPersp * ribbonGlow * (0.75 + energy * 0.35);
    }

    // 2. Mirrored Radial & Horizon Spectrum Analyzer Bars with Peak-Hold Caps
    float bands = max(8.0, floor(bandCount));
    float angleNorm = fract((a + 3.14159265) / 6.2831853);
    float bandIdx = floor(angleNorm * bands);
    float bandLocal = fract(angleNorm * bands) - 0.5;

    // Synthesize per-band FFT energy from real sub/mid/high envelopes + harmonic distribution
    float bandRatio = abs(bandIdx / bands - 0.5) * 2.0; // 0 = bass center, 1 = high outer
    float bandSeed = hash21(vec2(bandIdx, floor(iTime * 0.25)));
    float synthFft =
        mix(bass * 0.85, high * 0.85, bandRatio) +
        mid * 0.55 * sin(bandIdx * 0.85 + iTime * 4.2) * sin(bandIdx * 0.45 - iTime * 2.7) +
        0.18 * (0.5 + 0.5 * sin(bandIdx * 1.3 + iTime * 3.1 + bandSeed * 6.28));
    float barHeight = clamp(0.12 + abs(synthFft) * 0.36 * waveAmp, 0.08, 0.78);

    // Radial ring equalizer around the vortex core
    float innerRing = 0.16 + bass * 0.03;
    float outerRing = innerRing + barHeight;
    float barMask = smoothstep(0.38, 0.24, abs(bandLocal)) *
                    smoothstep(innerRing - 0.01, innerRing + 0.01, r) *
                    smoothstep(outerRing + 0.012, outerRing - 0.012, r);

    // Segmented LED step quantization along radius
    float ledSeg = smoothstep(-0.2, 0.35, sin(r * 95.0));
    // Glowing peak-hold cap just outside outerRing
    float peakPos = outerRing + 0.022 + 0.015 * (0.5 + 0.5 * sin(iTime * 2.2 + bandIdx));
    float peakCap = smoothstep(0.38, 0.22, abs(bandLocal)) * exp(-abs(r - peakPos) * 85.0);

    vec3 eqCol = mix(
        vec3(0.08, 0.48, 1.0),
        vec3(0.35, 0.95, 1.0),
        clamp((r - innerRing) / max(barHeight, 0.05), 0.0, 1.0)
    );
    vec3 capCol = vec3(0.85, 0.96, 1.0);

    col += eqCol * barMask * (0.45 + 0.55 * ledSeg) * ribbonGlow * 0.85;
    col += capCol * peakCap * ribbonGlow * (0.9 + high * 0.5);

    return clamp(col, 0.0, 3.0);
}
`,
  glslEvalExpr:
    'evalPs2VlmVisualizer(domainCoord, r, a, uPs2WaveAmp, uPs2BandCount, uPs2RibbonGlow)',
  shadertoyHelper: (v) => {
    const wa = (v.waveAmp ?? 1.25).toFixed(2);
    const bc = (v.bandCount ?? 24.0).toFixed(1);
    const rg = (v.ribbonGlow ?? 1.4).toFixed(2);
    return `// Layer 28: PS2 VLM Waveform Ribbon & Spectrum Horizon
vec3 evalPs2VlmVisualizer(vec2 coord, float r, float a) {
    vec3 col = vec3(0.0);
    float t = iTime * 1.65;
    for (int w = 0; w < 5; w++) {
        float fw = float(w), zPersp = 1.0 - fw * 0.13;
        vec2 wUv = coord / max(zPersp, 0.35);
        float waveSignal = sin(wUv.x * (3.5 + fw * 1.4) + t * (1.1 + fw * 0.18)) * 0.18 + cos(wUv.x * (8.0 + fw * 2.3) - t * 1.5) * 0.09;
        float dRibbon = abs(wUv.y - waveSignal * ${wa} - (fw - 2.0) * 0.055);
        vec3 ribCol = mix(0.55 + 0.45 * cos(vec3(0.0, 1.8, 3.4) + fw * 0.65 + wUv.x * 1.8 - iTime * 0.7), vec3(0.18, 0.72, 1.0), 0.42);
        col += ribCol * (0.0026 / (dRibbon + 0.0018) + exp(-dRibbon * 14.0) * 0.42) * zPersp * ${rg};
    }
    float bands = ${bc};
    float angleNorm = fract((a + 3.14159265) / 6.2831853);
    float bandIdx = floor(angleNorm * bands), bandLocal = fract(angleNorm * bands) - 0.5;
    float barHeight = 0.16 + 0.22 * (0.5 + 0.5 * sin(bandIdx * 0.9 + iTime * 3.8));
    float innerRing = 0.17, outerRing = innerRing + barHeight;
    float barMask = smoothstep(0.38, 0.24, abs(bandLocal)) * smoothstep(innerRing - 0.01, innerRing + 0.01, r) * smoothstep(outerRing + 0.012, outerRing - 0.012, r);
    col += vec3(0.18, 0.72, 1.0) * barMask * ${rg} * 0.75;
    return clamp(col, 0.0, 3.0);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 28: PS2 VLM Waveform Ribbon & Spectrum Horizon
    col += evalPs2VlmVisualizer(domainCoord, r, a) * ${mix.toFixed(2)};`,
};

/**
 * 29. Neon Crystal Ice Corridor (3D Raymarched Rounded-Square Crystalline Cave & Neon Portal Arches)
 * Recreates the 3D rounded-square amethyst/lavender crystalline ice cave tunnel lined with
 * glowing neon rounded-square portal frames, wet rock normal-mapped specular reflections,
 * and a luminous cyan-white misty horizon.
 */
export const neonCorridorLayer: ShaderLayerDefinition = {
  id: 'neoncorridor',
  name: '29. Neon Crystal Ice Corridor',
  shortName: 'Neon Corridor',
  description:
    '3D raymarched rounded-square amethyst & ice-crystal cave tunnel illuminated by glowing violet, warm-gold, and cyan neon portal frames with wet rock specular reflections and misty horizon bloom.',
  mixUniform: 'uMixNeonCorridor',
  defaultMix: 0.96,
  lfoMix: { freq: 0.22, phase: 0.4, min: 0.45, max: 1.0, decimals: 2 },
  subParams: [
    {
      key: 'portalSpacing',
      uniformName: 'uCorridorSpacing',
      label: 'Neon Arch Density',
      min: 1.0,
      max: 3.2,
      step: 0.05,
      defaultValue: 1.85,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.16, phase: 0.8, min: 1.35, max: 2.45, decimals: 2 },
    },
    {
      key: 'rockRelief',
      uniformName: 'uCorridorRelief',
      label: 'Crystal Cave Relief',
      min: 0.2,
      max: 2.0,
      step: 0.05,
      defaultValue: 1.15,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.19, phase: 1.7, min: 0.75, max: 1.55, decimals: 2 },
    },
    {
      key: 'neonBloom',
      uniformName: 'uCorridorBloom',
      label: 'Neon & Horizon Glow',
      min: 0.4,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.35,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.27, phase: 2.5, min: 0.9, max: 1.95, decimals: 2 },
    },
  ],
  glslFunction: `
// Signed distance to a 2D rounded box (for rounded-square tunnel & neon frames)
float sdRoundSquare2D(vec2 p, float halfSize, float cornerR) {
    vec2 q = abs(p) - vec2(halfSize - cornerR);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cornerR;
}

// 3D crystalline rock & ice facet displacement field for the cave walls
float corridorCrystalRelief(vec3 p) {
    // Multi-frequency 3D triplanar / gyroidal crystal rock relief
    vec3 q = p * 1.55;
    float baseRock = sin(q.x * 2.1 + sin(q.z * 1.7)) * cos(q.y * 2.1 + cos(q.z * 1.4)) * 0.5 + 0.5;
    float facet1 = abs(sin(q.x * 4.3 + q.z * 2.8) * cos(q.y * 4.1 - q.z * 2.5));
    float facet2 = abs(cos(q.x * 8.2 - q.y * 5.6 + q.z * 4.7));
    float noiseLayer = fbm(p.xy * 2.4 + vec2(p.z * 0.65, -p.z * 0.45));
    // Sculpted jagged crystal pockets & rounded ice boulders
    return (baseRock * 0.42 + (1.0 - facet1) * 0.34 + (1.0 - facet2) * 0.14 + noiseLayer * 0.35) - 0.52;
}

// Distance to the sculpted rounded-square cave wall
float mapCorridorWall(vec3 p, float rockRelief) {
    // Gentle organic tunnel wind
    vec2 centerOff = vec2(sin(p.z * 0.18) * 0.08, cos(p.z * 0.15) * 0.06);
    vec2 xy = p.xy - centerOff;
    // Rounded-square tunnel radius: negative inside, 0 at wall
    float tunnelRadius = 1.08;
    float cornerR = 0.34;
    float dSquare = sdRoundSquare2D(xy, tunnelRadius, cornerR);
    // Distance from interior ray to outer wall is (-dSquare)
    float wallDist = -dSquare;
    // Carve 3D rock & crystal displacement into the cave walls
    float disp = corridorCrystalRelief(p) * 0.18 * rockRelief;
    return wallDist - disp;
}

// Distance & color for the repeating rounded-square neon portal arches along Z
vec2 mapNeonPortalFrame(vec3 p, float zSpacing, out float frameIndex) {
    vec2 centerOff = vec2(sin(p.z * 0.18) * 0.08, cos(p.z * 0.15) * 0.06);
    vec2 xy = p.xy - centerOff;

    float cellZ = floor(p.z / zSpacing + 0.5);
    frameIndex = cellZ;
    float localZ = (p.z - cellZ * zSpacing);

    // Neon rounded-square arch sits slightly proud of the sculpted rock wall
    float archHalfSize = 0.98;
    float archCornerR = 0.30;
    float d2D = sdRoundSquare2D(xy, archHalfSize, archCornerR);
    float dTube = length(vec2(d2D, localZ)) - 0.022;
    return vec2(dTube, d2D);
}

// Color palette for each neon arch index (violet/lavender, warm peach-gold, icy cyan)
vec3 getNeonArchPalette(float idx, float angleParam, float audioMid) {
    float cyc = fract(idx * 0.3183 + angleParam * 0.12);
    vec3 neonViolet = vec3(0.76, 0.42, 1.0);
    vec3 neonMagenta = vec3(0.95, 0.46, 0.92);
    vec3 warmGold = vec3(1.0, 0.84, 0.56);
    vec3 icyCyan = vec3(0.52, 0.90, 1.0);

    vec3 archCol = mix(neonViolet, neonMagenta, 0.5 + 0.5 * sin(idx * 1.7 + angleParam * 2.0));
    archCol = mix(archCol, warmGold, smoothstep(0.55, 0.92, sin(idx * 2.1 - angleParam * 1.5 + audioMid * 0.8)));
    archCol = mix(archCol, icyCyan, smoothstep(0.62, 0.95, cos(idx * 1.3 + angleParam * 2.4)));
    return archCol;
}

vec3 evalNeonCrystalCorridor(vec2 coord, float portalDensity, float rockRelief, float neonBloom) {
    float bass = clamp(uAudioSub * uAudioReactivity, 0.0, 2.0);
    float mid  = clamp(uAudioMid * uAudioReactivity, 0.0, 2.0);
    float high = clamp(uAudioHigh * uAudioReactivity, 0.0, 2.0);

    // Spacing between consecutive neon rounded-square frames
    float zSpacing = 2.65 / max(portalDensity, 0.5);

    // Camera flying steadily forward down the crystalline corridor
    float flySpeed = 1.85;
    float camZ = iTime * flySpeed + bass * 0.22;
    vec2 camSway = vec2(sin(iTime * 0.55) * 0.06, cos(iTime * 0.45) * 0.05);
    vec3 ro = vec3(camSway, camZ);

    // Subtle mouse look & perspective projection
    vec2 look = uMouse * 0.35;
    vec2 uv = coord * 1.35 + look * 0.25;
    vec3 rd = normalize(vec3(uv, 1.25));

    // Gentle camera roll sway
    float roll = sin(iTime * 0.32) * 0.04;
    mat2 rMat = mat2(cos(roll), -sin(roll), sin(roll), cos(roll));
    rd.xy = rMat * rd.xy;

    float t = 0.05;
    float maxDist = 22.0;
    vec3 volNeonGlow = vec3(0.0);
    bool hitWall = false;

    // 48-step sphere trace through the crystalline tunnel, accumulating neon arch bloom
    for (int i = 0; i < 48; i++) {
        vec3 p = ro + rd * t;
        float dWall = mapCorridorWall(p, rockRelief);

        float fIdx = 0.0;
        vec2 dPortal = mapNeonPortalFrame(p, zSpacing, fIdx);
        float dTube = dPortal.x;

        // Accumulate volumetric neon tube core & bloom halo
        float angleP = atan(p.y, p.x);
        vec3 archCol = getNeonArchPalette(fIdx, angleP, mid);
        float depthAtten = exp(-t * 0.085);

        // Intense white-hot core + colored neon aura
        float tubeCore = exp(-max(dTube, 0.0) * 52.0);
        float tubeAura = 0.0024 / (dTube * dTube + 0.0016);
        vec3 stepNeon = (vec3(1.0, 0.98, 1.0) * tubeCore * 1.35 + archCol * tubeAura) * depthAtten;

        // Weight volumetric accumulation by safe step size so arches stay crisp
        float stepDist = max(min(dWall * 0.68, max(dTube * 0.75, 0.035)), 0.025);
        volNeonGlow += stepNeon * stepDist * (1.0 + bass * 0.28);

        if (dWall < 0.006 || t > maxDist) {
            hitWall = (dWall < 0.006);
            break;
        }
        t += stepDist;
    }

    // Bright misty cyan-white volumetric horizon at the far end of the tunnel
    float centerMist = exp(-length(uv) * 1.45);
    vec3 horizonCol = mix(
        vec3(0.68, 0.78, 0.98),
        vec3(0.94, 0.98, 1.0),
        clamp(centerMist * 1.25, 0.0, 1.0)
    );

    vec3 wallFinal = horizonCol;

    if (hitWall) {
        vec3 pHit = ro + rd * t;

        // Compute 3D bumpy crystalline surface normal via finite differences
        vec2 eps = vec2(0.012, 0.0);
        vec3 n = normalize(vec3(
            mapCorridorWall(pHit + eps.xyy, rockRelief) - mapCorridorWall(pHit - eps.xyy, rockRelief),
            mapCorridorWall(pHit + eps.yxy, rockRelief) - mapCorridorWall(pHit - eps.yxy, rockRelief),
            mapCorridorWall(pHit + eps.yyx, rockRelief) - mapCorridorWall(pHit - eps.yyx, rockRelief)
        ));

        // High-frequency micro-facet crystal sparkle normal perturbation
        float micro1 = fbm(pHit.yz * 7.5 + pHit.x * 3.2);
        float micro2 = fbm(pHit.xz * 7.5 - pHit.y * 3.2);
        n = normalize(n + vec3(micro1 - 0.5, micro2 - 0.5, (micro1 - micro2) * 0.5) * 0.38 * rockRelief);

        // Base amethyst / periwinkle / translucent ice-rock albedo
        float rockTex = corridorCrystalRelief(pHit * 1.35) + 0.5;
        vec3 deepAmethyst = vec3(0.16, 0.11, 0.30);
        vec3 lavenderIce  = vec3(0.42, 0.36, 0.68);
        vec3 cyanVein     = vec3(0.38, 0.66, 0.88);
        vec3 baseRockCol  = mix(deepAmethyst, lavenderIce, clamp(rockTex, 0.0, 1.0));
        baseRockCol = mix(baseRockCol, cyanVein, smoothstep(0.55, 0.9, micro1 * micro2 * 2.2) * 0.45);

        // Ambient occlusion in deep rock crevices
        float ao = clamp(0.45 + 0.55 * mapCorridorWall(pHit + n * 0.08, rockRelief) / 0.08, 0.25, 1.0);

        // Evaluate direct diffuse, wet specular reflection, and subsurface scatter from the 3 nearest neon portal frames
        float nearestCellZ = floor(pHit.z / zSpacing + 0.5);
        vec3 totalDiff = vec3(0.0);
        vec3 totalSpec = vec3(0.0);
        vec3 reflDir = reflect(rd, n);

        for (int k = -1; k <= 1; k++) {
            float cellIdx = nearestCellZ + float(k);
            float archZ = cellIdx * zSpacing;

            // Closest point on the rounded-square arch in XY to pHit.xy
            vec2 centerOff = vec2(sin(archZ * 0.18) * 0.08, cos(archZ * 0.15) * 0.06);
            vec2 relXY = pHit.xy - centerOff;
            float d2D = sdRoundSquare2D(relXY, 0.98, 0.30);
            vec2 grad2D = normalize(relXY + 1e-4);
            vec2 archPtXY = pHit.xy - grad2D * d2D;

            vec3 lightPos = vec3(archPtXY, archZ);
            vec3 lVec = lightPos - pHit;
            float lDist = max(length(lVec), 0.06);
            vec3 lDir = lVec / lDist;

            float atten = 1.0 / (1.0 + lDist * lDist * 2.6);
            float angleL = atan(lightPos.y, lightPos.x);
            vec3 lightCol = getNeonArchPalette(cellIdx, angleL, mid);

            // Wrap diffuse + translucent crystal subsurface scattering
            float diff = max(dot(n, lDir) * 0.65 + 0.35, 0.0);
            totalDiff += lightCol * diff * atten * 1.45;

            // Wet glossy ice-rock specular highlight (Blinn-Phong + sharp crystal facet glint)
            vec3 hVec = normalize(lDir - rd);
            float ndoth = max(dot(n, hVec), 0.0);
            float specWide = pow(ndoth, 16.0);
            float specSharp = pow(ndoth, 64.0) * (1.2 + high * 0.8);
            totalSpec += mix(lightCol, vec3(1.0), 0.45) * (specWide * 0.75 + specSharp * 1.35) * atten;
        }

        // Fresnel rim reflection of the bright cyan-white tunnel horizon along grazing cave walls
        float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        vec3 horizonBounce = horizonCol * fresnel * 0.55 * smoothstep(-0.2, 0.85, reflDir.z);

        wallFinal = baseRockCol * (vec3(0.22, 0.20, 0.36) + totalDiff) * ao + totalSpec * ao + horizonBounce;

        // Atmospheric depth fog blending the cave walls into the luminous cyan-white misty horizon
        float fogFactor = 1.0 - exp(-t * t * 0.0085);
        wallFinal = mix(wallFinal, horizonCol * (0.95 + 0.15 * neonBloom), clamp(fogFactor, 0.0, 1.0));
    }

    // Combine shaded crystalline cave walls, horizon mist, and volumetric neon portal arches
    vec3 col = wallFinal + volNeonGlow * neonBloom;

    // Soft filmic HDR tone curve so neon cores stay crisp white while halos bloom richly
    col = col / (1.0 + col * 0.22);
    return clamp(col * 1.18, 0.0, 3.0);
}
`,
  glslEvalExpr:
    'evalNeonCrystalCorridor(domainCoord, uCorridorSpacing, uCorridorRelief, uCorridorBloom)',
  shadertoyHelper: (v) => {
    const sp = (v.portalSpacing ?? 1.85).toFixed(2);
    const rl = (v.rockRelief ?? 1.15).toFixed(2);
    const bl = (v.neonBloom ?? 1.35).toFixed(2);
    return `// Layer 29: Neon Crystal Ice Corridor
float sdRoundSquare2D(vec2 p, float halfSize, float cornerR) {
    vec2 q = abs(p) - vec2(halfSize - cornerR);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cornerR;
}
float corridorCrystalRelief(vec3 p) {
    vec3 q = p * 1.55;
    float baseRock = sin(q.x * 2.1 + sin(q.z * 1.7)) * cos(q.y * 2.1 + cos(q.z * 1.4)) * 0.5 + 0.5;
    float facet1 = abs(sin(q.x * 4.3 + q.z * 2.8) * cos(q.y * 4.1 - q.z * 2.5));
    float noiseLayer = fbm(p.xy * 2.4 + vec2(p.z * 0.65, -p.z * 0.45));
    return (baseRock * 0.45 + (1.0 - facet1) * 0.35 + noiseLayer * 0.35) - 0.52;
}
float mapCorridorWall(vec3 p) {
    vec2 xy = p.xy - vec2(sin(p.z * 0.18) * 0.08, cos(p.z * 0.15) * 0.06);
    return -sdRoundSquare2D(xy, 1.08, 0.34) - corridorCrystalRelief(p) * 0.18 * ${rl};
}
vec3 evalNeonCrystalCorridor(vec2 coord) {
    float zSpacing = 2.65 / ${sp};
    vec3 ro = vec3(sin(iTime * 0.55) * 0.06, cos(iTime * 0.45) * 0.05, iTime * 1.85);
    vec3 rd = normalize(vec3(coord * 1.35, 1.25));
    float t = 0.05;
    vec3 volGlow = vec3(0.0);
    for (int i = 0; i < 48; i++) {
        vec3 p = ro + rd * t;
        float dWall = mapCorridorWall(p);
        float cellZ = floor(p.z / zSpacing + 0.5);
        float localZ = p.z - cellZ * zSpacing;
        vec2 xy = p.xy - vec2(sin(p.z * 0.18) * 0.08, cos(p.z * 0.15) * 0.06);
        float dTube = length(vec2(sdRoundSquare2D(xy, 0.98, 0.30), localZ)) - 0.022;
        vec3 archCol = mix(vec3(0.76, 0.42, 1.0), vec3(1.0, 0.84, 0.56), 0.5 + 0.5 * sin(cellZ * 1.7 + atan(p.y, p.x) * 2.0));
        float stepDist = max(min(dWall * 0.68, max(dTube * 0.75, 0.035)), 0.025);
        volGlow += (vec3(1.0) * exp(-max(dTube, 0.0) * 52.0) * 1.35 + archCol * (0.0024 / (dTube * dTube + 0.0016))) * exp(-t * 0.085) * stepDist;
        if (dWall < 0.006 || t > 22.0) break;
        t += stepDist;
    }
    vec3 horizonCol = mix(vec3(0.68, 0.78, 0.98), vec3(0.94, 0.98, 1.0), exp(-length(coord) * 1.45));
    vec3 baseWall = mix(vec3(0.22, 0.16, 0.42), horizonCol, 1.0 - exp(-t * t * 0.0085));
    return clamp((baseWall + volGlow * ${bl}) * 1.1, 0.0, 3.0);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 29: Neon Crystal Ice Corridor
    col += evalNeonCrystalCorridor(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * 30. Rotating Neon Triangle Portal (Ultra-Crisp Plasma Core & Wet Mirror Floor)
 * Enhances the 20-plane twisting equilateral triangle SDF tunnel with screen-space anti-aliased
 * white-hot plasma cores, dual-stage neon cyan & hot magenta gas bloom, smooth near/far depth
 * enveloping, and true planar mirror reflection on the wet cyber floor.
 */
export const neonTriangleLayer: ShaderLayerDefinition = {
  id: 'neontriangle',
  name: '30. Rotating Neon Triangle Portal',
  shortName: 'Neon Triangle',
  description:
    '20-plane twisting neon cyan & hot-magenta equilateral triangle SDF portal with screen-space razor-sharp white plasma cores, controlled gas bloom, and wet mirror floor reflections.',
  mixUniform: 'uMixNeonTriangle',
  defaultMix: 1.0,
  lfoMix: { freq: 0.24, phase: 0.6, min: 0.5, max: 1.0, decimals: 2 },
  subParams: [
    {
      key: 'twistRate',
      uniformName: 'uTriTwist',
      label: 'Helix Twist & Spin',
      min: 0.2,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.0,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.18, phase: 0.4, min: 0.65, max: 1.75, decimals: 2 },
    },
    {
      key: 'crispness',
      uniformName: 'uTriCrispness',
      label: 'Laser Core Crispness',
      min: 0.5,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.45,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.22, phase: 1.5, min: 1.0, max: 2.1, decimals: 2 },
    },
    {
      key: 'floorReflect',
      uniformName: 'uTriFloorReflect',
      label: 'Wet Floor Reflection',
      min: 0.0,
      max: 1.8,
      step: 0.05,
      defaultValue: 1.1,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.2, phase: 2.3, min: 0.55, max: 1.45, decimals: 2 },
    },
  ],
  glslFunction: `
mat2 triPortalRot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Exact 2D Equilateral Triangle SDF
float sdEquilateralTri(vec2 p, float r) {
    const float k = 1.7320508;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

// Evaluates the 20-slice neon triangle tunnel along a given ray UV (used for both direct view & wet floor reflection)
vec3 traceNeonTriangleStack(vec2 rayUv, float twistScale, float crispness, float bass, float high, float isReflection) {
    vec3 stackCol = vec3(0.0);
    float forwardSpeed = 1.5 + bass * 0.22;
    float zoomScale = 1.0 + max(0.0, uBassZoom) * 1.15;
    float pixelScale = 1.0 / max(iResolution.y * zoomScale, 400.0);

    for (int idx = 0; idx < 20; idx++) {
        float i = float(idx);
        float normDepth = fract((i - iTime * forwardSpeed) / 20.0);
        float zDepth = normDepth * 20.0;

        // Smooth near-camera and far-horizon fade so passing rings never pop or white-out
        float nearFade = smoothstep(0.18, 1.35, zDepth);
        float farFade  = smoothstep(20.0, 14.5, zDepth);
        float depthWindow = nearFade * farFade;

        vec2 p = rayUv * zDepth;

        // Helical twisting and spinning rotation
        float angle = (zDepth * 0.15 + iTime * 0.8) * twistScale;
        p = triPortalRot(angle) * p;

        // Equilateral triangle SDF
        float triRadius = 1.5 + bass * 0.12 * sin(i * 1.57 + iTime * 3.0);
        float rawD = sdEquilateralTri(p, triRadius);
        float dWorld = abs(rawD);
        // Perspective-corrected screen-space distance for razor-sharp anti-aliased laser core at all depths
        float dScreen = dWorld / max(zDepth, 0.35);

        // Alternating electric neon cyan and hot laser magenta
        bool isEven = mod(i, 2.0) < 0.5;
        vec3 ringColor = isEven
            ? vec3(0.0, 0.94, 1.0)   // Electric Neon Cyan
            : vec3(1.0, 0.10, 0.86); // Hot Neon Magenta

        // 1. Razor-sharp screen-space white-hot plasma core (never blurs or pixelates)
        float coreThickness = mix(0.0042, 0.0016, clamp((crispness - 0.5) / 2.0, 0.0, 1.0)) * (1.0 + isReflection * 0.85);
        float aaWidth = max(pixelScale * 1.35, 0.0009);
        float whiteCore = smoothstep(coreThickness + aaWidth, max(0.0, coreThickness - aaWidth), dScreen);

        // 2. Tight chromatic neon tube sheath around the white plasma core
        float tightSheath = 0.0048 / (dScreen * crispness + 0.0038);

        // 3. Controlled outer gas bloom with high-contrast falloff so dark space stays deep
        float gasBloom = exp(-dWorld * (7.5 * crispness)) * 0.62;

        // Subtle secondary inner filament harmonic echo for extra geometric definition
        float innerEchoD = abs(abs(rawD + 0.055) - 0.008) / max(zDepth, 0.45);
        float innerEcho = smoothstep(0.0022, 0.0, innerEchoD) * 0.35 * clamp(crispness - 0.6, 0.0, 1.2);

        float distAtten = 1.0 / (zDepth * 0.36 + 0.32);

        vec3 planeGlow =
            vec3(1.0, 0.99, 1.0) * (whiteCore * 2.85 + innerEcho) +
            ringColor * (tightSheath * 0.72 + gasBloom * 1.15 + whiteCore * 1.25);

        stackCol += planeGlow * distAtten * depthWindow * (1.0 + high * 0.22);
    }

    return stackCol;
}

vec3 evalNeonTrianglePortal(vec2 coord, float twistScale, float crispness, float floorReflect) {
    float bass = clamp(uAudioSub * uAudioReactivity, 0.0, 2.0);
    float mid  = clamp(uAudioMid * uAudioReactivity, 0.0, 2.0);
    float high = clamp(uAudioHigh * uAudioReactivity, 0.0, 2.0);

    // Subtle mouse parallax
    vec2 uv = coord - uMouse * 0.18;
    vec3 ro = vec3(0.0, 0.52, iTime * 3.0);
    vec3 rd = normalize(vec3(uv, 1.0));

    // Deep high-contrast dark obsidian-indigo atmospheric background
    vec3 col = vec3(0.008, 0.011, 0.024);

    // Direct 20-plane spinning neon triangle tunnel
    vec3 directTunnel = traceNeonTriangleStack(uv, twistScale, crispness, bass, high, 0.0);
    col += directTunnel;

    // Reflective cyber floor below the horizon (rd.y < 0.0) that preserves & mirrors the triangles cleanly
    if (rd.y < -0.004 && floorReflect > 0.001) {
        float t = -ro.y / rd.y;
        vec3 hitPos = ro + rd * t;

        // Rippled wet floor normal distortion for realistic neon reflections
        float zWave = sin(hitPos.z * 2.2 - iTime * 3.0);
        float xWave = cos(hitPos.x * 4.5 + hitPos.z * 1.2);
        vec2 floorRipple = vec2(
            sin(hitPos.z * 3.5 + hitPos.x * 4.0 - iTime * 3.2) * 0.008,
            cos(hitPos.z * 5.0 - iTime * 4.0) * 0.006
        ) / (1.0 + t * 0.12);

        // Mirror ray UV vertically across the floor plane to reflect the actual spinning triangles
        vec2 reflUv = vec2(uv.x, -uv.y) + floorRipple;
        vec3 mirroredTriangles = traceNeonTriangleStack(reflUv, twistScale, crispness * 0.85, bass, high, 1.0);

        // Crisp perspective cyber-floor grid & transverse neon ribs
        float floorRibs = smoothstep(0.65, 0.98, sin(hitPos.z * 1.8 - iTime * 4.5) * 0.5 + 0.5);
        float zLines = smoothstep(0.92, 0.995, cos(hitPos.x * 3.14159 * 1.5));
        vec3 floorBase = mix(vec3(0.025, 0.012, 0.055), vec3(0.0, 0.08, 0.18), zWave * 0.5 + 0.5);

        // Central neon light bleed runner along the floor
        float centerBleed = 0.42 / (abs(hitPos.x) * 1.35 + 0.42);
        vec3 bleedTint = mix(vec3(0.0, 0.85, 1.0), vec3(1.0, 0.12, 0.85), 0.5 + 0.5 * sin(hitPos.z * 0.6 - iTime * 3.0 + mid));
        floorBase += bleedTint * centerBleed * (0.14 + 0.18 * floorRibs + 0.12 * zLines);

        // Schlick Fresnel reflectivity: grazing angles near horizon reflect like a dark mirror
        float fresnel = pow(clamp(1.0 - abs(rd.y) * 1.35, 0.0, 1.0), 2.4);
        float floorFog = exp(-t * 0.075);

        vec3 floorComposite = floorBase + mirroredTriangles * (0.38 + 0.48 * fresnel) * floorReflect;
        // Blend floor additive/screen reflection without erasing the foreground bottom vertices of the triangles
        float fgTriangleMask = clamp(dot(directTunnel, vec3(0.333)) * 0.65, 0.0, 0.92);
        col = mix(
            mix(col, floorComposite, floorFog * 0.72 * clamp(floorReflect, 0.0, 1.0)),
            col + mirroredTriangles * 0.35 * floorFog * floorReflect,
            fgTriangleMask
        );
    }

    // Crisp filmic Reinhard + contrast curve so cores gleam pure white and neon hues stay saturated
    col = col / (col + vec3(0.88));
    col = pow(max(col, vec3(0.0)), vec3(0.56));
    return clamp(col * 1.25, 0.0, 3.0);
}
`,
  glslEvalExpr:
    'evalNeonTrianglePortal(domainCoord, uTriTwist, uTriCrispness, uTriFloorReflect)',
  shadertoyHelper: (v) => {
    const tw = (v.twistRate ?? 1.0).toFixed(2);
    const cr = (v.crispness ?? 1.45).toFixed(2);
    const fr = (v.floorReflect ?? 1.1).toFixed(2);
    return `// Layer 30: Rotating Neon Triangle Portal (Ultra-Crisp Plasma Core & Wet Mirror Floor)
mat2 triPortalRot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
float sdEquilateralTri(vec2 p, float r) {
    const float k = 1.7320508;
    p.x = abs(p.x) - r; p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}
vec3 evalNeonTrianglePortal(vec2 uv) {
    vec3 ro = vec3(0.0, 0.52, iTime * 3.0), rd = normalize(vec3(uv, 1.0));
    vec3 col = vec3(0.008, 0.011, 0.024);
    for (int idx = 0; idx < 20; idx++) {
        float i = float(idx);
        float zDepth = fract((i - iTime * 1.5) / 20.0) * 20.0;
        float depthWin = smoothstep(0.18, 1.35, zDepth) * smoothstep(20.0, 14.5, zDepth);
        vec2 p = triPortalRot((zDepth * 0.15 + iTime * 0.8) * ${tw}) * (uv * zDepth);
        float dWorld = abs(sdEquilateralTri(p, 1.5));
        float dScreen = dWorld / max(zDepth, 0.35);
        vec3 ringColor = (mod(i, 2.0) < 0.5) ? vec3(0.0, 0.94, 1.0) : vec3(1.0, 0.10, 0.86);
        float whiteCore = smoothstep(0.0032, 0.0006, dScreen);
        float tightSheath = 0.0048 / (dScreen * ${cr} + 0.0038);
        float gasBloom = exp(-dWorld * (7.5 * ${cr})) * 0.62;
        col += (vec3(1.0) * whiteCore * 2.85 + ringColor * (tightSheath * 0.72 + gasBloom * 1.15 + whiteCore * 1.25)) / (zDepth * 0.36 + 0.32) * depthWin;
    }
    if (rd.y < -0.004) {
        float t = -ro.y / rd.y;
        vec3 hitPos = ro + rd * t;
        float centerBleed = 0.42 / (abs(hitPos.x) * 1.35 + 0.42);
        vec3 floorCol = vec3(0.0, 0.12, 0.24) * centerBleed * (0.5 + 0.5 * sin(hitPos.z * 1.5 - iTime * 3.0)) * ${fr};
        col += floorCol * exp(-t * 0.075);
    }
    col = pow(max(col / (col + vec3(0.88)), vec3(0.0)), vec3(0.56));
    return clamp(col * 1.25, 0.0, 3.0);
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 30: Rotating Neon Triangle Portal
    col += evalNeonTrianglePortal(domainCoord) * ${mix.toFixed(2)};`,
};

export const kleinSphereLayer: ShaderLayerDefinition = {
  id: 'kleinsphere',
  name: '31. 3D Kleinian Sphere Packing',
  shortName: 'Kleinian 3D',
  description:
    '90-step raymarched 3D Kleinian Inversion & Apollonian sphere-packing fractal (6 box-fold + sphere-inversion iterations) with orbital-trap iridescent cosine coloring, tetrahedral surface normals, step ambient occlusion, glowing 3D cyan rim lighting, and cosmic distance fog.',
  mixUniform: 'uMixKleinSphere',
  defaultMix: 1.0,
  lfoMix: { freq: 0.21, phase: 0.5, min: 0.48, max: 1.0, decimals: 2 },
  subParams: [
    {
      key: 'camDist',
      uniformName: 'uKleinSphereCamDist',
      label: 'Camera Distance',
      min: 2.0,
      max: 5.5,
      step: 0.05,
      defaultValue: 3.5,
      format: (v) => v.toFixed(2),
      lfo: { freq: 0.14, phase: 0.4, min: 2.8, max: 4.1, decimals: 2 },
    },
    {
      key: 'orbitColor',
      uniformName: 'uKleinSphereOrbitColor',
      label: 'Orbital Iridescence',
      min: 1.0,
      max: 6.0,
      step: 0.1,
      defaultValue: 3.0,
      format: (v) => `${v.toFixed(1)}x`,
      lfo: { freq: 0.18, phase: 1.2, min: 2.2, max: 4.5, decimals: 1 },
    },
    {
      key: 'rimGlow',
      uniformName: 'uKleinSphereRimGlow',
      label: '3D Cyan Rim Glow',
      min: 0.3,
      max: 3.0,
      step: 0.05,
      defaultValue: 1.5,
      format: (v) => `${v.toFixed(2)}x`,
      lfo: { freq: 0.22, phase: 2.1, min: 1.0, max: 2.4, decimals: 2 },
    },
  ],
  glslFunction: `
// Rotation matrix for camera/lattice movement
mat2 kleinSphereRot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Distance Estimator (DE) for the Kleinian Inversion / Sphere Packing fractal
float kleinSphereMap(vec3 p, out float orbit) {
    // Rotate slightly over time for dynamic view
    p.xy = p.xy * kleinSphereRot(iTime * 0.05);
    p.xz = p.xz * kleinSphereRot(iTime * 0.03);

    vec3 offset = vec3(0.92, 1.15, 0.53);
    float scale = 1.0;
    orbit = 1e10;

    // Iterative sphere inversions and box folds (Kleinian limit set / Apollonian packing)
    for (int i = 0; i < 6; i++) {
        // Box fold
        p = 2.0 * clamp(p, -1.0, 1.0) - p;

        // Sphere inversion
        float r2 = max(dot(p, p), 0.0001);
        orbit = min(orbit, r2);

        float k = max(1.0 / r2, 1.0);
        p *= k;
        scale *= k;

        // Translation
        p += offset;
    }

    // Distance to the core spheres divided by accumulated scale
    return (length(p) - 0.2) / scale;
}

// Standard normal calculation via tetrahedral gradient
vec3 kleinSphereCalcNormal(vec3 p) {
    float dummy = 0.0;
    float h = 0.001;
    vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * kleinSphereMap(p + k.xyy * h, dummy) +
        k.yyx * kleinSphereMap(p + k.yyx * h, dummy) +
        k.yxy * kleinSphereMap(p + k.yxy * h, dummy) +
        k.xxx * kleinSphereMap(p + k.xxx * h, dummy)
    );
}

vec3 evalKleinSpherePacking(vec2 coord, float camDist, float orbitFreq, float rimGlow) {
    float bass = clamp(uAudioSub * uAudioReactivity, 0.0, 2.0);
    float high = clamp(uAudioHigh * uAudioReactivity, 0.0, 2.0);

    vec2 uv = coord - uMouse * 0.15;

    // Camera setup
    vec3 ro = vec3(0.0, 0.0, -camDist);
    vec3 rd = normalize(vec3(uv, 1.5));

    // Raymarching loop
    float t = 0.0;
    float maxDist = 20.0;
    float steps = 0.0;
    float orbit = 0.0;
    bool hit = false;

    for (int i = 0; i < 90; i++) {
        vec3 p = ro + rd * t;
        float d = kleinSphereMap(p, orbit);

        if (d < 0.001) {
            hit = true;
            break;
        }
        if (t > maxDist) {
            break;
        }
        t += d * 0.8; // Safe step multiplier
        steps = float(i);
    }

    vec3 bgCol = vec3(0.01, 0.015, 0.03); // Deep cosmic background
    vec3 col = bgCol;

    if (hit) {
        vec3 p = ro + rd * t;
        vec3 normal = kleinSphereCalcNormal(p);

        // Lighting
        vec3 lightDir = normalize(vec3(1.0, 2.0, -2.0));
        float diff = max(dot(normal, lightDir), 0.0);
        float amb = 0.5 + 0.5 * normal.y;

        // Iridescent coloring based on orbital trap (highlights individual sphere layers)
        vec3 sphereColor = 0.5 + 0.5 * cos(orbit * orbitFreq + vec3(0.0, 2.0, 4.0) + bass * 0.35);

        // Combine lighting components
        col = sphereColor * (diff * 0.8 + amb * 0.2);

        // Ambient occlusion approximation based on raymarch steps
        float ao = clamp(1.0 - steps / 90.0, 0.0, 1.0);
        col *= ao;

        // Rim lighting for a glowing 3D edge effect
        float rim = 1.0 - max(dot(-rd, normal), 0.0);
        col += vec3(0.1, 0.6, 1.0) * pow(rim, 3.0) * rimGlow * (1.0 + high * 0.3);
    }

    // Distance fog to blend into the background
    col = mix(col, bgCol, 1.0 - exp(-0.08 * t * t));

    // Tone mapping and gamma correction
    col = col / (col + vec3(1.0));
    col = pow(max(col, vec3(0.0)), vec3(0.4545));

    return clamp(col, 0.0, 3.0);
}
`,
  glslEvalExpr:
    'evalKleinSpherePacking(domainCoord, uKleinSphereCamDist, uKleinSphereOrbitColor, uKleinSphereRimGlow)',
  shadertoyHelper: (v) => {
    const cd = (v.camDist ?? 3.5).toFixed(2);
    const oc = (v.orbitColor ?? 3.0).toFixed(2);
    const rg = (v.rimGlow ?? 1.5).toFixed(2);
    return `// Layer 31: 3D Kleinian Sphere Packing (90-Step Raymarched Inversion Fractal)
mat2 kleinSphereRot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
float kleinSphereMap(vec3 p, out float orbit) {
    p.xy = p.xy * kleinSphereRot(iTime * 0.05);
    p.xz = p.xz * kleinSphereRot(iTime * 0.03);
    vec3 offset = vec3(0.92, 1.15, 0.53);
    float scale = 1.0; orbit = 1e10;
    for (int i = 0; i < 6; i++) {
        p = 2.0 * clamp(p, -1.0, 1.0) - p;
        float r2 = max(dot(p, p), 0.0001);
        orbit = min(orbit, r2);
        float k = max(1.0 / r2, 1.0);
        p *= k; scale *= k;
        p += offset;
    }
    return (length(p) - 0.2) / scale;
}
vec3 kleinSphereCalcNormal(vec3 p) {
    float dummy = 0.0, h = 0.001; vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * kleinSphereMap(p + k.xyy * h, dummy) +
        k.yyx * kleinSphereMap(p + k.yyx * h, dummy) +
        k.yxy * kleinSphereMap(p + k.yxy * h, dummy) +
        k.xxx * kleinSphereMap(p + k.xxx * h, dummy)
    );
}
vec3 evalKleinSpherePacking(vec2 uv) {
    vec3 ro = vec3(0.0, 0.0, -${cd}), rd = normalize(vec3(uv, 1.5));
    float t = 0.0, steps = 0.0, orbit = 0.0; bool hit = false;
    for (int i = 0; i < 90; i++) {
        float d = kleinSphereMap(ro + rd * t, orbit);
        if (d < 0.001) { hit = true; break; }
        if (t > 20.0) break;
        t += d * 0.8; steps = float(i);
    }
    vec3 bgCol = vec3(0.01, 0.015, 0.03), col = bgCol;
    if (hit) {
        vec3 p = ro + rd * t, normal = kleinSphereCalcNormal(p);
        float diff = max(dot(normal, normalize(vec3(1.0, 2.0, -2.0))), 0.0);
        float amb = 0.5 + 0.5 * normal.y;
        vec3 sphereColor = 0.5 + 0.5 * cos(orbit * ${oc} + vec3(0.0, 2.0, 4.0));
        col = sphereColor * (diff * 0.8 + amb * 0.2) * clamp(1.0 - steps / 90.0, 0.0, 1.0);
        float rim = 1.0 - max(dot(-rd, normal), 0.0);
        col += vec3(0.1, 0.6, 1.0) * pow(rim, 3.0) * ${rg};
    }
    col = mix(col, bgCol, 1.0 - exp(-0.08 * t * t));
    col = col / (col + vec3(1.0));
    return pow(max(col, vec3(0.0)), vec3(0.4545));
}`;
  },
  shadertoyMain: (mix) =>
    `    // Layer 31: 3D Kleinian Sphere Packing
    col += evalKleinSpherePacking(domainCoord) * ${mix.toFixed(2)};`,
};

/**
 * Master Modular Shader Layer Registry (Ordered 01 through 31, unmasked full-viewport layers).
 */
export const SHADER_LAYERS: ShaderLayerDefinition[] = [
  polarTunnelLayer,       // 01. Polar Harmonic Tunnel
  voronoiLayer,           // 02. Voronoi Cellular Ridge
  starfieldLayer,         // 03. Orbital Starfield Drift
  nebulaLayer,            // 04. FBM Nebula & Aurora Clouds
  accretionLayer,         // 05. Event Horizon Accretion Disk
  truchetLayer,           // 06. Truchet Cyber-Conduit Lattice
  plasmaLayer,            // 07. Neon Plasma Wave Caustics
  juliaLayer,             // 08. Animated Julia Set Fractal (400 Iterations)
  coralLayer,             // 09. Bioluminescent Turing Coral
  kaleidoscopeLayer,      // 10. Kaleidoscopic IFS Mandala
  liquidOilLayer,         // 11. Iridescent Ferrofluid Oil
  gyroidLayer,            // 12. Hyperbolic 3D Gyroid Labyrinth
  moireLayer,             // 13. Op-Art Moiré Interference
  quantumWebLayer,        // 14. Quasicrystal Penrose Light Web
  chladniLayer,           // 15. Chladni Acoustic Cymatics
  attractorLayer,         // 16. Clifford Strange Attractor
  tesseractLayer,         // 17. 4D Hypersphere Hopf Fibration
  apollonianLayer,        // 18. Apollonian Kleinian Fractal
  lissajousLayer,         // 19. Lissajous Laser Oscilloscope
  cherenkovLayer,         // 20. Cherenkov Hex-Warp Matrix
  mandelbrotLayer,        // 21. Morphing Mandelbrot Zoom (Audio-Reactive Sub-Bass & Highs)
  circlePackingLayer,     // 22. Recursive Circle Packing
  pentagonalWaveLayer,    // 23. Pentagonal Wave Interference
  kifsCrystalLayer,       // 24. Kaleidoscopic IFS Crystal
  logSpiralVortexLayer,   // 25. Logarithmic Spiral Vortex
  klein4dLayer,           // 26. 4D Kleinian Inversion Lattice
  ps2BiosLayer,           // 27. PS2 BIOS Crystal Towers & 7-Orb Nebula
  ps2VlmLayer,            // 28. PS2 VLM Waveform Ribbon & Spectrum Horizon
  neonCorridorLayer,      // 29. Neon Crystal Ice Corridor
  neonTriangleLayer,      // 30. Rotating Neon Triangle Portal
  kleinSphereLayer,       // 31. 3D Kleinian Sphere Packing
];


