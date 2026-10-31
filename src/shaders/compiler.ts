import {
  MOUSE_DISTORTION_GLSL,
  SHARED_GLSL_UTILS,
} from './commonGlsl';
import { SHADER_LAYERS } from './layers';
import {
  LayerRuntimeState,
  PresetItem,
  ShaderLayerDefinition,
  ShaderState,
} from './types';

const DEFAULT_INITIAL_LAYER_MIXES: Record<string, number> = {
  neontriangle: 1.0,
};

/**
 * Builds the default runtime state for all registered shader layers.
 */
export function buildDefaultLayersState(
  layers: ShaderLayerDefinition[] = SHADER_LAYERS
): Record<string, LayerRuntimeState> {
  const result: Record<string, LayerRuntimeState> = {};
  for (const layer of layers) {
    const values: Record<string, number> = {};
    for (const sub of layer.subParams) {
      values[sub.key] = sub.defaultValue;
    }
    result[layer.id] = {
      mix: DEFAULT_INITIAL_LAYER_MIXES[layer.id] ?? 0.0,
      values,
    };
  }
  return result;
}

/**
 * Builds the default layer order with active default layers at the top of the stack.
 */
export function buildDefaultLayerOrder(
  layers: ShaderLayerDefinition[] = SHADER_LAYERS
): string[] {
  const priorityIds = [
    'neontriangle',
    'neoncorridor',
    'klein4d',
    'kaleidoscope',
    'starfield',
    'mandelbrot',
    'julia',
    'circlepacking',
    'tunnel',
    'voronoi',
    'nebula',
  ];
  const allIds = layers.map((l) => l.id);
  const ordered: string[] = [];
  for (const id of priorityIds) {
    if (allIds.includes(id) && !ordered.includes(id)) {
      ordered.push(id);
    }
  }
  for (const id of allIds) {
    if (!ordered.includes(id)) {
      ordered.push(id);
    }
  }
  return ordered;
}

export const DEFAULT_SHADER_STATE: ShaderState = {
  distortionMode: 0,
  distortionStrength: 1.2,
  swirlTwist: 1.0,
  polarDepth: 0.3,
  flowSpeed: 0.55,
  angularSpeed: 0.08,
  mouseSmoothing: 0.1,
  layerBlendStyle: 1,
  layerCoordSpace: 0,
  negativeSpaceFill: 0.94,
  negativeSpaceThreshold: 0.25,
  trailPersistence: 0.0,
  trailZoomWarp: 0.009,
  crtScanlines: 0.0,
  ps2ColorMatrix: 0.0,
  bassZoomPunch: 0.45,
  layerOrder: buildDefaultLayerOrder(SHADER_LAYERS),
  layers: buildDefaultLayersState(SHADER_LAYERS),
};

/**
 * Helper to create a preset state override cleanly, automatically ordering the preset's
 * active layers from #1 downward so each layer's negative space is filled by the next.
 */
function withLayerOverrides(
  base: ShaderState,
  overrides: {
    distortionMode?: ShaderState['distortionMode'];
    distortionStrength?: number;
    swirlTwist?: number;
    polarDepth?: number;
    flowSpeed?: number;
    angularSpeed?: number;
    layerBlendStyle?: ShaderState['layerBlendStyle'];
    layerCoordSpace?: ShaderState['layerCoordSpace'];
    negativeSpaceFill?: number;
    negativeSpaceThreshold?: number;
    trailPersistence?: number;
    trailZoomWarp?: number;
    crtScanlines?: number;
    ps2ColorMatrix?: number;
    bassZoomPunch?: number;
    layerOrder?: string[];
    mixes: Record<string, number>;
    subValues?: Record<string, Record<string, number>>;
  }
): ShaderState {
  const defaultLayers = buildDefaultLayersState(SHADER_LAYERS);
  const nextLayers: Record<string, LayerRuntimeState> = {};
  for (const layer of SHADER_LAYERS) {
    const def = defaultLayers[layer.id];
    const mix = overrides.mixes[layer.id] ?? 0.0;
    const subOverride = overrides.subValues?.[layer.id] ?? {};
    nextLayers[layer.id] = {
      mix,
      values: { ...def.values, ...subOverride },
    };
  }

  const allIds = SHADER_LAYERS.map((l) => l.id);
  const activePresetIds = Object.keys(overrides.mixes).filter(
    (id) => (overrides.mixes[id] ?? 0) > 0.001 && allIds.includes(id)
  );
  const baseOrder = overrides.layerOrder ?? [
    ...activePresetIds,
    ...base.layerOrder.filter((id) => !activePresetIds.includes(id)),
  ];
  const finalOrder = [
    ...baseOrder.filter((id) => allIds.includes(id)),
    ...allIds.filter((id) => !baseOrder.includes(id)),
  ];

  return {
    ...base,
    distortionMode: overrides.distortionMode ?? 0,
    distortionStrength: overrides.distortionStrength ?? 1.25,
    swirlTwist: overrides.swirlTwist ?? 1.05,
    polarDepth: overrides.polarDepth ?? 0.3,
    flowSpeed: overrides.flowSpeed ?? 0.55,
    angularSpeed: overrides.angularSpeed ?? 0.08,
    layerBlendStyle: overrides.layerBlendStyle ?? 0,
    layerCoordSpace: overrides.layerCoordSpace ?? 0,
    negativeSpaceFill: overrides.negativeSpaceFill ?? 0.92,
    negativeSpaceThreshold: overrides.negativeSpaceThreshold ?? 0.24,
    trailPersistence: overrides.trailPersistence ?? 0.0,
    trailZoomWarp: overrides.trailZoomWarp ?? 0.009,
    crtScanlines: overrides.crtScanlines ?? 0.0,
    ps2ColorMatrix: overrides.ps2ColorMatrix ?? 0.0,
    bassZoomPunch: overrides.bassZoomPunch ?? base.bassZoomPunch ?? 0.45,
    layerOrder: finalOrder,
    layers: nextLayers,
  };
}

