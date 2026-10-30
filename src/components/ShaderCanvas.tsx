import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AudioBandLevels } from '../audio/proceduralSynth';
import { VERTEX_SHADER_SOURCE } from '../shaders/commonGlsl';
import { compileModularFragmentShader } from '../shaders/compiler';
import { SHADER_LAYERS } from '../shaders/layers';
import { ShaderState } from '../shaders/types';

export interface CursorMetrics {
  x: number;
  y: number;
  r: number;
  angleDeg: number;
  speed: number;
  isPressed: boolean;
  shaderTimeScale: number;
}

// Sub-parameters that multiply iTime in GLSL (their speed is already driven via integrated iTime)
const TIME_MULTIPLIED_UNIFORMS = new Set<string>([
  'uStarfieldSpeed',
  'uAccretionSpin',
  'uTruchetPulse',
  'uPlasmaSpeed',
  'uCoralRipple',
  'uKaleidoMorph',
  'uGyroidSpeed',
  'uTesseractSpin',
  'uCherenkovPulse',
  'uKlein4dSpeed',
]);

// Spatial grid, zoom, warp, and coordinate uniforms that must stay locked to their slider so geometry never twitches
const SPATIAL_GRID_UNIFORMS = new Set<string>([
  'uTunnelFreq',
  'uVoronoiScale',
  'uVoronoiJitter',
  'uNebulaScale',
  'uNebulaWarp',
  'uAccretionRadius',
  'uTruchetScale',
  'uPlasmaScale',
  'uJuliaZoom',
  'uJuliaMouseMorph',
  'uCoralScale',
  'uKaleidoFolds',
  'uKaleidoZoom',
  'uLiquidDensity',
  'uLiquidViscosity',
  'uGyroidFreq',
  'uMoireRings',
  'uMoireArms',
  'uQuantumScale',
  'uChladniModeN',
  'uChladniModeM',
  'uAttractorChaos',
  'uAttractorFold',
  'uTesseractFibers',
  'uApollonianScale',
  'uApollonianFold',
  'uLissajousRatioX',
  'uLissajousRatioY',
  'uCherenkovScale',
  'uMandelbrotZoom',
  'uCirclePackScale',
  'uCirclePackDrift',
  'uPentWaveScale',
  'uPentWaveMod',
  'uKifsCamDist',
  'uKifsCrystalScale',
  'uLogSpiralArms',
  'uLogSpiralFreq',
  'uKlein4dScale',
]);

export interface PresetTransitionRequest {
  id: number;
  fromState: ShaderState;
  durationSec: number;
}

const CROSSFADE_FRAGMENT_SHADER_SOURCE = `
precision highp float;
uniform sampler2D uTexFrom;
uniform vec2 iResolution;
uniform float uOpacity;

void main() {
  vec2 uv = gl_FragCoord.xy / max(iResolution.xy, vec2(1.0));
  vec4 colFrom = texture2D(uTexFrom, uv);
  gl_FragColor = vec4(colFrom.rgb, clamp(uOpacity, 0.0, 1.0));
}
`;

