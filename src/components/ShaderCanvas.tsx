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

interface ShaderCanvasProps {
  state: ShaderState;
  isPaused: boolean;
  autoOrbit: boolean;
  followMouse: boolean;
  recenterTrigger: number;
  audioBandsRef: React.MutableRefObject<AudioBandLevels>;
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

  // Mouse state in aspect-corrected coordinates: (px - 0.5 * res.xy) / res.y
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0.0, y: 0.0 });
  const currentMouseRef = useRef<{ x: number; y: number }>({ x: 0.0, y: 0.0 });
  const mouseVelRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPointerDownRef = useRef<boolean>(false);
  const pulseRef = useRef<number>(0);
  const smoothedTimeScaleRef = useRef<number>(0.0);
  const orbitPhaseRef = useRef<number>(0.0);

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
    let positionBuffer: WebGLBuffer | null = null;
    let accumulatedTime = 12.5; // Start at a rich initial geometric phase even when waiting for music
    let lastFrameTime = performance.now();
    let lastMetricsEmit = 0;

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

    program = initWebGLResources(gl);
    if (!program) return;

    const getUniformLocations = (context: WebGLRenderingContext, prog: WebGLProgram) => {
      const core = {
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

    let uniforms = getUniformLocations(gl, program);

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
      program = initWebGLResources(gl);
      if (program) {
        uniforms = getUniformLocations(gl, program);
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

      // Calculate target shader time velocity with liquid-smooth inertia:
      // When "Music Controls Animation" (musicDrivesTime) is ON, shader animation glides smoothly with the music
      // without sudden transient lurching or braking on drum hits.
      let targetTimeScale = 1.0;
      if (isPausedRef.current) {
        targetTimeScale = 0.0;
      } else if (bands.musicDrivesTime) {
        if (bands.isPlaying) {
          const smoothEnergy =
            bands.rms * 0.55 + bands.sub * 0.25 + bands.beatPulse * 0.2;
          const baseCruise = 0.55 * Math.min(1.25, Math.max(0.45, drive));
          targetTimeScale = Math.min(1.55, baseCruise + drive * smoothEnergy * 0.38);
        } else {
          // Music is stopped: coast shader animation smoothly to a standstill
          targetTimeScale = 0.0;
        }
      } else if (bands.isPlaying && drive > 0) {
        // Free clock + gentle musical swell
        targetTimeScale = 1.0 + drive * (bands.rms * 0.22 + bands.beatPulse * 0.1);
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
        gl.useProgram(program);

        const { core, dynamicUniforms } = uniforms;

        // Gentle, slow phase-locked breathing on swirl & distortion (polar depth stays locked so uDepth/r never twitches)
        const grooveSin = Math.sin(bands.groovePhase * 0.35);
        const grooveCos = Math.cos(bands.groovePhase * 0.35);
        const modActive = bands.isPlaying && bands.musicDrivesTime && drive > 0;
        const clampedDrive = Math.min(1.25, drive);

        const effectiveDistortion = modActive
          ? Math.min(
              2.5,
              Math.max(
                0.0,
                s.distortionStrength * (1.0 + clampedDrive * bands.rms * 0.06 * grooveSin)
              )
            )
          : s.distortionStrength;

        const effectiveSwirl = modActive
          ? Math.min(
              2.5,
              Math.max(
                -2.5,
                s.swirlTwist + clampedDrive * bands.mid * 0.08 * grooveCos
              )
            )
          : s.swirlTwist;

        const effectiveDepth = s.polarDepth;

        gl.uniform2f(core.iResolution, canvas.width, canvas.height);
        gl.uniform1f(core.iTime, accumulatedTime);
        gl.uniform2f(core.uMouse, currentMouseRef.current.x, currentMouseRef.current.y);
        gl.uniform2f(core.uMouseVel, mouseVelRef.current.x, mouseVelRef.current.y);
        gl.uniform1f(core.uPulse, pulseRef.current);
        gl.uniform1i(core.uMode, s.distortionMode);
        gl.uniform1f(core.uDistortion, effectiveDistortion);
        gl.uniform1f(core.uSwirl, effectiveSwirl);
        gl.uniform1f(core.uDepth, effectiveDepth);
        gl.uniform1f(core.uFlowSpeed, s.flowSpeed);
        gl.uniform1f(core.uAngularSpeed, s.angularSpeed);
        gl.uniform1i(core.uBlendStyle, s.layerBlendStyle);
        gl.uniform1i(core.uCoordSpace, s.layerCoordSpace);
        gl.uniform1f(core.uNegSpaceFill, s.negativeSpaceFill);
        gl.uniform1f(core.uNegSpaceThreshold, s.negativeSpaceThreshold);

        // Bind real-time Web Audio frequency band uniforms
        gl.uniform1f(core.uAudioSub, bands.sub);
        gl.uniform1f(core.uAudioMid, bands.mid);
        gl.uniform1f(core.uAudioHigh, bands.high);
        gl.uniform1f(core.uAudioReactivity, bands.reactivity);

        // Dynamically bind uniforms for every registered shader layer
        for (let layerIdx = 0; layerIdx < SHADER_LAYERS.length; layerIdx++) {
          const layer = SHADER_LAYERS[layerIdx];
          const runtime = s.layers[layer.id];
          const mixVal = runtime?.mix ?? layer.defaultMix;
          const orderRank = s.layerOrder.indexOf(layer.id);
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