export const SHADER_PRESETS: PresetItem[] = [
  // ============================================================================
  // PLAYSTATION 2 (PS2) BIOS & VLM AUDIO VISUALIZER PRESETS
  // ============================================================================
  {
    id: 'ps2-bios-towers-orbs',
    name: 'PS2 System BIOS: Crystal Towers & 7 Orbs',
    subtitle:
      '#1 Layer 27 (PS2 BIOS Monolithic Crystal Towers & 7 Orbiting Cyan Orbs) cascading into #2 Layer 28 (PS2 VLM Waveform Ribbon), #3 Layer 20 (Cherenkov Matrix), and #4 Layer 03 (Orbital Starfield) with Temporal Motion Trails',
    badge: 'PS2 BIOS · Towers & 7 Orbs',
    category: 'ps2-visualizer',
    mechanics: [
      '82% Temporal Trail Smear',
      'PS2 BIOS Towers #1',
      '7-Orb Comet Trails',
      'Y2K Cobalt Matrix',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.15,
        swirlTwist: 0.95,
        polarDepth: 0.32,
        flowSpeed: 0.48,
        angularSpeed: 0.07,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.88,
        negativeSpaceThreshold: 0.22,
        trailPersistence: 0.82,
        trailZoomWarp: 0.009,
        crtScanlines: 0.32,
        ps2ColorMatrix: 0.85,
        layerOrder: ['ps2bios', 'ps2vlm', 'cherenkov', 'starfield'],
        mixes: {
          ps2bios: 0.96,
          ps2vlm: 0.84,
          cherenkov: 0.68,
          starfield: 0.75,
        },
        subValues: {
          ps2bios: { density: 5.5, orbGlow: 1.65, fogDepth: 1.35 },
          ps2vlm: { waveAmp: 1.35, bandCount: 24.0, ribbonGlow: 1.45 },
          cherenkov: { scale: 6.0, pulse: 1.35 },
          starfield: { speed: 1.15, size: 0.055 },
        },
      }),
  },
  {
    id: 'ps2-cd-vlm-waveform',
    name: 'PS2 CD Audio Player: VLM Waveform Ribbon',
    subtitle:
      '#1 Layer 28 (PS2 VLM 3D Oscilloscope Ribbons & Radial EQ) over #2 Layer 19 (Lissajous Laser), #3 Layer 26 (4D Kleinian Lattice), and #4 Layer 01 (Cobalt Polar Tunnel) with Liquid Frame Feedback',
    badge: 'PS2 CD Player · VLM Mode',
    category: 'ps2-visualizer',
    mechanics: [
      '86% VLM Frame Feedback',
      '3D Waveform Ribbons',
      '28-Band Radial EQ',
      'Trinitron Phosphor',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 2,
        distortionStrength: 1.25,
        swirlTwist: 1.15,
        polarDepth: 0.3,
        flowSpeed: 0.65,
        angularSpeed: 0.1,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.86,
        negativeSpaceThreshold: 0.2,
        trailPersistence: 0.86,
        trailZoomWarp: 0.013,
        crtScanlines: 0.36,
        ps2ColorMatrix: 0.72,
        layerOrder: ['ps2vlm', 'lissajous', 'klein4d', 'tunnel'],
        mixes: {
          ps2vlm: 0.98,
          lissajous: 0.82,
          klein4d: 0.76,
          tunnel: 0.72,
        },
        subValues: {
          ps2vlm: { waveAmp: 1.55, bandCount: 28.0, ribbonGlow: 1.65 },
          lissajous: { ratioX: 3.0, ratioY: 4.0, glow: 1.55 },
          tunnel: { freq: 12.0, tone: 0.92, contrast: 2.4 },
        },
      }),
  },
  {
    id: 'ps2-y2k-liquid-feedback',
    name: 'PS2 Late-Night Y2K: Liquid Feedback Matrix',
    subtitle:
      'Hypnotic 88% temporal zoom-feedback loop fusing #1 PS2 VLM Ribbon, #2 PS2 BIOS Towers, #3 KIFS Crystal, and #4 Event Horizon Accretion into liquid cobalt light trails',
    badge: 'PS2 Y2K · 88% Trail Loop',
    category: 'ps2-visualizer',
    mechanics: [
      '88% Liquid Persistence',
      'Inward Zoom Smear',
      'Cobalt-Indigo Grade',
      'Beat-Reactive Surge',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.35,
        swirlTwist: 1.25,
        polarDepth: 0.28,
        flowSpeed: 0.58,
        angularSpeed: 0.09,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.85,
        negativeSpaceThreshold: 0.21,
        trailPersistence: 0.88,
        trailZoomWarp: -0.011,
        crtScanlines: 0.28,
        ps2ColorMatrix: 0.9,
        layerOrder: ['ps2vlm', 'ps2bios', 'kifscrystal', 'accretion'],
        mixes: {
          ps2vlm: 0.92,
          ps2bios: 0.88,
          kifscrystal: 0.78,
          accretion: 0.84,
        },
        subValues: {
          ps2vlm: { waveAmp: 1.45, bandCount: 32.0, ribbonGlow: 1.55 },
          ps2bios: { density: 6.5, orbGlow: 1.75, fogDepth: 1.25 },
          accretion: { radius: 0.16, spin: 1.25 },
        },
      }),
  },
  {
    id: 'ps2-trinitron-cyber-equalizer',
    name: 'PS2 Trinitron 2000: Cyber Spectrum Tunnel',
    subtitle:
      '3D Polar-wrapped #1 PS2 BIOS Towers → #2 Smith Truchet Conduits → #3 PS2 VLM Spectrum → #4 Sapphire Tunnel with Sony Trinitron CRT scanlines',
    badge: 'PS2 Trinitron · 3D Polar',
    category: 'ps2-visualizer',
    mechanics: [
      '3D Polar Wrapping',
      'Trinitron CRT 48%',
      '78% Motion Trails',
      'Sapphire Tunnel',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 1,
        distortionStrength: 1.3,
        swirlTwist: 1.05,
        polarDepth: 0.34,
        flowSpeed: 0.62,
        angularSpeed: 0.08,
        layerBlendStyle: 0,
        layerCoordSpace: 1,
        negativeSpaceFill: 0.9,
        negativeSpaceThreshold: 0.23,
        trailPersistence: 0.78,
        trailZoomWarp: 0.012,
        crtScanlines: 0.48,
        ps2ColorMatrix: 0.8,
        layerOrder: ['ps2bios', 'truchet', 'ps2vlm', 'tunnel'],
        mixes: {
          ps2bios: 0.94,
          truchet: 0.86,
          ps2vlm: 0.82,
          tunnel: 0.88,
        },
        subValues: {
          ps2bios: { density: 5.0, orbGlow: 1.5, fogDepth: 1.2 },
          truchet: { scale: 7.0, pulse: 1.4 },
          tunnel: { freq: 14.0, tone: 0.95, contrast: 2.5 },
        },
      }),
  },
  {
    id: 'ps2-neon-triangle-vlm-overdrive',
    name: 'PS2 Neon Triangle VLM: 84% Trail Overdrive',
    subtitle:
      '#1 Layer 30 (Rotating Neon Triangle Portal) fused with #2 Layer 28 (PS2 VLM Waveform Ribbons & Radial EQ) and #3 Layer 27 (7 Orbiting PS2 Orbs) with 84% liquid motion trails and Trinitron CRT scanlines',
    badge: 'PS2 VLM · Neon Triangles + 84% Trails',
    category: 'ps2-visualizer',
    mechanics: [
      '84% Motion Trails',
      'Layer 30 Neon Triangles',
      'PS2 VLM Oscilloscope',
      'Trinitron Scanlines 30%',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.15,
        swirlTwist: 0.9,
        polarDepth: 0.3,
        flowSpeed: 0.55,
        angularSpeed: 0.08,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.88,
        negativeSpaceThreshold: 0.22,
        trailPersistence: 0.84,
        trailZoomWarp: 0.01,
        crtScanlines: 0.3,
        ps2ColorMatrix: 0.35,
        layerOrder: ['neontriangle', 'ps2vlm', 'ps2bios', 'starfield'],
        mixes: {
          neontriangle: 0.96,
          ps2vlm: 0.88,
          ps2bios: 0.72,
          starfield: 0.6,
        },
        subValues: {
          neontriangle: {
            twistRate: 1.15,
            crispness: 1.65,
            floorReflect: 1.15,
          },
          ps2vlm: { waveAmp: 1.4, bandCount: 28.0, ribbonGlow: 1.5 },
          ps2bios: { density: 5.5, orbGlow: 1.6, fogDepth: 1.1 },
        },
      }),
  },
  {
    id: 'ps2-crystal-corridor-bios-sanctuary',
    name: 'PS2 BIOS Ice Cathedral: Corridor → Towers & 7 Orbs',
    subtitle:
      '#1 Layer 29 (3D Neon Crystal Ice Corridor) opening into #2 Layer 27 (PS2 BIOS Monolithic Towers & 7 Orbiting Orbs) and #3 Layer 28 (VLM Spectrum) with 76% temporal trail smear',
    badge: 'PS2 BIOS · 3D Ice Corridor + 7 Orbs',
    category: 'ps2-visualizer',
    mechanics: [
      'Layer 29 Ice Corridor',
      'PS2 7-Orb Constellation',
      '76% Temporal Smear',
      'Cobalt-Amethyst Grade',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.1,
        swirlTwist: 0.85,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.86,
        negativeSpaceThreshold: 0.22,
        trailPersistence: 0.76,
        trailZoomWarp: 0.008,
        crtScanlines: 0.24,
        ps2ColorMatrix: 0.45,
        layerOrder: ['neoncorridor', 'ps2bios', 'ps2vlm', 'starfield'],
        mixes: {
          neoncorridor: 0.94,
          ps2bios: 0.9,
          ps2vlm: 0.74,
          starfield: 0.65,
        },
        subValues: {
          neoncorridor: {
            portalSpacing: 1.8,
            rockRelief: 1.2,
            neonBloom: 1.4,
          },
          ps2bios: { density: 5.5, orbGlow: 1.75, fogDepth: 1.25 },
          ps2vlm: { waveAmp: 1.25, bandCount: 24.0, ribbonGlow: 1.35 },
        },
      }),
  },

  // ============================================================================
  // NEW LAYERS & NEGATIVE-SPACE CASCADES
  // ============================================================================
  {
    id: 'rotating-neon-triangle-portal-30',
    name: '30. Rotating Neon Triangle Portal (Ultra-Crisp Plasma & Floor)',
    subtitle:
      '20-plane twisting neon cyan & hot-magenta equilateral triangle SDF portal with screen-space anti-aliased white-hot plasma cores, controlled gas bloom, and wet mirror floor reflections',
    badge: 'Layer 30 · Crisp Neon Triangles',
    category: 'new-layers',
    mechanics: [
      'Screen-Space Laser Core',
      '20-Plane Helix Twist',
      'Wet Mirror Floor',
      'Cyan & Hot Magenta',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.0,
        swirlTwist: 0.65,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.92,
        negativeSpaceThreshold: 0.22,
        layerOrder: ['neontriangle', 'starfield'],
        mixes: {
          neontriangle: 1.0,
        },
        subValues: {
          neontriangle: {
            twistRate: 1.0,
            crispness: 1.45,
            floorReflect: 1.1,
          },
        },
      }),
  },
  {
    id: 'neon-triangle-crystal-corridor-30-29',
    name: '30. Rotating Neon Triangles → 29. Neon Crystal Ice Corridor',
    subtitle:
      '#1 Layer 30 (Rotating Neon Triangle Portal) carved over #2 Layer 29 (3D Neon Crystal Ice Corridor) so the crystalline amethyst cave walls glow inside the spinning triangle portal',
    badge: 'Layers 30 → 29 Hybrid Portal',
    category: 'new-layers',
    mechanics: [
      'Layer 30 Neon Triangles',
      'Layer 29 Ice Corridor',
      'Neg-Space 92%',
      'Optical Glow',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.05,
        swirlTwist: 0.75,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.92,
        negativeSpaceThreshold: 0.24,
        layerOrder: ['neontriangle', 'neoncorridor', 'starfield'],
        mixes: {
          neontriangle: 0.96,
          neoncorridor: 0.88,
          starfield: 0.55,
        },
        subValues: {
          neontriangle: {
            twistRate: 1.05,
            crispness: 1.6,
            floorReflect: 0.95,
          },
          neoncorridor: {
            portalSpacing: 1.85,
            rockRelief: 1.15,
            neonBloom: 1.35,
          },
        },
      }),
  },
  {
    id: 'triangle-klein4d-mandala-prism-30-26-10',
    name: '30. Neon Triangles → 26. 4D Kleinian → 10. Sacred Mandala',
    subtitle:
      '#1 Razor-sharp Rotating Neon Triangle Portal framing #2 80-Step 4D Kleinian Inversion Lattice and #3 12-Fold Kaleidoscopic Mandala in the negative-space core',
    badge: 'Layers 30 → 26 → 10 Prism',
    category: 'new-layers',
    mechanics: [
      'Layer 30 Laser Triangles',
      'Layer 26 4D Kleinian',
      'Layer 10 12-Fold Mandala',
      'Neg-Space 95%',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.12,
        swirlTwist: 0.85,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.95,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['neontriangle', 'klein4d', 'kaleidoscope', 'starfield'],
        mixes: {
          neontriangle: 0.96,
          klein4d: 0.9,
          kaleidoscope: 0.82,
          starfield: 0.6,
        },
        subValues: {
          neontriangle: {
            twistRate: 1.2,
            crispness: 1.85,
            floorReflect: 0.85,
          },
          klein4d: { invScale: 10.2, speed: 0.28 },
          kaleidoscope: { folds: 12.0, zoom: 1.45, morph: 1.05 },
        },
      }),
  },
  {
    id: 'inverted-corridor-over-triangles-29-30-05',
    name: 'Order Inversion: 29. Ice Corridor → 30. Neon Triangles → 05. Accretion',
    subtitle:
      'Flips priority so #1 3D Neon Crystal Ice Corridor sculpts the outer cave while #2 Rotating Neon Triangles and #3 Event Horizon Accretion blaze inside the dark rock shadows',
    badge: '#1 Ice Corridor → #2 Triangles → #3 Accretion',
    category: 'order-inversions',
    mechanics: [
      'Priority Flip 29 → 30',
      'Neg-Space 94%',
      'Gate 0.28',
      'Event Horizon Core',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.15,
        swirlTwist: 0.9,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.28,
        layerOrder: ['neoncorridor', 'neontriangle', 'accretion', 'starfield'],
        mixes: {
          neoncorridor: 0.94,
          neontriangle: 0.92,
          accretion: 0.84,
          starfield: 0.6,
        },
        subValues: {
          neoncorridor: {
            portalSpacing: 1.75,
            rockRelief: 1.35,
            neonBloom: 1.2,
          },
          neontriangle: {
            twistRate: 1.35,
            crispness: 1.7,
            floorReflect: 0.9,
          },
          accretion: { radius: 0.18, spin: 1.35 },
        },
      }),
  },
  {
    id: 'polar-wrapped-neon-triangles-corridor',
    name: 'Polar-Wrapped Stargate: 30. Neon Triangles → 29. Ice Corridor → 06. Truchet',
    subtitle:
      'Projects #1 Rotating Neon Triangles and #2 Neon Crystal Ice Corridor into 3D Polar Tunnel space (uCoordSpace = 1) with Bipolar Field warp and #3 Smith Truchet conduits',
    badge: 'Polar Space · Triangles → Corridor → Truchet',
    category: 'polar-wrapped',
    mechanics: [
      '3D Polar Coordinate Warp',
      'Bipolar Field Lens',
      'Layers 30 → 29 → 06',
      'Tunnel Fusion',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 1,
        distortionStrength: 1.28,
        swirlTwist: 1.1,
        polarDepth: 0.34,
        flowSpeed: 0.65,
        angularSpeed: 0.1,
        layerBlendStyle: 0,
        layerCoordSpace: 1,
        negativeSpaceFill: 0.93,
        negativeSpaceThreshold: 0.24,
        layerOrder: ['neontriangle', 'neoncorridor', 'truchet', 'tunnel'],
        mixes: {
          neontriangle: 0.94,
          neoncorridor: 0.88,
          truchet: 0.8,
          tunnel: 0.68,
        },
        subValues: {
          neontriangle: {
            twistRate: 1.15,
            crispness: 1.65,
            floorReflect: 0.8,
          },
          neoncorridor: {
            portalSpacing: 2.0,
            rockRelief: 1.2,
            neonBloom: 1.35,
          },
          truchet: { scale: 7.5, pulse: 1.45 },
          tunnel: { freq: 12.0, tone: 0.88, contrast: 2.5 },
        },
      }),
  },
  {
    id: 'sub-bass-triangle-corridor-mandelbrot-rig',
    name: 'Audio Bass Portal: 30. Neon Triangles → 29. Ice Corridor → 21. Mandelbrot → 20. Cherenkov',
    subtitle:
      'High-impact audio-reactive rig where sub-bass drives #1 Rotating Neon Triangles, #2 3D Crystal Ice Corridor, #3 Seahorse Mandelbrot Zoom, and #4 Cherenkov Hex Shockwaves',
    badge: 'Audio Rig · 30 → 29 → 21 → 20',
    category: 'audio-reactive',
    mechanics: [
      'Sub-Bass Portal Surge',
      'Gravity Ripple Mode',
      '160% Mandelbrot Pull',
      'Cherenkov Hex Pulse',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 2,
        distortionStrength: 1.25,
        swirlTwist: 1.05,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.25,
        layerOrder: [
          'neontriangle',
          'neoncorridor',
          'mandelbrot',
          'cherenkov',
          'starfield',
        ],
        mixes: {
          neontriangle: 0.95,
          neoncorridor: 0.86,
          mandelbrot: 0.84,
          cherenkov: 0.78,
          starfield: 0.55,
        },
        subValues: {
          neontriangle: {
            twistRate: 1.25,
            crispness: 1.75,
            floorReflect: 1.15,
          },
          neoncorridor: {
            portalSpacing: 1.9,
            rockRelief: 1.2,
            neonBloom: 1.45,
          },
          mandelbrot: { baseZoom: 0.44, audioPull: 1.6 },
          cherenkov: { hexScale: 10.0, pulseSpeed: 1.65 },
        },
      }),
  },
  {
    id: 'neon-crystal-ice-corridor-29',
    name: '29. Neon Crystal Ice Corridor (3D Portal Cave)',
    subtitle:
      '3D raymarched rounded-square amethyst & lavender crystalline ice-cave tunnel lined with glowing violet, warm-gold, and cyan neon portal arches and a misty cyan-white horizon',
    badge: 'Layer 29 · 3D Neon Ice Cave',
    category: 'new-layers',
    mechanics: [
      '48-Step 3D Raymarch',
      'Rounded-Square Portals',
      'Wet Crystal Normals',
      'Misty Horizon Bloom',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.0,
        swirlTwist: 0.65,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.92,
        negativeSpaceThreshold: 0.22,
        layerOrder: ['neoncorridor', 'starfield'],
        mixes: {
          neoncorridor: 1.0,
        },
        subValues: {
          neoncorridor: {
            portalSpacing: 1.85,
            rockRelief: 1.15,
            neonBloom: 1.35,
          },
        },
      }),
  },
  {
    id: 'neon-corridor-kifs-starfield-29-24-03',
    name: '29. Neon Crystal Corridor → 24. KIFS Crystal → 03. Starfield',
    subtitle:
      '#1 Layer 29 (Neon Crystal Ice Corridor) cascading into #2 Layer 24 (3D KIFS Crystal) and #3 Layer 03 (Orbital Starfield) inside deep amethyst rock shadows',
    badge: 'Layers 29 → 24 → 03 Cascade',
    category: 'new-layers',
    mechanics: [
      'Layer 29 Neon Corridor',
      'Layer 24 KIFS Crystal',
      'Layer 03 Starfield',
      'Neg-Space 92%',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.1,
        swirlTwist: 0.85,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.92,
        negativeSpaceThreshold: 0.24,
        layerOrder: ['neoncorridor', 'kifscrystal', 'starfield'],
        mixes: {
          neoncorridor: 0.96,
          kifscrystal: 0.72,
          starfield: 0.65,
        },
        subValues: {
          neoncorridor: {
            portalSpacing: 1.95,
            rockRelief: 1.25,
            neonBloom: 1.4,
          },
          kifscrystal: { camDist: 3.3, scale: 2.0 },
          starfield: { speed: 1.0, size: 0.05 },
        },
      }),
  },
  {
    id: 'ferrofluid-penrose-starfield-accretion-11-14-03-05',
    name: '11. Ferrofluid → 14. Penrose → 03. Starfield → 05. Accretion',
    subtitle:
      '#1 Layer 11 (Iridescent Ferrofluid 40%) cascading into #2 Layer 14 (Quasicrystal Penrose 65%), #3 Layer 03 (Orbital Starfield 50%), and #4 Layer 05 (Event Horizon Accretion 98%)',
    badge: 'Layers 11 → 14 → 03 → 05 Cascade',
    category: 'new-layers',
    mechanics: [
      'Layer 11 Ferrofluid 40%',
      'Layer 14 Penrose 65%',
      'Layer 03 Starfield 50%',
      'Layer 05 Accretion 98%',
    ],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.25,
        swirlTwist: 1.05,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['liquidoil', 'quantumweb', 'starfield', 'accretion'],
        mixes: {
          liquidoil: 0.4,
          quantumweb: 0.65,
          starfield: 0.5,
          accretion: 0.98,
        },
        subValues: {
          liquidoil: { density: 3.8, viscosity: 1.25, iridescence: 5.0 },
          quantumweb: { scale: 18.0, sharpness: 2.8 },
          starfield: { speed: 1.0, size: 0.05 },
          accretion: { radius: 0.12, spin: 0.75 },
        },
      }),
  },
  {
    id: 'klein4d-mandala-starfield-26-10-3',
    name: '26. 4D Kleinian → 10. Sacred Mandala → 03. Starfield',
    subtitle:
      '#1 Layer 26 (4D Kleinian Inversion Lattice) cascading into #2 Layer 10 (Kaleidoscopic IFS Mandala) and #3 Layer 03 (Orbital Starfield Drift) in the deep negative space',
    badge: 'Layers 26 → 10 → 03 Cascade',
    category: 'new-layers',
    mechanics: ['Layer 26 4D Kleinian', 'Layer 10 IFS Mandala', 'Layer 03 Starfield', 'Neg-Space 94%'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.2,
        swirlTwist: 1.0,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['klein4d', 'kaleidoscope', 'starfield'],
        mixes: {
          klein4d: 0.96,
          kaleidoscope: 0.88,
          starfield: 0.78,
        },
        subValues: {
          klein4d: { invScale: 10.0, speed: 0.25 },
          kaleidoscope: { folds: 8.0, zoom: 1.45, morph: 1.0 },
          starfield: { speed: 1.0, size: 0.05 },
        },
      }),
  },
  {
    id: 'klein4d-inversion-cathedral',
    name: '4D Kleinian Lattice → 400-Iter Julia → 3D KIFS Crystal',
    subtitle:
      '#1 80-step 4D raymarched Kleinian spherical inversion lattice whose dark 4D polytope cavities reveal #2 400-Iteration Julia filaments and #3 3D KIFS Crystal',
    badge: '#1 4D Kleinian → #2 Julia (400) → #3 KIFS',
    category: 'new-layers',
    mechanics: ['80-Step 4D Raymarch', 'Neg-Space 94%', '4D Mouse Rotations', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.2,
        swirlTwist: 1.0,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['klein4d', 'julia', 'kifscrystal', 'starfield'],
        mixes: {
          klein4d: 0.98,
          julia: 0.86,
          kifscrystal: 0.78,
          starfield: 0.5,
        },
        subValues: {
          klein4d: { invScale: 10.0, speed: 0.25 },
          julia: { zoom: 2.05, morph: 0.24 },
          kifscrystal: { camDist: 3.3, scale: 2.02 },
        },
      }),
  },
  {
    id: 'klein4d-pure-hyper-journey',
    name: '4D Kleinian Hyper-Tunnel → Log Spiral → Circle Packing',
    subtitle:
      'Showcases the new #1 4D Kleinian Inversion Lattice (k = 10 / dot(p,p)) at full intensity with subtle #2 Log Spiral Vortex and #3 Circle Packing in deep negative space',
    badge: '#1 4D Kleinian Solo + Spiral Void Fill',
    category: 'new-layers',
    mechanics: ['80-Step 4D Lattice', 'Tanh HDR Tone-Map', 'Neg-Space 96%', 'Linear Mix'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.15,
        swirlTwist: 0.95,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.96,
        negativeSpaceThreshold: 0.28,
        layerOrder: ['klein4d', 'logspiralvortex', 'circlepacking'],
        mixes: {
          klein4d: 1.0,
          logspiralvortex: 0.72,
          circlepacking: 0.65,
        },
        subValues: {
          klein4d: { invScale: 10.0, speed: 0.25 },
          logspiralvortex: { arms: 3.0, foldFreq: 4.0 },
          circlepacking: { scale: 1.4, drift: 0.25 },
        },
      }),
  },
  {
    id: 'audio-mandelbrot-seahorse-zoom',
    name: 'Audio Mandelbrot → 400-Iter Julia → Circle Packing',
    subtitle:
      '#1 Mandelbrot Seahorse zoom whose dark interior bulbs and outer void are filled by #2 400-Iteration Julia Set and #3 Recursive Circle Packing',
    badge: '#1 Mandelbrot → #2 Julia → #3 Packing',
    category: 'new-layers',
    mechanics: ['Neg-Space 94%', 'Sub-Bass Zoom Pull', '400-Iter Julia', '2D Planar'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.2,
        swirlTwist: 1.0,
        layerBlendStyle: 0,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.24,
        layerOrder: ['mandelbrot', 'julia', 'circlepacking', 'tunnel', 'starfield'],
        mixes: {
          mandelbrot: 0.95,
          julia: 0.85,
          circlepacking: 0.75,
          tunnel: 0.55,
          starfield: 0.55,
        },
        subValues: {
          mandelbrot: { baseZoom: 0.5, audioPull: 1.25 },
          julia: { zoom: 2.15, morph: 0.24 },
          circlepacking: { scale: 1.4, drift: 0.25 },
        },
      }),
  },
  {
    id: 'kifs-crystal-circle-packing',
    name: '3D KIFS Crystal → Circle Packing → Log Spiral',
    subtitle:
      '#1 64-step 3D raymarched octahedral KIFS crystal with negative space filled by #2 Recursive Circle Packing and #3 Logarithmic Spiral Vortex',
    badge: '#1 KIFS Crystal → #2 Packing → #3 Spiral',
    category: 'new-layers',
    mechanics: ['64-Step 3D KIFS', 'Neg-Space 92%', 'Optical Glow', '2D Planar'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.25,
        swirlTwist: 1.05,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.92,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['kifscrystal', 'circlepacking', 'logspiralvortex', 'starfield'],
        mixes: {
          kifscrystal: 0.95,
          circlepacking: 0.88,
          logspiralvortex: 0.78,
          starfield: 0.5,
        },
        subValues: {
          kifscrystal: { camDist: 3.5, scale: 2.0 },
          circlepacking: { scale: 1.4, drift: 0.25 },
          logspiralvortex: { arms: 3.0, foldFreq: 4.0 },
        },
      }),
  },
  {
    id: 'log-spiral-pentagonal-vortex',
    name: 'Log Spiral Vortex → Pentagonal Waves → Mandelbrot',
    subtitle:
      '#1 Log-polar quantum vortex whose negative-space channels reveal #2 Pentagonal 5-Wave Interference and #3 Audio Mandelbrot',
    badge: '#1 Log Spiral → #2 Pentagonal → #3 Mandelbrot',
    category: 'new-layers',
    mechanics: ['Log-Polar Fold', '5-Wave Quasicrystal', 'Bipolar Field', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 1,
        distortionStrength: 1.3,
        swirlTwist: 1.15,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.92,
        negativeSpaceThreshold: 0.26,
        layerOrder: ['logspiralvortex', 'pentagonalwave', 'mandelbrot'],
        mixes: {
          logspiralvortex: 0.95,
          pentagonalwave: 0.85,
          mandelbrot: 0.8,
        },
        subValues: {
          logspiralvortex: { arms: 3.0, foldFreq: 4.0 },
          pentagonalwave: { scale: 6.0, modDepth: 2.5 },
          mandelbrot: { baseZoom: 0.48, audioPull: 1.2 },
        },
      }),
  },
  {
    id: 'circle-packing-cathedral-cascade',
    name: 'Circle Packing → KIFS Crystal → Pentagonal Waves',
    subtitle:
      '#1 Conformal Recursive Circle Packing whose dark circular voids open directly into #2 3D KIFS Crystal facets and #3 Pentagonal Waves',
    badge: '#1 Packing → #2 KIFS → #3 Pentagonal',
    category: 'new-layers',
    mechanics: ['Neg-Space 96%', 'Gate 0.28', 'Conformal Inversion', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.18,
        swirlTwist: 0.95,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.96,
        negativeSpaceThreshold: 0.28,
        layerOrder: ['circlepacking', 'kifscrystal', 'pentagonalwave', 'starfield'],
        mixes: {
          circlepacking: 0.96,
          kifscrystal: 0.9,
          pentagonalwave: 0.78,
          starfield: 0.55,
        },
        subValues: {
          circlepacking: { scale: 1.55, drift: 0.3 },
          kifscrystal: { camDist: 3.15, scale: 2.08 },
          pentagonalwave: { scale: 7.2, modDepth: 2.8 },
        },
      }),
  },
  {
    id: 'pentagonal-quasicrystal-sanctuary',
    name: 'Pentagonal Waves → Log Spiral → 400-Iter Julia',
    subtitle:
      '#1 5-Fold Pentagonal Interference lattice with high negative-space gate threshold so #2 Log Spiral Vortex and #3 400-Iter Julia glow through nodal troughs',
    badge: '#1 Pentagonal → #2 Spiral → #3 Julia (400)',
    category: 'new-layers',
    mechanics: ['High Gate 0.34', 'Neg-Space 95%', 'Gravity Ripple', 'Linear Mix'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 2,
        distortionStrength: 1.25,
        swirlTwist: 1.1,
        layerBlendStyle: 2,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.95,
        negativeSpaceThreshold: 0.34,
        layerOrder: ['pentagonalwave', 'logspiralvortex', 'julia', 'circlepacking'],
        mixes: {
          pentagonalwave: 0.92,
          logspiralvortex: 0.88,
          julia: 0.85,
          circlepacking: 0.65,
        },
        subValues: {
          pentagonalwave: { scale: 8.0, modDepth: 3.2 },
          logspiralvortex: { arms: 5.0, foldFreq: 4.8 },
          julia: { zoom: 1.95, morph: 0.22 },
        },
      }),
  },
  {
    id: 'new-quintet-showcase',
    name: 'The New Quintet: All 5 New Shaders Stacked',
    subtitle:
      'Pure 5-stage negative-space cascade combining #1 Mandelbrot → #2 Circle Packing → #3 KIFS Crystal → #4 Log Spiral → #5 Pentagonal Waves',
    badge: 'Mandelbrot → Pack → KIFS → Spiral → Pent',
    category: 'new-layers',
    mechanics: ['All 5 New Shaders', 'Neg-Space 94%', '5-Stage Cascade', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.22,
        swirlTwist: 1.0,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.27,
        layerOrder: [
          'mandelbrot',
          'circlepacking',
          'kifscrystal',
          'logspiralvortex',
          'pentagonalwave',
        ],
        mixes: {
          mandelbrot: 0.94,
          circlepacking: 0.88,
          kifscrystal: 0.84,
          logspiralvortex: 0.78,
          pentagonalwave: 0.72,
        },
        subValues: {
          mandelbrot: { baseZoom: 0.46, audioPull: 1.3 },
          circlepacking: { scale: 1.45, drift: 0.26 },
          kifscrystal: { camDist: 3.35, scale: 2.02 },
          logspiralvortex: { arms: 4.0, foldFreq: 4.2 },
          pentagonalwave: { scale: 6.4, modDepth: 2.6 },
        },
      }),
  },

  // ============================================================================
  // DEEP FRACTAL CASCADES (400-ITER JULIA, MANDELBROT, APOLLONIAN, KIFS)
  // ============================================================================
  {
    id: 'julia-400-deep-fractal-vortex',
    name: '400-Iter Julia → Mandelbrot → Polar Vortex',
    subtitle:
      '#1 Ultra-deep 400-iteration Julia set fractal whose negative space is inhabited by #2 Seahorse Mandelbrot, #3 Polar Tunnel, and #4 Voronoi',
    badge: '#1 Julia (400) → #2 Mandelbrot → #3 Tunnel',
    category: 'fractal-cascades',
    mechanics: ['400-Iter Julia', 'Interior Basin Fill', 'Neg-Space 94%', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.25,
        swirlTwist: 1.05,
        layerBlendStyle: 0,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.24,
        layerOrder: ['julia', 'mandelbrot', 'tunnel', 'voronoi', 'starfield'],
        mixes: {
          julia: 0.95,
          mandelbrot: 0.85,
          tunnel: 0.78,
          voronoi: 0.65,
          starfield: 0.65,
        },
        subValues: {
          julia: { zoom: 2.15, morph: 0.24 },
          mandelbrot: { baseZoom: 0.45, audioPull: 1.15 },
          tunnel: { freq: 12.0, tone: 0.45, contrast: 2.5 },
        },
      }),
  },
  {
    id: 'seahorse-valley-kifs-core',
    name: 'Deep Seahorse Mandelbrot → 3D KIFS Crystal → Apollonian',
    subtitle:
      '#1 Tight 0.24x Seahorse Valley Mandelbrot zoom whose black cardioid interior reveals a rotating #2 3D KIFS Crystal and #3 Apollonian Gasket',
    badge: '#1 Deep Mandelbrot → #2 KIFS → #3 Apollonian',
    category: 'fractal-cascades',
    mechanics: ['0.24x Deep Zoom', 'Cardioid Void Fill', 'Neg-Space 97%', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.15,
        swirlTwist: 0.9,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.97,
        negativeSpaceThreshold: 0.23,
        layerOrder: ['mandelbrot', 'kifscrystal', 'apollonian', 'starfield'],
        mixes: {
          mandelbrot: 0.98,
          kifscrystal: 0.92,
          apollonian: 0.82,
          starfield: 0.6,
        },
        subValues: {
          mandelbrot: { baseZoom: 0.24, audioPull: 1.45 },
          kifscrystal: { camDist: 2.95, scale: 2.12 },
          apollonian: { scale: 1.85, fold: 1.34 },
        },
      }),
  },
  {
    id: 'julia-400-circle-packing-kleinian',
    name: '400-Iter Julia → Circle Packing → Apollonian Kleinian',
    subtitle:
      'Triple conformal fractal nesting: #1 400-Iteration Julia filaments framing #2 Recursive Circle Packing and #3 Kleinian Sphere Inversion',
    badge: '#1 Julia (400) → #2 Packing → #3 Kleinian',
    category: 'fractal-cascades',
    mechanics: ['400-Iter Julia', 'Triple Conformal', 'Neg-Space 95%', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 1,
        distortionStrength: 1.28,
        swirlTwist: 1.1,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.95,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['julia', 'circlepacking', 'apollonian', 'nebula'],
        mixes: {
          julia: 0.96,
          circlepacking: 0.9,
          apollonian: 0.82,
          nebula: 0.55,
        },
        subValues: {
          julia: { zoom: 1.85, morph: 0.28 },
          circlepacking: { scale: 1.65, drift: 0.28 },
          apollonian: { scale: 1.75, fold: 1.32 },
        },
      }),
  },
  {
    id: 'apollonian-kifs-mandala-cathedral',
    name: 'Apollonian Kleinian → 3D KIFS Crystal → 16-Fold Mandala',
    subtitle:
      '#1 Kleinian sphere-packing foam whose circular interstices are filled by #2 3D KIFS Crystal spires and #3 16-Fold Kaliset Mandala',
    badge: '#1 Apollonian → #2 KIFS → #3 Mandala',
    category: 'fractal-cascades',
    mechanics: ['Kleinian Foam', '16-Fold Symmetry', 'Neg-Space 93%', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.3,
        swirlTwist: 1.15,
        layerBlendStyle: 0,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.93,
        negativeSpaceThreshold: 0.26,
        layerOrder: ['apollonian', 'kifscrystal', 'kaleidoscope', 'tunnel'],
        mixes: {
          apollonian: 0.95,
          kifscrystal: 0.88,
          kaleidoscope: 0.8,
          tunnel: 0.55,
        },
        subValues: {
          apollonian: { scale: 1.9, fold: 1.36 },
          kifscrystal: { camDist: 3.2, scale: 1.98 },
          kaleidoscope: { folds: 16.0, zoom: 1.6, morph: 1.1 },
        },
      }),
  },
  {
    id: 'iridescent-ferrofluid-dream',
    name: '400-Iter Julia → Iridescent Ferrofluid → Plasma',
    subtitle:
      '#1 400-Iteration Julia tendrils whose negative-space basins are filled with #2 Swirling Thin-Film Ferrofluid Oil and #3 Neon Plasma',
    badge: '#1 Julia (400) → #2 Ferrofluid → #3 Plasma',
    category: 'fractal-cascades',
    mechanics: ['400-Iter Julia', 'Thin-Film Oil', 'Neg-Space 92%', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.55,
        swirlTwist: 1.4,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.92,
        negativeSpaceThreshold: 0.24,
        layerOrder: ['julia', 'liquidoil', 'plasma'],
        mixes: {
          julia: 0.92,
          liquidoil: 0.95,
          plasma: 0.72,
        },
        subValues: {
          liquidoil: { density: 4.2, viscosity: 1.35, iridescence: 5.4 },
          julia: { zoom: 2.1, morph: 0.28 },
        },
      }),
  },

  // ============================================================================
  // LAYER ORDER INVERSIONS & NEGATIVE-SPACE CARVING MECHANICS
  // ============================================================================
  {
    id: 'inverted-stack-packing-julia-mandelbrot',
    name: 'Order Inversion: Circle Packing → Julia → Mandelbrot',
    subtitle:
      'Reverses Preset #1 priority order (#1 Circle Packing → #2 400-Iter Julia → #3 Mandelbrot) so Mandelbrot only appears inside the dual negative space of Packing & Julia',
    badge: '#1 Packing → #2 Julia → #3 Mandelbrot',
    category: 'order-inversions',
    mechanics: ['Reversed Priority Stack', 'Neg-Space 98%', 'Gate 0.29', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.2,
        swirlTwist: 1.0,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.98,
        negativeSpaceThreshold: 0.29,
        layerOrder: ['circlepacking', 'julia', 'mandelbrot', 'starfield'],
        mixes: {
          circlepacking: 0.95,
          julia: 0.9,
          mandelbrot: 0.92,
          starfield: 0.5,
        },
        subValues: {
          circlepacking: { scale: 1.25, drift: 0.22 },
          julia: { zoom: 1.9, morph: 0.24 },
          mandelbrot: { baseZoom: 0.42, audioPull: 1.35 },
        },
      }),
  },
  {
    id: 'inverted-stack-spiral-kifs-mandelbrot',
    name: 'Order Inversion: Log Spiral → 3D KIFS → Circle Packing',
    subtitle:
      'Places #1 Log Spiral Vortex at the top of the stack with a wide 0.35 negative-space gate so #2 3D KIFS Crystal and #3 Circle Packing erupt between spiral arms',
    badge: '#1 Spiral → #2 KIFS Crystal → #3 Packing',
    category: 'order-inversions',
    mechanics: ['Wide Gate 0.35', 'Neg-Space 96%', '6-Arm Spiral Mask', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 3,
        distortionStrength: 1.3,
        swirlTwist: 1.2,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.96,
        negativeSpaceThreshold: 0.35,
        layerOrder: ['logspiralvortex', 'kifscrystal', 'circlepacking', 'tunnel'],
        mixes: {
          logspiralvortex: 0.94,
          kifscrystal: 0.92,
          circlepacking: 0.85,
          tunnel: 0.5,
        },
        subValues: {
          logspiralvortex: { arms: 6.0, foldFreq: 3.4 },
          kifscrystal: { camDist: 3.1, scale: 2.05 },
          circlepacking: { scale: 1.5, drift: 0.28 },
        },
      }),
  },
  {
    id: 'razor-stencil-chladni-mandelbrot-kifs',
    name: 'Razor Nodal Stencil: Cymatics → Mandelbrot → KIFS Crystal',
    subtitle:
      'Ultra-sharp Chladni nodal lines (#1) act as a fine acoustic wireframe stencil over #2 Audio Mandelbrot and #3 3D KIFS Crystal in the antinode voids',
    badge: '#1 Cymatics → #2 Mandelbrot → #3 KIFS',
    category: 'order-inversions',
    mechanics: ['Low Gate 0.16', 'Neg-Space 98%', 'Acoustic Stencil', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.15,
        swirlTwist: 0.95,
        layerBlendStyle: 0,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.98,
        negativeSpaceThreshold: 0.16,
        layerOrder: ['chladni', 'mandelbrot', 'kifscrystal', 'circlepacking'],
        mixes: {
          chladni: 0.96,
          mandelbrot: 0.9,
          kifscrystal: 0.86,
          circlepacking: 0.72,
        },
        subValues: {
          chladni: { modeN: 5.0, modeM: 7.5, sharpness: 28.0 },
          mandelbrot: { baseZoom: 0.38, audioPull: 1.4 },
          kifscrystal: { camDist: 3.3, scale: 2.0 },
        },
      }),
  },
  {
    id: 'event-horizon-fractal-singularity',
    name: 'Black Hole Shadow Fill: Accretion → Mandelbrot → Log Spiral',
    subtitle:
      '#1 Event Horizon Accretion ring whose central black hole shadow and outer void are filled by #2 Seahorse Mandelbrot and #3 Log Spiral Quantum Vortex',
    badge: '#1 Accretion → #2 Mandelbrot → #3 Spiral',
    category: 'order-inversions',
    mechanics: ['Shadow Core Fill', 'Neg-Space 95%', 'Gate 0.22', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.35,
        swirlTwist: 1.25,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.95,
        negativeSpaceThreshold: 0.22,
        layerOrder: ['accretion', 'mandelbrot', 'logspiralvortex', 'starfield'],
        mixes: {
          accretion: 0.96,
          mandelbrot: 0.9,
          logspiralvortex: 0.82,
          starfield: 0.65,
        },
        subValues: {
          accretion: { radius: 0.28, spin: 1.55 },
          mandelbrot: { baseZoom: 0.44, audioPull: 1.3 },
          logspiralvortex: { arms: 4.0, foldFreq: 4.5 },
        },
      }),
  },
  {
    id: 'lissajous-cage-over-kifs-julia',
    name: 'Laser Cage: Lissajous → 3D KIFS Crystal → 400-Iter Julia',
    subtitle:
      '#1 High-bloom CRT Lissajous harmonic laser beams carving bright vector cages whose dark cells reveal #2 3D KIFS Crystal and #3 400-Iter Julia',
    badge: '#1 Lissajous → #2 KIFS → #3 Julia (400)',
    category: 'order-inversions',
    mechanics: ['Vector Cage Mask', 'Neg-Space 96%', 'Shear & Torsion', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 3,
        distortionStrength: 1.25,
        swirlTwist: 1.1,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.96,
        negativeSpaceThreshold: 0.2,
        layerOrder: ['lissajous', 'kifscrystal', 'julia', 'pentagonalwave'],
        mixes: {
          lissajous: 0.96,
          kifscrystal: 0.9,
          julia: 0.85,
          pentagonalwave: 0.68,
        },
        subValues: {
          lissajous: { ratioX: 5.0, ratioY: 6.0, glow: 1.45 },
          kifscrystal: { camDist: 3.25, scale: 2.04 },
          julia: { zoom: 2.05, morph: 0.25 },
        },
      }),
  },

  // ============================================================================
  // 3D POLAR TUNNEL-WRAPPED COORDINATE SPACE (layerCoordSpace: 1)
  // ============================================================================
  {
    id: 'polar-wrapped-mandelbrot-julia-wormhole',
    name: 'Polar-Wrapped Wormhole: Mandelbrot → Julia → Circle Packing',
    subtitle:
      'Activates 3D Polar Tunnel Warp coordinate space (uCoordSpace = 1) so #1 Mandelbrot, #2 400-Iter Julia, and #3 Circle Packing wrap seamlessly around the cylindrical wormhole walls',
    badge: 'Polar Space · Mandelbrot → Julia → Pack',
    category: 'polar-wrapped',
    mechanics: ['3D Polar Space', 'Seamless Wormhole', 'Neg-Space 93%', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.35,
        swirlTwist: 1.2,
        polarDepth: 0.36,
        flowSpeed: 0.65,
        angularSpeed: 0.12,
        layerBlendStyle: 0,
        layerCoordSpace: 1,
        negativeSpaceFill: 0.93,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['mandelbrot', 'julia', 'circlepacking', 'tunnel', 'starfield'],
        mixes: {
          mandelbrot: 0.94,
          julia: 0.88,
          circlepacking: 0.8,
          tunnel: 0.72,
          starfield: 0.65,
        },
        subValues: {
          mandelbrot: { baseZoom: 0.55, audioPull: 1.25 },
          julia: { zoom: 2.0, morph: 0.22 },
          circlepacking: { scale: 1.35, drift: 0.25 },
          tunnel: { freq: 14.0, tone: 0.88, contrast: 2.6 },
        },
      }),
  },
  {
    id: 'polar-wrapped-kifs-pentagonal-stargate',
    name: 'Polar-Wrapped KIFS Crystal → Pentagonal → Log Spiral',
    subtitle:
      'Projects #1 3D KIFS Crystal, #2 Pentagonal Quasicrystal Waves, and #3 Log Spiral into polar tunnel space (0.38 / r) with reverse radial flow',
    badge: 'Polar Space · KIFS → Pentagonal → Spiral',
    category: 'polar-wrapped',
    mechanics: ['3D Polar Space', 'Reverse Flow -0.75', 'Bipolar Field', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 1,
        distortionStrength: 1.4,
        swirlTwist: 1.25,
        polarDepth: 0.38,
        flowSpeed: -0.75,
        angularSpeed: 0.14,
        layerBlendStyle: 1,
        layerCoordSpace: 1,
        negativeSpaceFill: 0.92,
        negativeSpaceThreshold: 0.26,
        layerOrder: ['kifscrystal', 'pentagonalwave', 'logspiralvortex', 'tunnel'],
        mixes: {
          kifscrystal: 0.92,
          pentagonalwave: 0.86,
          logspiralvortex: 0.8,
          tunnel: 0.65,
        },
        subValues: {
          kifscrystal: { camDist: 3.4, scale: 1.96 },
          pentagonalwave: { scale: 5.6, modDepth: 2.4 },
          logspiralvortex: { arms: 4.0, foldFreq: 3.8 },
          tunnel: { freq: 16.0, tone: 0.12, contrast: 2.7 },
        },
      }),
  },
  {
    id: 'polar-wrapped-circle-packing-voronoi-conduit',
    name: 'Polar-Wrapped Circle Packing → Voronoi → Truchet Conduits',
    subtitle:
      'Cylindrical polar projection where #1 Recursive Circle Packing cells interlock with #2 Golden Voronoi Ridges and #3 Smith Truchet cyber-conduits',
    badge: 'Polar Space · Packing → Voronoi → Truchet',
    category: 'polar-wrapped',
    mechanics: ['3D Polar Space', 'Neg-Space 94%', 'Fast Flow 0.95', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.3,
        swirlTwist: 1.15,
        polarDepth: 0.34,
        flowSpeed: 0.95,
        angularSpeed: 0.1,
        layerBlendStyle: 0,
        layerCoordSpace: 1,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.24,
        layerOrder: ['circlepacking', 'voronoi', 'truchet', 'tunnel', 'starfield'],
        mixes: {
          circlepacking: 0.92,
          voronoi: 0.86,
          truchet: 0.82,
          tunnel: 0.75,
          starfield: 0.6,
        },
        subValues: {
          circlepacking: { scale: 1.3, drift: 0.26 },
          voronoi: { scale: 8.0, edge: 0.07, jitter: 0.42 },
          truchet: { scale: 8.0, pulse: 1.5 },
          tunnel: { freq: 12.0, tone: 0.48, contrast: 2.5 },
        },
      }),
  },
  {
    id: 'polar-gyroid-coral-abyss',
    name: 'Polar-Wrapped 3D Gyroid → Turing Coral → Ferrofluid Oil',
    subtitle:
      'Organic hyperbolic biomorphic tunnel wrapping #1 3D Gyroid minimal surface, #2 Bioluminescent Turing Coral, and #3 Iridescent Ferrofluid Oil in polar coordinates',
    badge: 'Polar Space · Gyroid → Coral → Ferrofluid',
    category: 'polar-wrapped',
    mechanics: ['3D Polar Space', 'Gravity Ripple', 'Biomorphic Tunnel', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 2,
        distortionStrength: 1.4,
        swirlTwist: 1.15,
        polarDepth: 0.42,
        flowSpeed: 0.6,
        angularSpeed: 0.09,
        layerBlendStyle: 0,
        layerCoordSpace: 1,
        negativeSpaceFill: 0.91,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['gyroid', 'coral', 'liquidoil', 'tunnel'],
        mixes: {
          gyroid: 0.95,
          coral: 0.88,
          liquidoil: 0.8,
          tunnel: 0.68,
        },
        subValues: {
          gyroid: { freq: 6.25, speed: 1.1 },
          coral: { scale: 11.5, ripple: 1.2 },
          liquidoil: { density: 3.8, viscosity: 1.25, iridescence: 5.0 },
          tunnel: { freq: 12.0, tone: 0.9, contrast: 2.4 },
        },
      }),
  },

  // ============================================================================
  // AUDIO-REACTIVE SUB-BASS & CYMATICS RIGS (ASTRAL DRIFT & WEIGHTLESS)
  // ============================================================================
  {
    id: 'astral-drift-sub-bass-mandelbrot',
    name: 'Astral Drift Rig: Sub-Bass Mandelbrot → Cherenkov → KIFS',
    subtitle:
      'Tuned for heavy sub-bass & crunchy tones: #1 Mandelbrot with 165% Audio Sub-Bass Zoom Pull & Kick Flash over #2 Cherenkov Hex Shockwaves and #3 3D KIFS Crystal',
    badge: '165% Audio Pull · Mandelbrot → Cherenkov',
    category: 'audio-reactive',
    mechanics: ['165% Sub-Bass Pull', 'Kick Flash Boost', 'Cherenkov Shockwave', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 2,
        distortionStrength: 1.35,
        swirlTwist: 1.1,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.95,
        negativeSpaceThreshold: 0.25,
        layerOrder: ['mandelbrot', 'cherenkov', 'kifscrystal', 'lissajous', 'starfield'],
        mixes: {
          mandelbrot: 0.98,
          cherenkov: 0.9,
          kifscrystal: 0.82,
          lissajous: 0.68,
          starfield: 0.6,
        },
        subValues: {
          mandelbrot: { baseZoom: 0.44, audioPull: 1.65 },
          cherenkov: { hexScale: 11.0, pulseSpeed: 1.75 },
          kifscrystal: { camDist: 3.2, scale: 2.04 },
          lissajous: { ratioX: 3.0, ratioY: 4.0, glow: 1.55 },
        },
      }),
  },
  {
    id: 'weightless-ethereal-choir-vortex',
    name: 'Weightless Rig: 400-Iter Julia → Log Spiral → 4D Hopf → Nebula',
    subtitle:
      'Tuned for ethereal vocal choirs & liquid drumnbass: #1 400-Iter Julia tendrils flowing into #2 Logarithmic Spiral Vortex, #3 4D Hopf Fibration rings, and #4 Aurora Nebula',
    badge: 'Weightless · Julia (400) → Spiral → 4D Hopf',
    category: 'audio-reactive',
    mechanics: ['400-Iter Julia', '4D Hopf Tori', 'Silky Flow 0.40', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.15,
        swirlTwist: 0.95,
        polarDepth: 0.28,
        flowSpeed: 0.4,
        angularSpeed: 0.06,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.93,
        negativeSpaceThreshold: 0.24,
        layerOrder: ['julia', 'logspiralvortex', 'tesseract', 'nebula', 'starfield'],
        mixes: {
          julia: 0.94,
          logspiralvortex: 0.86,
          tesseract: 0.82,
          nebula: 0.72,
          starfield: 0.68,
        },
        subValues: {
          julia: { zoom: 2.05, morph: 0.22 },
          logspiralvortex: { arms: 3.0, foldFreq: 3.6 },
          tesseract: { spin4d: 0.85, fibers: 10.0 },
          nebula: { scale: 2.6, warp: 1.35 },
        },
      }),
  },
  {
    id: 'chladni-cymatics-hopf4d',
    name: 'Chladni Cymatics → 4D Hopf → Polar Tunnel',
    subtitle:
      '#1 Audio-reactive Chladni acoustic nodal lines whose dark antinodes are filled by #2 4D Hopf fibration circles and #3 Polar Tunnel',
    badge: '#1 Cymatics → #2 4D Hopf → #3 Tunnel',
    category: 'audio-reactive',
    mechanics: ['Acoustic Nodal Plate', '4D Hypersphere', 'Neg-Space 94%', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.15,
        swirlTwist: 0.95,
        layerBlendStyle: 0,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.94,
        negativeSpaceThreshold: 0.22,
        layerOrder: ['chladni', 'tesseract', 'tunnel', 'starfield'],
        mixes: {
          chladni: 0.95,
          tesseract: 0.88,
          tunnel: 0.78,
          starfield: 0.6,
        },
        subValues: {
          chladni: { modeN: 4.0, modeM: 6.5, sharpness: 20.0 },
          tesseract: { spin4d: 1.15, fibers: 10.0 },
          tunnel: { freq: 12.0, tone: 0.45, contrast: 2.5 },
        },
      }),
  },
  {
    id: 'clifford-attractor-hopf',
    name: 'Clifford Attractor → 4D Torus → Nebula',
    subtitle:
      '#1 Chaotic phase-space bioluminescent attractor ribbons with negative space filled by #2 4D Hopf fibration rings and #3 FBM Nebula',
    badge: '#1 Attractor → #2 4D Hopf → #3 Nebula',
    category: 'audio-reactive',
    mechanics: ['Chaotic Phase Flow', 'Bipolar Field', 'Neg-Space 92%', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 1,
        distortionStrength: 1.35,
        swirlTwist: 1.2,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        layerOrder: ['attractor', 'tesseract', 'nebula', 'starfield'],
        mixes: {
          attractor: 0.95,
          tesseract: 0.85,
          nebula: 0.65,
          starfield: 0.55,
        },
        subValues: {
          attractor: { chaos: 1.85, fold: 1.25 },
          tesseract: { spin4d: 1.25, fibers: 12.0 },
        },
      }),
  },
  {
    id: 'lissajous-laser-cherenkov',
    name: 'Lissajous Laser → Cherenkov Matrix → Plasma',
    subtitle:
      '#1 CRT phosphor harmonic laser curves whose dark void reveals #2 Relativistic Cherenkov hex reactor grid and #3 Neon Plasma',
    badge: '#1 Lissajous → #2 Cherenkov → #3 Plasma',
    category: 'audio-reactive',
    mechanics: ['CRT Laser Harmonics', 'Gravity Ripple', 'Hex Shockwaves', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 2,
        distortionStrength: 1.3,
        swirlTwist: 1.05,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        layerOrder: ['lissajous', 'cherenkov', 'plasma', 'tunnel'],
        mixes: {
          lissajous: 1.0,
          cherenkov: 0.92,
          plasma: 0.65,
          tunnel: 0.55,
        },
        subValues: {
          lissajous: { ratioX: 3.0, ratioY: 5.0, glow: 1.5 },
          cherenkov: { hexScale: 10.0, pulseSpeed: 1.45 },
        },
      }),
  },
  {
    id: 'kaleidoscopic-dmt-mandala',
    name: 'Kaleidoscopic Mandala → Ferrofluid Oil → Penrose',
    subtitle:
      '#1 12-fold dihedral mirror Kaliset mandala whose negative-space pockets are filled by #2 Iridescent Liquid Oil and #3 Quasicrystal Web',
    badge: '#1 Mandala → #2 Oil → #3 Quasicrystal',
    category: 'fractal-cascades',
    mechanics: ['12-Fold Mirror IFS', 'Thin-Film Oil', '7-Wave Penrose', 'Optical Glow'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.35,
        swirlTwist: 1.15,
        layerBlendStyle: 1,
        layerCoordSpace: 0,
        layerOrder: ['kaleidoscope', 'liquidoil', 'quantumweb', 'starfield'],
        mixes: {
          kaleidoscope: 1.0,
          liquidoil: 0.78,
          quantumweb: 0.65,
          starfield: 0.5,
        },
        subValues: {
          kaleidoscope: { folds: 12.0, zoom: 1.5, morph: 1.15 },
          liquidoil: { density: 3.8, viscosity: 1.25, iridescence: 5.0 },
        },
      }),
  },
  {
    id: 'hyperbolic-gyroid-labyrinth',
    name: '3D Gyroid Labyrinth → Turing Coral → Tunnel',
    subtitle:
      '#1 Volumetric raymarched 3D gyroid minimal surface whose cavities reveal #2 Bioluminescent Turing Coral and #3 Polar Tunnel',
    badge: '#1 3D Gyroid → #2 Coral → #3 Tunnel',
    category: 'fractal-cascades',
    mechanics: ['3D Minimal Surface', 'Reaction-Diffusion', 'Gravity Ripple', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 2,
        distortionStrength: 1.4,
        swirlTwist: 1.1,
        layerBlendStyle: 0,
        layerCoordSpace: 0,
        layerOrder: ['gyroid', 'coral', 'tunnel', 'nebula'],
        mixes: {
          gyroid: 1.0,
          coral: 0.82,
          tunnel: 0.72,
          nebula: 0.5,
        },
        subValues: {
          gyroid: { freq: 6.0, speed: 1.05 },
          tunnel: { freq: 12.0, tone: 0.15, contrast: 2.4 },
        },
      }),
  },
  {
    id: 'hypnotic-moire-quasicrystal',
    name: 'Op-Art Moiré → Penrose Web → Polar Tunnel',
    subtitle:
      '#1 Counter-rotating logarithmic spiral Moiré interference beats whose dark nodes reveal #2 Penrose Quasicrystal Web and #3 Tunnel',
    badge: '#1 Moiré → #2 Quasicrystal → #3 Tunnel',
    category: 'audio-reactive',
    mechanics: ['46-Ring Moiré Beat', '7-Wave Penrose', 'Bipolar Field', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 1,
        distortionStrength: 1.45,
        swirlTwist: 1.25,
        layerBlendStyle: 0,
        layerCoordSpace: 0,
        layerOrder: ['moire', 'quantumweb', 'tunnel'],
        mixes: {
          moire: 0.92,
          quantumweb: 0.88,
          tunnel: 0.65,
        },
        subValues: {
          moire: { rings: 46.0, arms: 12.0 },
          quantumweb: { scale: 20.0, sharpness: 3.2 },
        },
      }),
  },
  {
    id: 'tunnel-voronoi-starfield',
    name: 'Voronoi Ridge → Amber Tunnel → Starfield',
    subtitle:
      '#1 Golden Voronoi cellular ridges whose dark interior cells are filled by #2 Tungsten-Amber Polar Tunnel and #3 Orbital Stars',
    badge: '#1 Voronoi → #2 Tunnel → #3 Stars',
    category: 'polar-wrapped',
    mechanics: ['3x3 Cellular Ridge', 'Amber Polar Tunnel', '19-Plane Stars', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.25,
        swirlTwist: 1.05,
        layerBlendStyle: 0,
        layerCoordSpace: 1,
        layerOrder: ['voronoi', 'tunnel', 'starfield', 'nebula'],
        mixes: {
          voronoi: 0.9,
          tunnel: 0.88,
          starfield: 0.75,
          nebula: 0.55,
        },
      }),
  },
  {
    id: 'silver-monochrome-vortex',
    name: 'Event Horizon → Silver Tunnel → Starfield',
    subtitle:
      '#1 Relativistic Event Horizon accretion ring whose shadow and outer void are filled by #2 Brushed Silver Tunnel and #3 Starfield',
    badge: '#1 Accretion → #2 Silver Tunnel → #3 Stars',
    category: 'polar-wrapped',
    mechanics: ['Doppler Photon Ring', 'Brushed Silver Tone', 'Neg-Space 92%', 'Tunnel Fusion'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 0,
        distortionStrength: 1.4,
        swirlTwist: 1.2,
        layerCoordSpace: 0,
        layerOrder: ['accretion', 'tunnel', 'starfield', 'nebula'],
        mixes: {
          accretion: 0.95,
          tunnel: 0.92,
          starfield: 0.78,
          nebula: 0.45,
        },
        subValues: {
          tunnel: { freq: 14.0, tone: 0.08, contrast: 2.7 },
          accretion: { radius: 0.22, spin: 1.4 },
        },
      }),
  },
  {
    id: 'cobalt-tunnel-truchet',
    name: 'Truchet Conduits → Cobalt Tunnel → Coral',
    subtitle:
      '#1 Procedural Smith Truchet cyber-conduits whose negative space reveals #2 Sapphire-Cobalt Polar Tunnel and #3 Turing Coral',
    badge: '#1 Truchet → #2 Cobalt Tunnel → #3 Coral',
    category: 'polar-wrapped',
    mechanics: ['3D Polar Space', 'Smith Truchet Arcs', 'Cobalt Tunnel', 'Bipolar Field'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 1,
        distortionStrength: 1.45,
        swirlTwist: 1.05,
        layerCoordSpace: 1,
        layerOrder: ['truchet', 'tunnel', 'coral', 'starfield'],
        mixes: {
          truchet: 0.95,
          tunnel: 0.88,
          coral: 0.72,
          starfield: 0.6,
        },
        subValues: {
          tunnel: { freq: 12.0, tone: 0.92, contrast: 2.5 },
          truchet: { scale: 7.0, pulse: 1.45 },
        },
      }),
  },
  {
    id: 'omni-twenty-five-layer-symphony',
    name: '30-Layer Negative-Space Superposition',
    subtitle:
      'Sequential negative-space cascade across all 30 modular shader layers in priority order',
    badge: 'All 30 Layers',
    category: 'new-layers',
    mechanics: ['All 30 Layers Active', 'Neg-Space 88%', 'Gate 0.26', 'Gravity Ripple'],
    apply: (base) =>
      withLayerOverrides(base, {
        distortionMode: 2,
        distortionStrength: 1.35,
        swirlTwist: 1.15,
        layerCoordSpace: 0,
        negativeSpaceFill: 0.88,
        negativeSpaceThreshold: 0.26,
        mixes: {
          neontriangle: 0.85,
          neoncorridor: 0.82,
          ps2bios: 0.72,
          ps2vlm: 0.68,
          klein4d: 0.78,
          mandelbrot: 0.75,
          julia: 0.7,
          circlepacking: 0.65,
          kifscrystal: 0.65,
          logspiralvortex: 0.6,
          pentagonalwave: 0.55,
          chladni: 0.6,
          tesseract: 0.58,
          lissajous: 0.6,
          cherenkov: 0.55,
          attractor: 0.55,
          apollonian: 0.52,
          kaleidoscope: 0.55,
          gyroid: 0.55,
          liquidoil: 0.5,
          moire: 0.5,
          quantumweb: 0.52,
          truchet: 0.52,
          voronoi: 0.52,
          accretion: 0.55,
          coral: 0.5,
          plasma: 0.48,
          tunnel: 0.6,
          nebula: 0.5,
          starfield: 0.65,
        },
      }),
  },
];