interface ShaderCanvasProps {
  state: ShaderState;
  isPaused: boolean;
  autoOrbit: boolean;
  followMouse: boolean;
  recenterTrigger: number;
  audioBandsRef: React.MutableRefObject<AudioBandLevels>;
  presetTransition?: PresetTransitionRequest | null;
  onTransitionProgress?: (progress: number | null) => void;
  onUserInteract?: () => void;
  onMetricsUpdate?: (metrics: CursorMetrics) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  state,
  isPaused,
  autoOrbit,
  followMouse,
  recenterTrigger,
  audioBandsRef,
  presetTransition = null,
  onTransitionProgress,
  onUserInteract,
  onMetricsUpdate,
  canvasRef,
}) => {
  const [webglError, setWebglError] = useState<string | null>(null);

  // Compile modular fragment shader once from the registered SHADER_LAYERS
  const fragmentShaderSource = useMemo(
    () => compileModularFragmentShader(SHADER_LAYERS),
    []
  );

  // Store latest state in refs so the animation loop never restarts when sliders move
  const stateRef = useRef<ShaderState>(state);
  stateRef.current = state;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const autoOrbitRef = useRef<boolean>(autoOrbit);
  autoOrbitRef.current = autoOrbit;

  const followMouseRef = useRef<boolean>(followMouse);
  followMouseRef.current = followMouse;

  const onTransitionProgressRef = useRef(onTransitionProgress);
  onTransitionProgressRef.current = onTransitionProgress;

  const activeTransitionRef = useRef<{
    id: number;
    fromState: ShaderState;
    startTime: number;
    durationSec: number;
  } | null>(null);

  // Mouse state in aspect-corrected coordinates: (px - 0.5 * res.xy) / res.y
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0.0, y: 0.0 });
  const currentMouseRef = useRef<{ x: number; y: number }>({ x: 0.0, y: 0.0 });
  const mouseVelRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPointerDownRef = useRef<boolean>(false);
  const pulseRef = useRef<number>(0);
  const smoothedTimeScaleRef = useRef<number>(0.0);
  const orbitPhaseRef = useRef<number>(0.0);

  useEffect(() => {
    if (!presetTransition || presetTransition.durationSec <= 0.01) {
      activeTransitionRef.current = null;
      onTransitionProgressRef.current?.(null);
      return;
    }
    activeTransitionRef.current = {
      id: presetTransition.id,
      fromState: presetTransition.fromState,
      startTime: performance.now(),
      durationSec: presetTransition.durationSec,
    };
    onTransitionProgressRef.current?.(0);
  }, [presetTransition]);

  useEffect(() => {
    if (recenterTrigger > 0) {
      targetMouseRef.current = { x: 0, y: 0 };
    }
  }, [recenterTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl: WebGLRenderingContext | null =
      (canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: true }) as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true }) as WebGLRenderingContext | null);

    if (!gl) {
      setWebglError('WebGL is not supported in this browser environment.');
      return;
    }

    let animationFrameId = 0;
    let program: WebGLProgram | null = null;
    let crossfadeProgram: WebGLProgram | null = null;
    let positionBuffer: WebGLBuffer | null = null;
    let fboFrom: WebGLFramebuffer | null = null;
    let fboTexture: WebGLTexture | null = null;
    let fboWidth = 0;
    let fboHeight = 0;
    let accumulatedTime = 12.5; // Start at a rich initial geometric phase even when waiting for music
    let lastFrameTime = performance.now();
    let lastMetricsEmit = 0;
    let lastTransitionEmit = 0;

    const compileShader = (context: WebGLRenderingContext, type: number, source: string) => {
      const shader = context.createShader(type);
      if (!shader) return null;
      context.shaderSource(shader, source);
      context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        console.error('Shader compile error:', context.getShaderInfoLog(shader));
        context.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const initWebGLResources = (context: WebGLRenderingContext) => {
      const vs = compileShader(context, context.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const fs = compileShader(context, context.FRAGMENT_SHADER, fragmentShaderSource);
      if (!vs || !fs) {
        setWebglError('Failed to compile modular GLSL shaders.');
        return null;
      }

      const prog = context.createProgram();
      if (!prog) return null;
      context.attachShader(prog, vs);
      context.attachShader(prog, fs);
      context.linkProgram(prog);

      if (!context.getProgramParameter(prog, context.LINK_STATUS)) {
        console.error('Program link error:', context.getProgramInfoLog(prog));
        return null;
      }

      // Compile lightweight crossfade overlay program
      const fadeVs = compileShader(context, context.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const fadeFs = compileShader(
        context,
        context.FRAGMENT_SHADER,
        CROSSFADE_FRAGMENT_SHADER_SOURCE
      );
      if (fadeVs && fadeFs) {
        const fadeProg = context.createProgram();
        if (fadeProg) {
          context.attachShader(fadeProg, fadeVs);
          context.attachShader(fadeProg, fadeFs);
          context.linkProgram(fadeProg);
          if (context.getProgramParameter(fadeProg, context.LINK_STATUS)) {
            crossfadeProgram = fadeProg;
          }
        }
      }

      context.useProgram(prog);

      const buf = context.createBuffer();
      context.bindBuffer(context.ARRAY_BUFFER, buf);
      const vertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]);
      context.bufferData(context.ARRAY_BUFFER, vertices, context.STATIC_DRAW);

      const aPosition = context.getAttribLocation(prog, 'aPosition');
      context.enableVertexAttribArray(aPosition);
      context.vertexAttribPointer(aPosition, 2, context.FLOAT, false, 0, 0);

      positionBuffer = buf;
      return prog;
    };

    const ensureOffscreenFbo = (
      context: WebGLRenderingContext,
      width: number,
      height: number
    ): boolean => {
      const targetW = Math.max(1, width);
      const targetH = Math.max(1, height);
      if (fboFrom && fboTexture && fboWidth === targetW && fboHeight === targetH) {
        return true;
      }
      if (fboFrom) {
        context.deleteFramebuffer(fboFrom);
        fboFrom = null;
      }
      if (fboTexture) {
        context.deleteTexture(fboTexture);
        fboTexture = null;
      }

      const tex = context.createTexture();
      const fb = context.createFramebuffer();
      if (!tex || !fb) return false;

      context.bindTexture(context.TEXTURE_2D, tex);
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        targetW,
        targetH,
        0,
        context.RGBA,
        context.UNSIGNED_BYTE,
        null
      );
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);

      context.bindFramebuffer(context.FRAMEBUFFER, fb);
      context.framebufferTexture2D(
        context.FRAMEBUFFER,
        context.COLOR_ATTACHMENT0,
        context.TEXTURE_2D,
        tex,
        0
      );

      const status = context.checkFramebufferStatus(context.FRAMEBUFFER);
      context.bindFramebuffer(context.FRAMEBUFFER, null);
      context.bindTexture(context.TEXTURE_2D, null);

      if (status !== context.FRAMEBUFFER_COMPLETE) {
        context.deleteFramebuffer(fb);
        context.deleteTexture(tex);
        return false;
      }

      fboFrom = fb;
      fboTexture = tex;
      fboWidth = targetW;
      fboHeight = targetH;
      return true;
    };

    program = initWebGLResources(gl);
    if (!program) return;

    const getUniformLocations = (context: WebGLRenderingContext, prog: WebGLProgram) => {
      const core = {
        aPosition: context.getAttribLocation(prog, 'aPosition'),
        iResolution: context.getUniformLocation(prog, 'iResolution'),
        iTime: context.getUniformLocation(prog, 'iTime'),
        uMouse: context.getUniformLocation(prog, 'uMouse'),
        uMouseVel: context.getUniformLocation(prog, 'uMouseVel'),
        uPulse: context.getUniformLocation(prog, 'uPulse'),
        uMode: context.getUniformLocation(prog, 'uMode'),
        uDistortion: context.getUniformLocation(prog, 'uDistortion'),
        uSwirl: context.getUniformLocation(prog, 'uSwirl'),
        uDepth: context.getUniformLocation(prog, 'uDepth'),
        uFlowSpeed: context.getUniformLocation(prog, 'uFlowSpeed'),
        uAngularSpeed: context.getUniformLocation(prog, 'uAngularSpeed'),
        uBlendStyle: context.getUniformLocation(prog, 'uBlendStyle'),
        uCoordSpace: context.getUniformLocation(prog, 'uCoordSpace'),
        uNegSpaceFill: context.getUniformLocation(prog, 'uNegSpaceFill'),
        uNegSpaceThreshold: context.getUniformLocation(prog, 'uNegSpaceThreshold'),
        uAudioSub: context.getUniformLocation(prog, 'uAudioSub'),
        uAudioMid: context.getUniformLocation(prog, 'uAudioMid'),
        uAudioHigh: context.getUniformLocation(prog, 'uAudioHigh'),
        uAudioReactivity: context.getUniformLocation(prog, 'uAudioReactivity'),
      };

      // Dynamically resolve uniform locations for all registered shader layers
      const dynamicUniforms: Record<string, WebGLUniformLocation | null> = {};
      for (const layer of SHADER_LAYERS) {
        dynamicUniforms[layer.mixUniform] = context.getUniformLocation(prog, layer.mixUniform);
        dynamicUniforms[`uOrder_${layer.id}`] = context.getUniformLocation(prog, `uOrder_${layer.id}`);
        for (const sub of layer.subParams) {
          dynamicUniforms[sub.uniformName] = context.getUniformLocation(prog, sub.uniformName);
        }
      }

      return { core, dynamicUniforms };
    };

    const getCrossfadeUniformLocations = (
      context: WebGLRenderingContext,
      prog: WebGLProgram | null
    ) => {
      if (!prog) return null;
      return {
        aPosition: context.getAttribLocation(prog, 'aPosition'),
        uTexFrom: context.getUniformLocation(prog, 'uTexFrom'),
        iResolution: context.getUniformLocation(prog, 'iResolution'),
        uOpacity: context.getUniformLocation(prog, 'uOpacity'),
      };
    };

    let uniforms = getUniformLocations(gl, program);
    let crossfadeUniforms = getCrossfadeUniformLocations(gl, crossfadeProgram);

    const handleResize = () => {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(animationFrameId);
    };

    const handleContextRestored = () => {
      if (!gl) return;
      fboFrom = null;
      fboTexture = null;
      fboWidth = 0;
      fboHeight = 0;
      program = initWebGLResources(gl);
      if (program) {
        uniforms = getUniformLocations(gl, program);
        crossfadeUniforms = getCrossfadeUniformLocations(gl, crossfadeProgram);
        handleResize();
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    const render = (now: number) => {
      const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;

      const s = stateRef.current;
      const bands = audioBandsRef.current;
      const drive =
        bands.isPlaying && bands.reactivity > 0
          ? Math.max(0.0, bands.animDrive) * Math.max(0.15, bands.reactivity)
          : 0.0;
      const bpmRatio = bands.bpmLinksDrive
        ? Math.max(0.5, Math.min(2.0, (bands.bpm || 94) / 100.0))
        : 1.0;

      // Calculate target shader time velocity with liquid-smooth inertia:
      // When "Music Controls Animation" (musicDrivesTime) is ON, shader animation glides smoothly with the music
      // and scales proportionally with the tune's BPM (when bpmLinksDrive is enabled).
      let targetTimeScale = 1.0;
      if (isPausedRef.current) {
        targetTimeScale = 0.0;
      } else if (bands.musicDrivesTime) {
        if (bands.isPlaying) {
          const smoothEnergy =
            bands.rms * 0.55 + bands.sub * 0.25 + bands.beatPulse * 0.2;
          const baseCruise = 0.55 * Math.min(2.4, Math.max(0.25, drive));
          targetTimeScale = Math.min(2.8, baseCruise + drive * smoothEnergy * 0.42);
        } else {
          // Music is stopped: coast shader animation smoothly to a standstill
          targetTimeScale = 0.0;
        }
      } else if (bands.isPlaying && drive > 0) {
        // Free clock scaled by BPM link + gentle musical swell
        targetTimeScale =
          bpmRatio + drive * (bands.rms * 0.22 + bands.beatPulse * 0.1);
      } else if (bands.bpmLinksDrive) {
        // Even before audio starts, reflect the selected BPM ratio in Free Clock mode
        targetTimeScale = bpmRatio;
      }

      // Frame-rate-independent low-pass filter on time velocity so speed never snaps
      const scaleRate = targetTimeScale > smoothedTimeScaleRef.current ? 2.2 : 1.6;
      const scaleLerp = 1.0 - Math.exp(-dt * scaleRate);
      smoothedTimeScaleRef.current +=
        (targetTimeScale - smoothedTimeScaleRef.current) * scaleLerp;
      if (smoothedTimeScaleRef.current < 0.002 && targetTimeScale === 0) {
        smoothedTimeScaleRef.current = 0;
      }

      accumulatedTime += dt * smoothedTimeScaleRef.current;

      if (autoOrbitRef.current) {
        const orbitRate = bands.musicDrivesTime
          ? smoothedTimeScaleRef.current * 0.75
          : 0.75;
        orbitPhaseRef.current += dt * orbitRate;
        const ot = orbitPhaseRef.current;
        targetMouseRef.current = {
          x: Math.cos(ot) * 0.3 + Math.sin(ot * 2.1) * 0.09,
          y: Math.sin(ot * 1.3) * 0.22,
        };
      }

      const smoothing = Math.max(0.015, Math.min(0.45, s.mouseSmoothing));
      const lerpFactor = 1.0 - Math.pow(1.0 - smoothing, dt * 60.0);

      const prevX = currentMouseRef.current.x;
      const prevY = currentMouseRef.current.y;

      const nextX = prevX + (targetMouseRef.current.x - prevX) * lerpFactor;
      const nextY = prevY + (targetMouseRef.current.y - prevY) * lerpFactor;

      currentMouseRef.current.x = nextX;
      currentMouseRef.current.y = nextY;

      const vx = nextX - prevX;
      const vy = nextY - prevY;
      mouseVelRef.current.x = mouseVelRef.current.x * 0.88 + vx * 0.12;
      mouseVelRef.current.y = mouseVelRef.current.y * 0.88 + vy * 0.12;

      const targetPulse = isPointerDownRef.current ? 1.0 : 0.0;
      pulseRef.current += (targetPulse - pulseRef.current) * Math.min(1.0, dt * 8.0);

      if (gl && program) {
        handleResize();

        const { core, dynamicUniforms } = uniforms;

        // Gentle, slow phase-locked breathing on swirl & distortion (polar depth stays locked so uDepth/r never twitches)
        const grooveSin = Math.sin(bands.groovePhase * 0.35);
        const grooveCos = Math.cos(bands.groovePhase * 0.35);
        const modActive = bands.isPlaying && bands.musicDrivesTime && drive > 0;
        const clampedDrive = Math.min(1.25, drive);

        const renderShaderPass = (
          passState: ShaderState,
          targetW: number,
          targetH: number
        ) => {
          gl.useProgram(program);
          if (positionBuffer && core.aPosition >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(core.aPosition);
            gl.vertexAttribPointer(core.aPosition, 2, gl.FLOAT, false, 0, 0);
          }

          const effectiveDistortion = modActive
            ? Math.min(
                2.5,
                Math.max(
                  0.0,
                  passState.distortionStrength *
                    (1.0 + clampedDrive * bands.rms * 0.06 * grooveSin)
                )
              )
            : passState.distortionStrength;

          const effectiveSwirl = modActive
            ? Math.min(
                2.5,
                Math.max(
                  -2.5,
                  passState.swirlTwist + clampedDrive * bands.mid * 0.08 * grooveCos
                )
              )
            : passState.swirlTwist;

          const effectiveDepth = passState.polarDepth;

          gl.uniform2f(core.iResolution, targetW, targetH);
          gl.uniform1f(core.iTime, accumulatedTime);
          gl.uniform2f(core.uMouse, currentMouseRef.current.x, currentMouseRef.current.y);
          gl.uniform2f(core.uMouseVel, mouseVelRef.current.x, mouseVelRef.current.y);
          gl.uniform1f(core.uPulse, pulseRef.current);
          gl.uniform1i(core.uMode, passState.distortionMode);
          gl.uniform1f(core.uDistortion, effectiveDistortion);
          gl.uniform1f(core.uSwirl, effectiveSwirl);
          gl.uniform1f(core.uDepth, effectiveDepth);
          gl.uniform1f(core.uFlowSpeed, passState.flowSpeed);
          gl.uniform1f(core.uAngularSpeed, passState.angularSpeed);
          gl.uniform1i(core.uBlendStyle, passState.layerBlendStyle);
          gl.uniform1i(core.uCoordSpace, passState.layerCoordSpace);
          gl.uniform1f(core.uNegSpaceFill, passState.negativeSpaceFill);
          gl.uniform1f(core.uNegSpaceThreshold, passState.negativeSpaceThreshold);

          // Bind real-time Web Audio frequency band uniforms
          gl.uniform1f(core.uAudioSub, bands.sub);
          gl.uniform1f(core.uAudioMid, bands.mid);
          gl.uniform1f(core.uAudioHigh, bands.high);
          gl.uniform1f(core.uAudioReactivity, bands.reactivity);

          // Dynamically bind uniforms for every registered shader layer
          for (let layerIdx = 0; layerIdx < SHADER_LAYERS.length; layerIdx++) {
            const layer = SHADER_LAYERS[layerIdx];
            const runtime = passState.layers[layer.id];
            const mixVal = runtime?.mix ?? layer.defaultMix;
            const orderRank = passState.layerOrder.indexOf(layer.id);
            gl.uniform1f(dynamicUniforms[layer.mixUniform], mixVal);
            gl.uniform1f(
              dynamicUniforms[`uOrder_${layer.id}`],
              orderRank >= 0 ? orderRank : layerIdx
            );

            for (let subIdx = 0; subIdx < layer.subParams.length; subIdx++) {
              const sub = layer.subParams[subIdx];
              let subVal = runtime?.values?.[sub.key] ?? sub.defaultValue;

              // Smoothly breathe only non-spatial color/tone/glow parameters on active layers via slow groove phase
              if (
                modActive &&
                mixVal > 0.01 &&
                sub.lfo.decimals !== 0 &&
                !TIME_MULTIPLIED_UNIFORMS.has(sub.uniformName) &&
                !SPATIAL_GRID_UNIFORMS.has(sub.uniformName)
              ) {
                const span = (sub.lfo.max - sub.lfo.min) * 0.08 * clampedDrive;
                const phase = bands.groovePhase * 0.35 + sub.lfo.phase + layerIdx * 0.4;
                const offset = span * Math.sin(phase) * bands.rms;
                subVal = Math.min(sub.max, Math.max(sub.min, subVal + offset));
              }

              gl.uniform1f(dynamicUniforms[sub.uniformName], subVal);
            }
          }

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        };

        // Evaluate active preset crossfade progress (uses wall-clock time so transitions work even when paused)
        let activeFade = activeTransitionRef.current;
        let rawProgress = 1.0;
        if (activeFade) {
          const elapsedSec = Math.max(0, (now - activeFade.startTime) / 1000);
          rawProgress = elapsedSec / Math.max(0.01, activeFade.durationSec);
          if (rawProgress >= 1.0) {
            activeTransitionRef.current = null;
            activeFade = null;
            onTransitionProgressRef.current?.(null);
          } else if (now - lastTransitionEmit > 50) {
            lastTransitionEmit = now;
            onTransitionProgressRef.current?.(rawProgress);
          }
        }

        if (
          activeFade &&
          crossfadeProgram &&
          crossfadeUniforms &&
          ensureOffscreenFbo(gl, canvas.width, canvas.height)
        ) {
          // Smooth cosine S-curve ease between 0.0 and 1.0
          const t = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, rawProgress)));

          // Pass 1: Render outgoing preset (live-animated!) into offscreen texture fboFrom
          gl.bindFramebuffer(gl.FRAMEBUFFER, fboFrom);
          gl.viewport(0, 0, fboWidth, fboHeight);
          gl.disable(gl.BLEND);
          renderShaderPass(activeFade.fromState, fboWidth, fboHeight);

          // Pass 2: Render incoming preset (live-animated!) directly onto main canvas
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, canvas.width, canvas.height);
          renderShaderPass(s, canvas.width, canvas.height);

          // Pass 3: Alpha-blend outgoing preset texture over incoming preset with opacity (1.0 - t)
          gl.useProgram(crossfadeProgram);
          if (positionBuffer && crossfadeUniforms.aPosition >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(crossfadeUniforms.aPosition);
            gl.vertexAttribPointer(crossfadeUniforms.aPosition, 2, gl.FLOAT, false, 0, 0);
          }
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, fboTexture);
          gl.uniform1i(crossfadeUniforms.uTexFrom, 0);
          gl.uniform2f(crossfadeUniforms.iResolution, canvas.width, canvas.height);
          gl.uniform1f(crossfadeUniforms.uOpacity, 1.0 - t);

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.colorMask(true, true, true, false); // Keep canvas alpha = 1.0 for PNG/Video capture
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          gl.colorMask(true, true, true, true);
          gl.disable(gl.BLEND);
          gl.bindTexture(gl.TEXTURE_2D, null);
        } else {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, canvas.width, canvas.height);
          renderShaderPass(s, canvas.width, canvas.height);
        }
      }

      if (onMetricsUpdate && now - lastMetricsEmit > 65) {
        lastMetricsEmit = now;
        const mx = currentMouseRef.current.x;
        const my = currentMouseRef.current.y;
        const r = Math.hypot(mx, my);
        const angleDeg = (Math.atan2(my, mx) * 180) / Math.PI;
        const speed = Math.hypot(mouseVelRef.current.x, mouseVelRef.current.y) * 60;
        onMetricsUpdate({
          x: mx,
          y: my,
          r,
          angleDeg,
          speed,
          isPressed: isPointerDownRef.current,
          shaderTimeScale: smoothedTimeScaleRef.current,
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      if (gl && program) {
        gl.deleteProgram(program);
      }
      if (gl && crossfadeProgram) {
        gl.deleteProgram(crossfadeProgram);
      }
      if (gl && fboFrom) {
        gl.deleteFramebuffer(fboFrom);
      }
      if (gl && fboTexture) {
        gl.deleteTexture(fboTexture);
      }
      if (gl && positionBuffer) {
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [canvasRef, fragmentShaderSource, onMetricsUpdate]);

  const updatePointerCoordinates = (clientX: number, clientY: number) => {
    if (!followMouseRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;

    const fcX = clientX - rect.left;
    const fcY = height - (clientY - rect.top);

    const normX = (fcX - 0.5 * width) / height;
    const normY = (fcY - 0.5 * height) / height;

    targetMouseRef.current = { x: normX, y: normY };
    if (autoOrbitRef.current && onUserInteract) {
      onUserInteract();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!followMouseRef.current) return;
    updatePointerCoordinates(e.clientX, e.clientY);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!followMouseRef.current) return;
    isPointerDownRef.current = true;
    updatePointerCoordinates(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const handleDoubleClick = () => {
    targetMouseRef.current = { x: 0, y: 0 };
  };

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-950 p-8 text-center">
        <div className="max-w-md space-y-3 p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white">WebGL Viewport Fallback</h2>
          <p className="text-sm text-neutral-400">{webglError}</p>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      className={`block w-full h-full touch-none select-none ${
        followMouse ? 'cursor-crosshair' : 'cursor-default'
      }`}
      aria-label="Interactive Modular Polar GLSL Shader Canvas — Move or drag cursor to distort coordinates"
    />
  );
};
