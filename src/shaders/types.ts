export type DistortionMode = 0 | 1 | 2 | 3;
export type LayerBlendStyle = 0 | 1 | 2;
export type LayerCoordSpace = 0 | 1;

export interface LfoConfig {
  freq: number;
  phase: number;
  min: number;
  max: number;
  decimals?: number;
}

export interface ShaderLayerSubParam {
  key: string;          // Unique key within the layer, e.g. 'scale'
  uniformName: string;  // WebGL uniform name, e.g. 'uVoronoiScale'
  label: string;        // Human-readable UI label
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format?: (val: number) => string;
  lfo: LfoConfig;
  isMaskParam?: boolean;
}

export interface ShaderLayerDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  mixUniform: string;
  defaultMix: number;
  lfoMix: LfoConfig;
  subParams: ShaderLayerSubParam[];
  /**
   * Self-contained GLSL function(s) for this layer.
   */
  glslFunction: string;
  /**
   * GLSL expression returning `vec3` color for this layer.
   * Available variables in scope:
   * - `p`: mouse-warped Cartesian coordinate `vec2`
   * - `uv`: mouse-warped Polar tunnel coordinate `vec2(depth / r + iTime * flow, a * 0.5 + iTime * ang)`
   * - `domainCoord`: `isPolar ? vec2(uv.x * 0.35, uv.y) : p`
   * - `isPolar`: `bool`
   * - `r`: polar radius `float`
   * - `a`: polar angle `float`
   * - `m`: aspect-corrected mouse coordinate `vec2`
   */
  glslEvalExpr: string;
  /**
   * Optional helper function(s) emitted into the exported Shadertoy snippet when this layer is active.
   */
  shadertoyHelper?: (subValues: Record<string, number>) => string;
  /**
   * Emits the GLSL lines inside `mainImage` for the exported Shadertoy snippet when this layer is active.
   */
  shadertoyMain: (mix: number, subValues: Record<string, number>) => string;
}

export interface LayerRuntimeState {
  mix: number;
  values: Record<string, number>;
}

export interface ShaderState {
  // Mouse Distortion & Polar Projection Field
  distortionMode: DistortionMode;
  distortionStrength: number;
  swirlTwist: number;
  polarDepth: number;
  flowSpeed: number;
  angularSpeed: number;
  mouseSmoothing: number;

  // Compositor & Negative-Space Cascade Settings
  layerBlendStyle: LayerBlendStyle;
  layerCoordSpace: LayerCoordSpace;
  negativeSpaceFill: number;
  negativeSpaceThreshold: number;
  layerOrder: string[];

  // PS2 VLM Temporal Feedback & Trinitron Post-Processing
  trailPersistence?: number; // 0.0 - 0.94 frame-buffer motion trail persistence
  trailZoomWarp?: number; // -0.03 - 0.03 radial zoom/swirl smear per feedback frame
  crtScanlines?: number; // 0.0 - 1.0 Sony Trinitron CRT scanlines & phosphor bloom
  ps2ColorMatrix?: number; // 0.0 - 1.0 Y2K PS2 BIOS cobalt/indigo/cyan color grade

  // Dynamic map of layerId -> { mix, values }
  layers: Record<string, LayerRuntimeState>;
}

export type PresetCategory =
  | 'ps2-visualizer'
  | 'new-layers'
  | 'fractal-cascades'
  | 'order-inversions'
  | 'polar-wrapped'
  | 'audio-reactive';

export interface PresetItem {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  category?: PresetCategory;
  mechanics?: string[];
  apply: (base: ShaderState) => ShaderState;
}