/**
 * Dynamically compiles the complete WebGL Fragment Shader from the modular `SHADER_LAYERS` registry.
 * Supports real-time Negative-Space Cascade Compositing in dynamic `uOrder_<id>` priority order.
 */
export function compileModularFragmentShader(
  layers: ShaderLayerDefinition[] = SHADER_LAYERS
): string {
  // 1. Generate uniform declarations for all registered layers (mix, order rank, and sub-params)
  const uniformLines: string[] = [];
  for (const layer of layers) {
    uniformLines.push(`uniform float ${layer.mixUniform};`);
    uniformLines.push(`uniform float uOrder_${layer.id};`);
    for (const sub of layer.subParams) {
      uniformLines.push(`uniform float ${sub.uniformName};`);
    }
  }

  // 2. Collect each layer's GLSL evaluation functions
  const functionBlocks = layers.map((l) => l.glslFunction.trim()).join('\n\n');

  // 3. Phase 1: Evaluate active layers and compute their foreground presence & negative-space occlusion
  const layerEvalPhase1 = layers
    .map(
      (layer) => `
    // Evaluate Layer: ${layer.name}
    vec3 layerCol_${layer.id} = vec3(0.0);
    float occ_${layer.id} = 0.0;
    if (${layer.mixUniform} > 0.001) {
        vec3 rawCol_${layer.id} = max(${layer.glslEvalExpr}, vec3(0.0));
        float peak_${layer.id} = max(max(rawCol_${layer.id}.r, rawCol_${layer.id}.g), rawCol_${layer.id}.b);
        float luma_${layer.id} = dot(rawCol_${layer.id}, vec3(0.299, 0.587, 0.114));
        float sig_${layer.id} = mix(luma_${layer.id}, peak_${layer.id}, 0.65);
        float fg_${layer.id} = smoothstep(negLowCut, negHighCut, sig_${layer.id});
        // Carve dark haze in negative-space regions so subsequent layers shine cleanly in the negative space
        layerCol_${layer.id} = rawCol_${layer.id} * mix(1.0, fg_${layer.id}, clamp(uNegSpaceFill * 0.85, 0.0, 1.0));
        occ_${layer.id} = clamp(fg_${layer.id} * ${layer.mixUniform} * uNegSpaceFill, 0.0, 0.985);
    }`
    )
    .join('\n');

  // 4. Phase 2: Composite each active layer into the remaining negative space left by all higher-priority layers (uOrder_other < uOrder_layer)
  const layerCompositePhase2 = layers
    .map((layer) => {
      const priorChecks = layers
        .filter((other) => other.id !== layer.id)
        .map(
          (other) =>
            `        if (uOrder_${other.id} < uOrder_${layer.id}) rem_${layer.id} *= (1.0 - occ_${other.id});`
        )
        .join('\n');

      return `
    if (${layer.mixUniform} > 0.001) {
        float rem_${layer.id} = 1.0;
${priorChecks}
        float effWeight_${layer.id} = ${layer.mixUniform} * rem_${layer.id};
        accumGlow += layerCol_${layer.id} * effWeight_${layer.id};
        weightedSum += layerCol_${layer.id} * effWeight_${layer.id};
        totalWeight += effWeight_${layer.id};
    }`;
    })
    .join('\n');

  return `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 uMouse;
uniform vec2 uMouseVel;
uniform float uPulse;
uniform int uMode;
uniform float uDistortion;
uniform float uSwirl;
uniform float uDepth;
uniform float uFlowSpeed;
uniform float uAngularSpeed;
uniform int uBlendStyle;
uniform int uCoordSpace;
uniform float uNegSpaceFill;
uniform float uNegSpaceThreshold;
uniform float uCrtScanlines;
uniform float uPs2ColorMatrix;

// Real-Time Web Audio Analyser Uniforms (Audio-Reactive GLSL Bridge)
uniform float uAudioSub;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uAudioReactivity;
uniform float uBassZoom;

// Dynamically Registered Layer Uniforms
${uniformLines.join('\n')}

${SHARED_GLSL_UTILS}

// Dynamically Registered Layer Functions
${functionBlocks}

void mainImage(out vec4 o, in vec2 fc) {
${MOUSE_DISTORTION_GLSL}

    // Gentle, silky audio-reactive modulation from Web Audio AnalyserNode
    float audioSubBoost = clamp(uAudioSub * uAudioReactivity, 0.0, 1.0) * 0.25;
    float audioMidBoost = clamp(uAudioMid * uAudioReactivity, 0.0, 1.0) * 0.22;
    float audioHighBoost = clamp(uAudioHigh * uAudioReactivity, 0.0, 1.0) * 0.22;

    bool isPolar = (uCoordSpace == 1);
    float fullTheta = uv.y * 2.0;
    vec2 domainCoord = isPolar
        ? vec2(uv.x * 0.28 + cos(fullTheta) * 0.18, sin(fullTheta) * 0.75)
        : p;

    // Base polar tunnel harmonic wave with even integer angular frequency so sin(uv.y * evenTunnelFreq) is 100% seamless
    float evenTunnelFreq = max(2.0, floor(uTunnelFreq * 0.5 + 0.5) * 2.0);
    float baseTunnelWave = sin(uv.x * uTunnelFreq) * sin(uv.y * evenTunnelFreq);
    float baseTunnelSculpt = 0.55 + 0.45 * smoothstep(-0.25, 0.65, baseTunnelWave);

    // Negative-Space Gate Thresholds
    float negLowCut = uNegSpaceThreshold * 0.75;
    float negHighCut = max(negLowCut + 0.08, uNegSpaceThreshold + 0.34);

    vec3 accumGlow = vec3(0.012, 0.016, 0.028);
    vec3 weightedSum = vec3(0.0);
    float totalWeight = 0.0;

    // Phase 1: Evaluate active layers and compute negative-space masks
${layerEvalPhase1}

    // Phase 2: Sequential negative-space cascade according to dynamic uOrder_<id>
${layerCompositePhase2}

    vec3 col = accumGlow;
    if (uBlendStyle == 0) {
        // Tunnel-Sculpted HDR Fusion: sculpts active layers along the polar tunnel ribs & depth
        float radialDepth = clamp(0.28 + r * 2.0, 0.0, 2.15) * (1.0 + audioSubBoost * 0.12);
        vec3 sculpted = accumGlow * mix(1.0, baseTunnelSculpt * radialDepth, 0.42);
        col = sculpted / (1.0 + sculpted * 0.26);
    } else if (uBlendStyle == 1) {
        // Pure Optical Additive Screen with Soft HDR Roll-off
        col = accumGlow / (1.0 + accumGlow * 0.26);
    } else {
        // Normalized Weighted Crossfade
        col = totalWeight > 0.001 ? (weightedSum / max(totalWeight, 1.0)) : accumGlow;
    }

    // Subtle audio-reactive luminance shimmer & cursor lens highlight
    col *= 1.0 + audioMidBoost * 0.08;
    float cursorHalo = exp(-dMouse * 9.5) * (0.05 * uDistortion + 0.18 * uPulse + 0.05 * audioHighBoost);
    col += cursorHalo * vec3(1.0, 0.88, 0.65);

    // Optional Y2K PlayStation 2 Cobalt/Indigo/Cyan Optical Color Matrix
    if (uPs2ColorMatrix > 0.001) {
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 ps2Deep = vec3(0.04, 0.16, 0.58) * luma * 1.45;
        vec3 ps2High = vec3(0.28, 0.82, 1.0) * pow(max(luma, 0.0), 1.35) * 1.65;
        vec3 ps2Graded = mix(ps2Deep + ps2High, col * vec3(0.55, 0.88, 1.32), 0.45);
        col = mix(col, ps2Graded, clamp(uPs2ColorMatrix, 0.0, 1.0));
    }

    // Optional Sony Trinitron CRT Scanline & Aperture Grille Phosphor Mask
    if (uCrtScanlines > 0.001) {
        float scanWave = 0.5 + 0.5 * sin(fc.y * 3.14159265);
        float grilleR = 0.88 + 0.12 * sin(fc.x * 2.094395);
        float grilleG = 0.88 + 0.12 * sin(fc.x * 2.094395 + 2.094395);
        float grilleB = 0.88 + 0.12 * sin(fc.x * 2.094395 + 4.188790);
        vec3 trinitron = col * vec3(grilleR, grilleG, grilleB) * mix(1.0, 0.72 + 0.36 * scanWave, clamp(uCrtScanlines, 0.0, 1.0));
        // Subtle CRT corner vignette
        float vig = smoothstep(1.35, 0.45, length(p0) * 1.25);
        col = mix(col, trinitron * mix(1.0, vig, 0.35), clamp(uCrtScanlines, 0.0, 1.0));
    }

    o = vec4(col, 1.0);
}

void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    gl_FragColor = color;
}
`;
}

/**
 * Generates clean, copy-ready Shadertoy GLSL code from the modular `SHADER_LAYERS` registry,
 * ordered according to `state.layerOrder` with sequential negative-space utilization.
 */
export function generateShadertoyCode(
  state: ShaderState,
  layers: ShaderLayerDefinition[] = SHADER_LAYERS
): string {
  const d = state.polarDepth.toFixed(2);
  const flow = state.flowSpeed.toFixed(2);
  const ang = state.angularSpeed.toFixed(2);
  const dist = state.distortionStrength.toFixed(2);
  const swirl = state.swirlTwist.toFixed(2);
  const negFill = state.negativeSpaceFill.toFixed(2);
  const negLow = (state.negativeSpaceThreshold * 0.75).toFixed(2);
  const negHigh = Math.max(
    state.negativeSpaceThreshold * 0.75 + 0.08,
    state.negativeSpaceThreshold + 0.34
  ).toFixed(2);

  const layerMap = new Map(layers.map((l) => [l.id, l]));
  const orderedLayers = [
    ...state.layerOrder
      .map((id) => layerMap.get(id))
      .filter((l): l is ShaderLayerDefinition => Boolean(l)),
    ...layers.filter((l) => !state.layerOrder.includes(l.id)),
  ];

  const activeLayers = orderedLayers.filter(
    (l) => (state.layers[l.id]?.mix ?? 0) > 0.01
  );

  const helperBlocks: string[] = [
    `vec2 h2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float valueNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x),
               mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0, amp = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) { v += amp * valueNoise(p); p = rot * p * 2.02 + vec2(1.7, 9.2); amp *= 0.5; }
    return v;
}`,
  ];

  for (const layer of activeLayers) {
    if (layer.shadertoyHelper) {
      const subValues = state.layers[layer.id]?.values ?? {};
      helperBlocks.push(layer.shadertoyHelper(subValues));
    }
  }

  let distortionSnippet = '';
  if (state.distortionMode === 0) {
    distortionSnippet = `    vec2 dVec = p0 - m;
    float falloff = exp(-length(dVec) * 2.8);
    vec2 ortho = vec2(-dVec.y, dVec.x);
    vec2 p = (p0 - m * ${(0.55 * state.distortionStrength).toFixed(2)})
           - dVec * (${(0.42 * state.distortionStrength).toFixed(2)} * falloff)
           + ortho * (${(0.35 * state.swirlTwist * state.distortionStrength).toFixed(2)} * falloff);
    float a = atan(p.y, p.x), r = max(length(p), 1e-4);
    float twist = (m.x * ${(state.swirlTwist * 0.9).toFixed(2)}) / (r + 0.18) + (m.y * ${(state.swirlTwist * 0.65).toFixed(2)}) * r;
    vec2 uv = vec2(${d} / r + iTime * ${flow}, (a + twist) * 0.5 + iTime * ${ang});`;
  } else if (state.distortionMode === 1) {
    distortionSnippet = `    vec2 p = p0, pB = p0 - m * ${dist};
    float rA = length(p), rB = length(pB);
    float r = max(mix(rA, sqrt(rA * rB) * 1.35, 0.75), 1e-4);
    float aA = atan(p.y, p.x), aB = atan(pB.y, pB.x);
    float a = aA + aB + sin(aB - aA) * ${(0.75 * state.swirlTwist).toFixed(2)};
    p = vec2(r * cos(a), r * sin(a));
    vec2 uv = vec2(${d} / r + iTime * ${flow}, a * 0.5 + iTime * ${ang});`;
  } else {
    distortionSnippet = `    vec2 dVec = p0 - m;
    float distM = length(dVec), falloff = exp(-distM * 2.2);
    float wave = sin(distM * 14.0 - iTime * 4.5);
    vec2 p = p0 - m * 0.25 + normalize(dVec + 1e-4) * (wave * ${(0.12 * state.distortionStrength).toFixed(2)} * falloff);
    float a = atan(p.y, p.x), r = max(length(p), 1e-4);
    vec2 uv = vec2(${d} / r + iTime * ${flow}, (a + falloff * ${swirl}) * 0.5 + iTime * ${ang});`;
  }

  const mainBlendLines = activeLayers.map((layer, idx) => {
    const runtime = state.layers[layer.id];
    const baseLine = layer.shadertoyMain(1.0, runtime.values);
    const mixStr = runtime.mix.toFixed(2);
    return `    // Order #${idx + 1}: ${layer.name} (fills remaining negative space)
    {
        vec3 prevCol = col;
        col = vec3(0.0);
${baseLine}
        vec3 rawL = max(col, vec3(0.0));
        float sig = mix(dot(rawL, vec3(0.299, 0.587, 0.114)), max(max(rawL.r, rawL.g), rawL.b), 0.65);
        float fg = smoothstep(${negLow}, ${negHigh}, sig);
        rawL *= mix(1.0, fg, ${negFill} * 0.85);
        col = prevCol + rawL * (${mixStr} * remainingSpace);
        remainingSpace *= (1.0 - clamp(fg * ${mixStr} * ${negFill}, 0.0, 0.985));
    }`;
  });

  return `${helperBlocks.join('\n\n')}

void mainImage(out vec4 o, in vec2 fc) {
    vec2 p0 = (fc - 0.5 * iResolution.xy) / iResolution.y;
    vec2 m = iMouse.xy == vec2(0.0) ? vec2(0.0) : (iMouse.xy - 0.5 * iResolution.xy) / iResolution.y;

${distortionSnippet}

    vec2 domainCoord = ${state.layerCoordSpace === 1 ? 'vec2(uv.x * 0.28 + cos(uv.y * 2.0) * 0.18, sin(uv.y * 2.0) * 0.75)' : 'p'};
    vec3 col = vec3(0.012, 0.016, 0.028);
    float remainingSpace = 1.0;

${mainBlendLines.join('\n\n')}

    col = col / (1.0 + col * 0.26);
    o = vec4(col, 1.0);
}`;
}

