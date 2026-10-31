/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Compass,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Film,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  MousePointer,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  AudioBandLevels,
  DEFAULT_AUDIO_BAND_LEVELS,
} from './audio/proceduralSynth';
import { AudioSynthPanel } from './components/AudioSynthPanel';
import { LayerCard } from './components/LayerCard';
import {
  CursorMetrics,
  PresetTransitionRequest,
  ShaderCanvas,
} from './components/ShaderCanvas';
import { DISTORTION_MODES, LAYER_BLEND_STYLES } from './shaders/commonGlsl';
import {
  buildDefaultLayersState,
  DEFAULT_SHADER_STATE,
  generateShadertoyCode,
  SHADER_PRESETS,
} from './shaders/compiler';
import { SHADER_LAYERS } from './shaders/layers';
import {
  DistortionMode,
  LayerBlendStyle,
  LayerCoordSpace,
  LayerRuntimeState,
  PresetCategory,
  PresetItem,
  ShaderLayerDefinition,
  ShaderState,
} from './shaders/types';
import {
  createAndStartVideoRecorder,
  encodeAnimatedGif,
  finalizeRecordedVideoBlob,
  getPreferredVideoMimeType,
  quantizeFrameToIndexed,
} from './utils/mediaExporter';

type HudSection = 'layers' | 'distortion' | 'presets' | 'glsl';
type CaptureMode =
  | 'idle'
  | 'recording-gif'
  | 'encoding-gif'
  | 'recording-video'
  | 'encoding-video';

function cloneShaderState(s: ShaderState): ShaderState {
  const clonedLayers: Record<string, LayerRuntimeState> = {};
  for (const key of Object.keys(s.layers)) {
    const item = s.layers[key];
    clonedLayers[key] = {
      mix: item.mix,
      values: { ...item.values },
    };
  }
  return {
    ...s,
    layerOrder: [...s.layerOrder],
    layers: clonedLayers,
  };
}

export default function App() {
  const [state, setState] = useState<ShaderState>(DEFAULT_SHADER_STATE);
  const [activeTab, setActiveTab] = useState<HudSection>('layers');
  const [hudVisible, setHudVisible] = useState<boolean>(true);
  const [shaderPanelCollapsed, setShaderPanelCollapsed] = useState<boolean>(false);
  const [audioPanelCollapsed, setAudioPanelCollapsed] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoOrbit, setAutoOrbit] = useState<boolean>(false);
  const [followMouse, setFollowMouse] = useState<boolean>(false);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(1);
  const [isAnimatingSliders, setIsAnimatingSliders] = useState<boolean>(false);
  const [copiedGlsl, setCopiedGlsl] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(true);
  const [musicDrivesTime, setMusicDrivesTime] = useState<boolean>(true);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [presetCategory, setPresetCategory] = useState<'all' | PresetCategory>('all');
  const [activePresetId, setActivePresetId] = useState<string>(
    'klein4d-mandala-starfield-26-10-3'
  );
  const [presetFadeDuration, setPresetFadeDuration] = useState<number>(1.8);
  const [presetTransition, setPresetTransition] =
    useState<PresetTransitionRequest | null>(null);
  const [transitionProgress, setTransitionProgress] = useState<number | null>(null);
  const [autoCyclePresets, setAutoCyclePresets] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<CursorMetrics>({
    x: 0.0,
    y: 0.0,
    r: 0.0,
    angleDeg: 0.0,
    speed: 0.0,
    isPressed: false,
    shaderTimeScale: 0.0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lfoPhaseRef = useRef<number>(0);
  const audioBandsRef = useRef<AudioBandLevels>({ ...DEFAULT_AUDIO_BAND_LEVELS });
  const toggleAudioRef = useRef<(() => Promise<void>) | null>(null);
  const toggleMusicDriveRef = useRef<(() => Promise<void>) | null>(null);
  const getAudioStreamRef = useRef<(() => MediaStream | null) | null>(null);

  const [captureMode, setCaptureMode] = useState<CaptureMode>('idle');
  const [captureSecondsLeft, setCaptureSecondsLeft] = useState<number>(15);
  const [gifEncodeProgress, setGifEncodeProgress] = useState<number>(0);
  const stopActiveCaptureRef = useRef<(() => void) | null>(null);
  const preferredVideoFormat = useMemo(() => getPreferredVideoMimeType(), []);

  const handleAudioStateChange = useCallback(
    (active: boolean, drivesTime: boolean) => {
      setIsAudioPlaying(active);
      setMusicDrivesTime(drivesTime);
    },
    []
  );

  const handleRecenterMouse = useCallback(() => {
    setAutoOrbit(false);
    setRecenterTrigger((prev) => prev + 1);
  }, []);

  const handleLockAndCenterMouse = useCallback(() => {
    setFollowMouse(false);
    setAutoOrbit(false);
    setRecenterTrigger((prev) => prev + 1);
  }, []);

  // Keyboard shortcuts: 'M' toggles Mouse Follow, 'C' recenters to (0, 0)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setFollowMouse((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleRecenterMouse();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRecenterMouse]);

  // Data-driven multi-frequency LFO loop that animates registered layers & sub-parameters
  // When Music Drives Animation is active, slider LFO speed glides smoothly with the music
  useEffect(() => {
    if (!isAnimatingSliders) return;

    let rafId = 0;
    let lastTime = performance.now();

    const stepLfo = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const bands = audioBandsRef.current;
      const drive =
        bands.isPlaying && bands.reactivity > 0
          ? Math.min(1.5, Math.max(0.2, bands.animDrive * bands.reactivity))
          : 0.0;

      if (!isPaused) {
        if (bands.musicDrivesTime) {
          if (bands.isPlaying) {
            const musicSpeed = 0.35 + drive * (bands.rms * 0.35 + bands.beatPulse * 0.12);
            lfoPhaseRef.current += dt * musicSpeed;
          }
        } else {
          lfoPhaseRef.current += dt * 0.65;
        }
      }
      const t = lfoPhaseRef.current;

      const osc = (
        freq: number,
        phase: number,
        min: number,
        max: number,
        decimals = 2
      ) => {
        const rawSin = 0.5 + 0.5 * Math.sin(t * freq + phase);
        const val = min + rawSin * (max - min);
        return decimals === 0 ? Math.round(val) : Number(val.toFixed(4));
      };

      setState((prev) => {
        const nextLayers: Record<string, LayerRuntimeState> = { ...prev.layers };

        for (const layer of SHADER_LAYERS) {
          const currentLayer = prev.layers[layer.id];
          const currentMix = currentLayer?.mix ?? 0;

          // Only animate layers that are currently active
          if (currentMix <= 0.01) {
            continue;
          }

          const { freq, phase, min, max, decimals } = layer.lfoMix;
          // Keep active layers above the > 0.01 active threshold while animating
          const activeMin = Math.max(0.05, min);
          const activeMax = Math.max(activeMin + 0.05, max);
          const mix = osc(freq, phase, activeMin, activeMax, decimals ?? 2);
          const values: Record<string, number> = {
            ...(currentLayer?.values ?? {}),
          };

          for (let i = 0; i < layer.subParams.length; i++) {
            const sub = layer.subParams[i];
            if (sub.lfo.decimals === 0) {
              values[sub.key] = currentLayer?.values?.[sub.key] ?? sub.defaultValue;
              continue;
            }
            values[sub.key] = osc(
              sub.lfo.freq,
              sub.lfo.phase,
              sub.lfo.min,
              sub.lfo.max,
              sub.lfo.decimals ?? 2
            );
          }

          nextLayers[layer.id] = { mix, values };
        }

        return {
          ...prev,
          layers: nextLayers,
        };
      });

      rafId = requestAnimationFrame(stepLfo);
    };

    rafId = requestAnimationFrame(stepLfo);
    return () => cancelAnimationFrame(rafId);
  }, [isAnimatingSliders, isPaused]);

  const updateCoreParam = useCallback(
    <K extends keyof Omit<ShaderState, 'layers'>>(key: K, value: ShaderState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleLayerMixChange = useCallback((layerId: string, mix: number) => {
    setState((prev) => ({
      ...prev,
      layers: {
        ...prev.layers,
        [layerId]: {
          ...prev.layers[layerId],
          mix,
        },
      },
    }));
  }, []);

  const handleLayerSubParamChange = useCallback(
    (layerId: string, subKey: string, value: number) => {
      setState((prev) => ({
        ...prev,
        layers: {
          ...prev.layers,
          [layerId]: {
            ...prev.layers[layerId],
            values: {
              ...prev.layers[layerId]?.values,
              [subKey]: value,
            },
          },
        },
      }));
    },
    []
  );

  const handleSoloLayer = useCallback((targetId: string | 'all') => {
    setState((prev) => {
      const nextLayers: Record<string, LayerRuntimeState> = {};
      for (const layer of SHADER_LAYERS) {
        const currentValues = prev.layers[layer.id]?.values ?? {};
        let mix = 0.0;
        if (targetId === 'all') {
          mix = 0.55;
        } else if (layer.id === targetId) {
          mix = 1.0;
        }
        nextLayers[layer.id] = {
          mix,
          values: currentValues,
        };
      }
      return { ...prev, layers: nextLayers };
    });
  }, []);

  // Layer Ordering Handlers (controls sequential Negative-Space Cascade priority)
  const handleMoveLayerUp = useCallback((layerId: string) => {
    setState((prev) => {
      const idx = prev.layerOrder.indexOf(layerId);
      if (idx <= 0) return prev;
      const nextOrder = [...prev.layerOrder];
      [nextOrder[idx - 1], nextOrder[idx]] = [nextOrder[idx], nextOrder[idx - 1]];
      return { ...prev, layerOrder: nextOrder };
    });
  }, []);

  const handleMoveLayerDown = useCallback((layerId: string) => {
    setState((prev) => {
      const idx = prev.layerOrder.indexOf(layerId);
      if (idx < 0 || idx >= prev.layerOrder.length - 1) return prev;
      const nextOrder = [...prev.layerOrder];
      [nextOrder[idx], nextOrder[idx + 1]] = [nextOrder[idx + 1], nextOrder[idx]];
      return { ...prev, layerOrder: nextOrder };
    });
  }, []);

  const handleMoveLayerToTop = useCallback((layerId: string) => {
    setState((prev) => {
      const idx = prev.layerOrder.indexOf(layerId);
      if (idx <= 0) return prev;
      const nextOrder = [
        layerId,
        ...prev.layerOrder.filter((id) => id !== layerId),
      ];
      return { ...prev, layerOrder: nextOrder };
    });
  }, []);

  const handleSwapLayerPair = useCallback((idA: string, idB: string) => {
    setState((prev) => {
      const idxA = prev.layerOrder.indexOf(idA);
      const idxB = prev.layerOrder.indexOf(idB);
      if (idxA < 0 || idxB < 0 || idxA === idxB) return prev;
      const nextOrder = [...prev.layerOrder];
      [nextOrder[idxA], nextOrder[idxB]] = [nextOrder[idxB], nextOrder[idxA]];
      return { ...prev, layerOrder: nextOrder };
    });
  }, []);

  const handleSortActiveFirst = useCallback(() => {
    setState((prev) => {
      const activeIds = prev.layerOrder.filter(
        (id) => (prev.layers[id]?.mix ?? 0) > 0.01
      );
      const inactiveIds = prev.layerOrder.filter(
        (id) => (prev.layers[id]?.mix ?? 0) <= 0.01
      );
      return { ...prev, layerOrder: [...activeIds, ...inactiveIds] };
    });
  }, []);

  const handleReverseActiveOrder = useCallback(() => {
    setState((prev) => {
      const activeIds = prev.layerOrder.filter(
        (id) => (prev.layers[id]?.mix ?? 0) > 0.01
      );
      if (activeIds.length < 2) return prev;
      const reversedActive = [...activeIds].reverse();
      const inactiveIds = prev.layerOrder.filter(
        (id) => (prev.layers[id]?.mix ?? 0) <= 0.01
      );
      return { ...prev, layerOrder: [...reversedActive, ...inactiveIds] };
    });
  }, []);

  const handleRotateActiveOrder = useCallback(() => {
    setState((prev) => {
      const activeIds = prev.layerOrder.filter(
        (id) => (prev.layers[id]?.mix ?? 0) > 0.01
      );
      if (activeIds.length < 2) return prev;
      const rotatedActive = [...activeIds.slice(1), activeIds[0]];
      const inactiveIds = prev.layerOrder.filter(
        (id) => (prev.layers[id]?.mix ?? 0) <= 0.01
      );
      return { ...prev, layerOrder: [...rotatedActive, ...inactiveIds] };
    });
  }, []);

  const handleResetLayerOrder = useCallback(() => {
    setState((prev) => ({
      ...prev,
      layerOrder: SHADER_LAYERS.map((l) => l.id),
    }));
  }, []);

  const handleDragStart = useCallback((layerId: string) => {
    setDraggedLayerId(layerId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    setDragOverLayerId((prev) => (prev === targetLayerId ? prev : targetLayerId));
  }, []);

  const handleDrop = useCallback(
    (targetLayerId: string) => {
      if (!draggedLayerId || draggedLayerId === targetLayerId) {
        setDraggedLayerId(null);
        setDragOverLayerId(null);
        return;
      }
      setState((prev) => {
        const fromIdx = prev.layerOrder.indexOf(draggedLayerId);
        const toIdx = prev.layerOrder.indexOf(targetLayerId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const nextOrder = [...prev.layerOrder];
        const [moved] = nextOrder.splice(fromIdx, 1);
        nextOrder.splice(toIdx, 0, moved);
        return { ...prev, layerOrder: nextOrder };
      });
      setDraggedLayerId(null);
      setDragOverLayerId(null);
    },
    [draggedLayerId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  }, []);

  // Compute ordered layers list and active negative-space chain ranks
  const orderedLayers = useMemo(() => {
    const map = new Map(SHADER_LAYERS.map((l) => [l.id, l]));
    const ordered: ShaderLayerDefinition[] = [];
    for (const id of state.layerOrder) {
      const found = map.get(id);
      if (found) ordered.push(found);
    }
    for (const l of SHADER_LAYERS) {
      if (!state.layerOrder.includes(l.id)) ordered.push(l);
    }
    return ordered;
  }, [state.layerOrder]);

  const activeOrderedLayers = useMemo(
    () =>
      orderedLayers.filter(
        (layer) => (state.layers[layer.id]?.mix ?? layer.defaultMix) > 0.01
      ),
    [orderedLayers, state.layers]
  );

  const activeChainRankMap = useMemo(() => {
    const rankMap: Record<string, number> = {};
    activeOrderedLayers.forEach((layer, idx) => {
      rankMap[layer.id] = idx + 1;
    });
    return rankMap;
  }, [activeOrderedLayers]);

  const handleSelectPreset = useCallback(
    (preset: PresetItem) => {
      setActivePresetId(preset.id);
      setState((prev) => {
        if (presetFadeDuration > 0.01) {
          setPresetTransition({
            id: Date.now() + Math.random(),
            fromState: cloneShaderState(prev),
            durationSec: presetFadeDuration,
          });
        } else {
          setPresetTransition(null);
        }
        return preset.apply(prev);
      });
    },
    [presetFadeDuration]
  );

  const filteredPresets = useMemo(
    () =>
      SHADER_PRESETS.filter(
        (p) => presetCategory === 'all' || p.category === presetCategory
      ),
    [presetCategory]
  );

  const handleStepPreset = useCallback(
    (direction: -1 | 1) => {
      const list = filteredPresets.length > 0 ? filteredPresets : SHADER_PRESETS;
      if (list.length === 0) return;
      const currentIdx = list.findIndex((p) => p.id === activePresetId);
      const nextIdx =
        currentIdx < 0
          ? 0
          : (currentIdx + direction + list.length) % list.length;
      handleSelectPreset(list[nextIdx]);
    },
    [activePresetId, filteredPresets, handleSelectPreset]
  );

  // VJ Autopilot: automatically crossfade to the next preset every 16 seconds when enabled
  useEffect(() => {
    if (!autoCyclePresets || isPaused) return;
    const timer = window.setInterval(() => {
      handleStepPreset(1);
    }, 16000);
    return () => window.clearInterval(timer);
  }, [autoCyclePresets, isPaused, handleStepPreset]);

  const isPs2ModeActive =
    (state.trailPersistence ?? 0) > 0.35 ||
    (state.ps2ColorMatrix ?? 0) > 0.35 ||
    (state.layers.ps2bios?.mix ?? 0) > 0.1 ||
    (state.layers.ps2vlm?.mix ?? 0) > 0.1;

  const handleTogglePs2Visualizer = useCallback(() => {
    const ps2Presets = SHADER_PRESETS.filter((p) => p.category === 'ps2-visualizer');
    if (isPs2ModeActive) {
      // Cycle to the next PS2 Visualizer preset if already in PS2 mode
      const currentIdx = ps2Presets.findIndex((p) => p.id === activePresetId);
      const nextPreset =
        ps2Presets[(currentIdx + 1) % Math.max(1, ps2Presets.length)] ||
        SHADER_PRESETS[0];
      setAutoOrbit(true);
      handleSelectPreset(nextPreset);
    } else {
      // Launch flagship PS2 System BIOS: Crystal Towers & 7 Orbs preset + Auto-Orbit
      const flagship = ps2Presets[0] || SHADER_PRESETS[0];
      setAutoOrbit(true);
      setPresetCategory('ps2-visualizer');
      handleSelectPreset(flagship);
      if (musicDrivesTime && !isAudioPlaying) {
        void toggleAudioRef.current?.();
      }
    }
  }, [
    activePresetId,
    handleSelectPreset,
    isAudioPlaying,
    isPs2ModeActive,
    musicDrivesTime,
  ]);

  const handleDisablePs2Fx = useCallback(() => {
    setState((prev) => ({
      ...prev,
      trailPersistence: 0.0,
      crtScanlines: 0.0,
      ps2ColorMatrix: 0.0,
    }));
  }, []);

  const handleReset = () => {
    setIsAnimatingSliders(false);
    setAutoCyclePresets(false);
    setAutoOrbit(false);
    setIsPaused(false);
    setState((prev) => {
      if (presetFadeDuration > 0.01) {
        setPresetTransition({
          id: Date.now() + Math.random(),
          fromState: cloneShaderState(prev),
          durationSec: presetFadeDuration,
        });
      }
      return {
        ...DEFAULT_SHADER_STATE,
        layers: buildDefaultLayersState(SHADER_LAYERS),
      };
    });
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `vortex-modular-shader-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleExport15sGif = useCallback(() => {
    if (captureMode === 'recording-gif') {
      stopActiveCaptureRef.current?.();
      return;
    }
    if (captureMode !== 'idle') return;

    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;

    const DURATION_SEC = 15;
    const GIF_FPS = 12;
    const MAX_DIM = 480;

    const srcW = Math.max(1, sourceCanvas.width);
    const srcH = Math.max(1, sourceCanvas.height);
    const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
    const gifW = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const gifH = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = gifW;
    scratchCanvas.height = gifH;
    const scratchCtx = scratchCanvas.getContext('2d', {
      willReadFrequently: true,
    });
    if (!scratchCtx) return;

    const indexedFrames: Uint8Array[] = [];
    const startTime = performance.now();
    let finished = false;

    setCaptureMode('recording-gif');
    setCaptureSecondsLeft(DURATION_SEC);
    setGifEncodeProgress(0);

    const captureFrame = () => {
      if (finished || !canvasRef.current) return;
      scratchCtx.drawImage(canvasRef.current, 0, 0, gifW, gifH);
      const imgData = scratchCtx.getImageData(0, 0, gifW, gifH);
      indexedFrames.push(quantizeFrameToIndexed(imgData.data, gifW, gifH));
    };

    // Capture initial frame immediately
    captureFrame();

    const frameInterval = window.setInterval(captureFrame, 1000 / GIF_FPS);
    const countdownInterval = window.setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(DURATION_SEC - elapsed));
      setCaptureSecondsLeft(remaining);
    }, 200);

    const finishGifRecording = async () => {
      if (finished) return;
      finished = true;
      window.clearInterval(frameInterval);
      window.clearInterval(countdownInterval);
      window.clearTimeout(autoStopTimeout);
      stopActiveCaptureRef.current = null;

      if (indexedFrames.length === 0) {
        setCaptureMode('idle');
        return;
      }

      setCaptureMode('encoding-gif');
      setGifEncodeProgress(0);

      try {
        const blob = await encodeAnimatedGif(
          indexedFrames,
          gifW,
          gifH,
          GIF_FPS,
          (progress) => setGifEncodeProgress(Math.round(progress * 100))
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `vortex-shader-15s-${Date.now()}.gif`;
        link.href = url;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      } finally {
        setCaptureMode('idle');
      }
    };

    const autoStopTimeout = window.setTimeout(
      () => void finishGifRecording(),
      DURATION_SEC * 1000
    );

    stopActiveCaptureRef.current = () => {
      void finishGifRecording();
    };
  }, [captureMode]);

  const handleExport15sVideo = useCallback(async () => {
    if (captureMode === 'recording-video') {
      stopActiveCaptureRef.current?.();
      return;
    }
    if (captureMode !== 'idle') return;

    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas || typeof MediaRecorder === 'undefined') return;

    // Ensure the live audio engine is running so the recorded video includes music
    if (!isAudioPlaying && toggleAudioRef.current) {
      await toggleAudioRef.current();
    }

    const DURATION_SEC = 15;
    const canvasStream = sourceCanvas.captureStream(60);
    const videoTracks = canvasStream.getVideoTracks();
    const liveAudioStream = getAudioStreamRef.current?.();
    const audioTracks = liveAudioStream ? liveAudioStream.getAudioTracks() : [];

    const { extension } = preferredVideoFormat;
    const chunks: BlobPart[] = [];
    const startTime = performance.now();
    let stopped = false;
    let countdownInterval = 0;
    let autoStopTimeout = 0;

    const recorder = createAndStartVideoRecorder(
      videoTracks,
      audioTracks,
      250,
      (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      },
      async (actualMimeType) => {
        window.clearInterval(countdownInterval);
        window.clearTimeout(autoStopTimeout);
        stopActiveCaptureRef.current = null;
        for (const track of videoTracks) {
          track.stop();
        }

        if (chunks.length > 0) {
          setCaptureMode('encoding-video');
          try {
            const rawBlob = new Blob(chunks, {
              type: actualMimeType || 'video/mp4',
            });
            const finalized = await finalizeRecordedVideoBlob(
              rawBlob,
              extension
            );
            const url = URL.createObjectURL(finalized.blob);
            const link = document.createElement('a');
            link.download = `vortex-shader-15s-${Date.now()}.${finalized.extension}`;
            link.href = url;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 10000);
          } finally {
            setCaptureMode('idle');
          }
        } else {
          setCaptureMode('idle');
        }
      }
    );

    if (!recorder) {
      for (const track of videoTracks) {
        track.stop();
      }
      setCaptureMode('idle');
      return;
    }

    setCaptureMode('recording-video');
    setCaptureSecondsLeft(DURATION_SEC);

    countdownInterval = window.setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(DURATION_SEC - elapsed));
      setCaptureSecondsLeft(remaining);
    }, 200);

    const stopVideoRecording = () => {
      if (stopped) return;
      stopped = true;
      recorder.stop();
    };

    autoStopTimeout = window.setTimeout(
      stopVideoRecording,
      DURATION_SEC * 1000
    );

    stopActiveCaptureRef.current = stopVideoRecording;
  }, [captureMode, isAudioPlaying, preferredVideoFormat]);

  const liveGlslCode = useMemo(() => generateShadertoyCode(state, SHADER_LAYERS), [state]);

  const handleCopyGlsl = async () => {
    try {
      await navigator.clipboard.writeText(liveGlslCode);
      setCopiedGlsl(true);
      setTimeout(() => setCopiedGlsl(false), 1800);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = liveGlslCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedGlsl(true);
      setTimeout(() => setCopiedGlsl(false), 1800);
    }
  };

  const currentModeInfo =
    DISTORTION_MODES.find((m) => m.id === state.distortionMode) || DISTORTION_MODES[0];

  const currentBlendStyleInfo =
    LAYER_BLEND_STYLES.find((m) => m.id === state.layerBlendStyle) || LAYER_BLEND_STYLES[0];

  const handleNavClick = (section: HudSection) => {
    setActiveTab(section);
    setHudVisible(true);
    setShaderPanelCollapsed(false);
  };

  const bothPanelsCollapsed = shaderPanelCollapsed && audioPanelCollapsed;
  const handleToggleCollapseBoth = () => {
    const next = !bothPanelsCollapsed;
    setShaderPanelCollapsed(next);
    setAudioPanelCollapsed(next);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 select-none">
      {/* Full-Viewport Interactive WebGL Shader Canvas */}
      <div className="absolute inset-0 z-0">
        <ShaderCanvas
          canvasRef={canvasRef}
          state={state}
          isPaused={isPaused}
          autoOrbit={autoOrbit}
          followMouse={followMouse}
          recenterTrigger={recenterTrigger}
          audioBandsRef={audioBandsRef}
          presetTransition={presetTransition}
          onTransitionProgress={setTransitionProgress}
          onUserInteract={() => setAutoOrbit(false)}
          onMetricsUpdate={setMetrics}
        />
      </div>

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      {hudVisible && (
        <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-3.5 bg-black/45 backdrop-blur-md border-b border-white/10">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setHudVisible(true);
            }}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Vortex
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-300">
            <button
              type="button"
              onClick={() => handleNavClick('layers')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer ${
                hudVisible && activeTab === 'layers'
                  ? 'text-white border-amber-500'
                  : 'border-transparent'
              }`}
            >
              Shader Layers
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('distortion')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer ${
                hudVisible && activeTab === 'distortion'
                  ? 'text-white border-amber-500'
                  : 'border-transparent'
              }`}
            >
              Mouse Warp
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('presets')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer ${
                hudVisible && activeTab === 'presets'
                  ? 'text-white border-amber-500'
                  : 'border-transparent'
              }`}
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('glsl')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer ${
                hudVisible && activeTab === 'glsl'
                  ? 'text-white border-amber-500'
                  : 'border-transparent'
              }`}
            >
              GLSL Code
            </button>
          </nav>

          {/* Zone 3: Export Actions (15s GIF, 15s Video, Export PNG) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExport15sGif}
              disabled={
                captureMode === 'recording-video' ||
                captureMode === 'encoding-video' ||
                captureMode === 'encoding-gif'
              }
              title={
                captureMode === 'recording-gif'
                  ? 'Click to stop early and save GIF'
                  : 'Record a 15-second looping animated GIF of the shader'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                captureMode === 'recording-gif'
                  ? 'bg-rose-500/25 border-rose-400/60 text-rose-200 hover:bg-rose-500/35'
                  : captureMode === 'encoding-gif'
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 cursor-wait'
                    : 'bg-white/10 border-white/15 text-white hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {captureMode === 'recording-gif' ? (
                <>
                  <Square className="w-3 h-3 fill-rose-400 text-rose-400 animate-pulse" />
                  <span>Stop GIF ({captureSecondsLeft}s)</span>
                </>
              ) : captureMode === 'encoding-gif' ? (
                <>
                  <Film className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Encoding {gifEncodeProgress}%</span>
                </>
              ) : (
                <>
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>15s GIF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleExport15sVideo()}
              disabled={
                captureMode === 'recording-gif' ||
                captureMode === 'encoding-gif' ||
                captureMode === 'encoding-video'
              }
              title={
                captureMode === 'recording-video'
                  ? 'Click to stop early and save video'
                  : `Record a 15-second 60 FPS ${preferredVideoFormat.label} video with stereo audio`
              }
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                captureMode === 'recording-video'
                  ? 'bg-rose-500/25 border-rose-400/60 text-rose-200 hover:bg-rose-500/35'
                  : captureMode === 'encoding-video'
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 cursor-wait'
                    : 'bg-white/10 border-white/15 text-white hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {captureMode === 'recording-video' ? (
                <>
                  <Square className="w-3 h-3 fill-rose-400 text-rose-400 animate-pulse" />
                  <span>
                    Stop {preferredVideoFormat.label} ({captureSecondsLeft}s)
                  </span>
                </>
              ) : captureMode === 'encoding-video' ? (
                <>
                  <Video className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Muxing Audio...</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>15s {preferredVideoFormat.label}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export PNG
            </button>
          </div>
        </header>
      )}

      {/* Left Floating Panel: Live Procedural Web Audio Synthesizer (stays mounted when hidden so music never stops) */}
      <AudioSynthPanel
        isCollapsed={audioPanelCollapsed}
        onToggleCollapse={() => setAudioPanelCollapsed((prev) => !prev)}
        cursorR={metrics.r}
        cursorX={metrics.x}
        audioBandsRef={audioBandsRef}
        hidden={!hudVisible}
        shaderTimeScale={metrics.shaderTimeScale}
        onAudioStateChange={handleAudioStateChange}
        externalToggleAudioRef={toggleAudioRef}
        externalToggleMusicDriveRef={toggleMusicDriveRef}
        externalGetAudioStreamRef={getAudioStreamRef}
      />

      {/* Right Floating Panel: Modular Shader Compositor & Distortion Controls */}
      {hudVisible && (
        <aside
          aria-label="Modular Shader Compositor & Distortion Controls"
          className={`absolute top-18 right-6 z-10 w-[420px] max-w-[calc(100vw-3rem)] flex flex-col rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white overflow-hidden transition-all duration-200 ${
            shaderPanelCollapsed ? 'max-h-[54px]' : 'max-h-[calc(100vh-7.5rem)]'
          }`}
        >
          {/* Panel Header with Collapse / Expand Button */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.03] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold tracking-wide text-white truncate">
                Modular Shader Compositor ({SHADER_LAYERS.length} Layers)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShaderPanelCollapsed((prev) => !prev)}
              title={
                shaderPanelCollapsed
                  ? 'Expand Shader Compositor Panel'
                  : 'Collapse Shader Compositor Panel'
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              {shaderPanelCollapsed ? (
                <>
                  <Maximize2 className="w-3 h-3 text-amber-400" />
                  <span>Expand</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3 h-3 text-neutral-400" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>

          {!shaderPanelCollapsed && (
            <>
              {/* Segmented Control Tabs + Music-Driven Animation Bar */}
              <div className="p-3 border-b border-white/10 space-y-2.5 shrink-0">
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('layers')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'layers'
                        ? 'bg-amber-500 text-neutral-950 font-semibold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {SHADER_LAYERS.length} Layers
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('distortion')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'distortion'
                        ? 'bg-amber-500 text-neutral-950 font-semibold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Mouse Warp
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'presets'
                        ? 'bg-amber-500 text-neutral-950 font-semibold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('glsl')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'glsl'
                        ? 'bg-amber-500 text-neutral-950 font-semibold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    GLSL
                  </button>
                </div>

                {/* Music Controls Shader Animation Quick Bar */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void toggleAudioRef.current?.()}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                      isAudioPlaying
                        ? 'bg-amber-400 border-amber-300 text-neutral-950'
                        : 'bg-amber-500/20 border-amber-400/60 text-amber-200 hover:bg-amber-500/30'
                    }`}
                  >
                    {isAudioPlaying ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        Music Driving Shaders ({metrics.shaderTimeScale.toFixed(2)}x)
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Play Music to Drive Shaders
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleMusicDriveRef.current?.()}
                    title="Toggle between Music-Driven Shader Animation and Free Clock"
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      musicDrivesTime
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                        : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    {musicDrivesTime ? 'Music Sync' : 'Free Clock'}
                  </button>
                </div>

                {/* Persistent Global Slider Animator + PS2 Visualizer Mode Action Bar */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleTogglePs2Visualizer}
                    title="Launch or cycle PlayStation 2 (PS2) BIOS Towers & VLM Waveform Visualizer Mode with Temporal Motion Trails"
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isPs2ModeActive
                        ? 'bg-indigo-500/35 border-cyan-400 text-cyan-200 hover:bg-indigo-500/45'
                        : 'bg-indigo-950/60 border-indigo-400/40 text-indigo-200 hover:bg-indigo-900/60 hover:border-cyan-400/60'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    {isPs2ModeActive ? 'Next PS2 VLM Mode' : 'PS2 Visualizer Mode'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isAnimatingSliders;
                      setIsAnimatingSliders(next);
                      if (next && musicDrivesTime && !isAudioPlaying) {
                        void toggleAudioRef.current?.();
                      }
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isAnimatingSliders
                        ? 'bg-amber-400 border-amber-300 text-neutral-950'
                        : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    {isAnimatingSliders
                      ? `Stop LFO (${activeOrderedLayers.length})`
                      : `LFO (${activeOrderedLayers.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    title="Reset all sliders to defaults"
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="p-5 overflow-y-auto space-y-5">
                {activeTab === 'layers' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-white">
                          Modular Shader Layer Registry
                        </h2>
                        <button
                          type="button"
                          onClick={() => handleSoloLayer('all')}
                          className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          Stack All {SHADER_LAYERS.length}
                        </button>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {currentBlendStyleInfo.description}
                      </p>
                    </div>

                    {/* Global Blend Mode & Coordinate Space */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {LAYER_BLEND_STYLES.map((style) => {
                        const isSelected = state.layerBlendStyle === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() =>
                              updateCoreParam('layerBlendStyle', style.id as LayerBlendStyle)
                            }
                            className={`px-2.5 py-2 rounded-lg text-center text-xs font-medium border transition-colors whitespace-nowrap truncate cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-400 text-white font-semibold'
                                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {style.shortLabel}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCoreParam('layerCoordSpace', 0 as LayerCoordSpace)}
                        className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          state.layerCoordSpace === 0
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Mouse-Warped Field (p)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCoreParam('layerCoordSpace', 1 as LayerCoordSpace)}
                        className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          state.layerCoordSpace === 1
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Cylindrical Polar (uv)
                      </button>
                    </div>

                    {/* Negative-Space Cascade & Layer Priority Order Controls */}
                    <div className="p-3 rounded-lg bg-white/[0.035] border border-white/15 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-amber-300">
                          Negative-Space Layer Chain ({activeOrderedLayers.length} Active)
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleSortActiveFirst}
                            title="Group all active layers at the top of the card list"
                            className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            Active Top
                          </button>
                          <button
                            type="button"
                            onClick={handleReverseActiveOrder}
                            title="Reverse the priority order of active layers"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
                          >
                            <ArrowUpDown className="w-2.5 h-2.5" />
                            Flip Order
                          </button>
                          <button
                            type="button"
                            onClick={handleResetLayerOrder}
                            title={`Restore numerical 01–${SHADER_LAYERS.length} layer order`}
                            className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            01–{SHADER_LAYERS.length}
                          </button>
                        </div>
                      </div>

                      {/* Live Interactive Negative-Space Chain Strip */}
                      {activeOrderedLayers.length > 0 ? (
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {activeOrderedLayers.map((layer, idx) => (
                            <React.Fragment key={layer.id}>
                              <button
                                type="button"
                                onClick={() => handleMoveLayerToTop(layer.id)}
                                title={`Click to promote ${layer.name} to #1 Foreground`}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                                  idx === 0
                                    ? 'bg-amber-400 text-neutral-950 font-semibold'
                                    : 'bg-white/10 text-neutral-200 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                <span className="font-mono text-[10px] opacity-80">
                                  #{idx + 1}
                                </span>
                                <span>{layer.shortName}</span>
                              </button>
                              {idx < activeOrderedLayers.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSwapLayerPair(
                                      layer.id,
                                      activeOrderedLayers[idx + 1].id
                                    )
                                  }
                                  title={`Swap #${idx + 1} (${layer.shortName}) and #${idx + 2} (${activeOrderedLayers[idx + 1].shortName})`}
                                  className="p-1 rounded bg-white/5 hover:bg-amber-500/25 text-neutral-400 hover:text-amber-300 transition-colors shrink-0 cursor-pointer"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                </button>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-400">
                          Turn up any layer slider below to start the negative-space chain.
                        </p>
                      )}

                      {/* Negative-Space Fill & Threshold Sliders */}
                      <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-white/10">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-neutral-300">
                            <span title="How strongly each layer's negative space is inhabited by the next layer instead of overlapping on bright areas">
                              Neg-Space Fill
                            </span>
                            <span className="font-mono tabular-nums text-amber-400">
                              {Math.round(state.negativeSpaceFill * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.02"
                            value={state.negativeSpaceFill}
                            onChange={(e) =>
                              updateCoreParam(
                                'negativeSpaceFill',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full hud-slider"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-neutral-300">
                            <span title="Luminance threshold below which a pixel is carved as open negative space for the next layer">
                              Neg-Space Carve
                            </span>
                            <span className="font-mono tabular-nums text-cyan-300">
                              {(state.negativeSpaceThreshold * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.02"
                            max="0.60"
                            step="0.01"
                            value={state.negativeSpaceThreshold}
                            onChange={(e) =>
                              updateCoreParam(
                                'negativeSpaceThreshold',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full hud-slider"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PS2 VLM Temporal Feedback & Trinitron Post-FX Deck */}
                    <div className="p-3 rounded-lg bg-indigo-950/35 border border-indigo-400/30 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-cyan-300">
                          PS2 VLM Motion Trails & Trinitron FX
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleTogglePs2Visualizer}
                            className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/30 transition-colors cursor-pointer"
                          >
                            Load PS2 Preset
                          </button>
                          {((state.trailPersistence ?? 0) > 0.01 ||
                            (state.crtScanlines ?? 0) > 0.01 ||
                            (state.ps2ColorMatrix ?? 0) > 0.01) && (
                            <button
                              type="button"
                              onClick={handleDisablePs2Fx}
                              className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
                            >
                              Clear FX
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-neutral-300">
                            <span title="PS2 VLM frame-buffer ping-pong persistence creating glowing liquid motion trails">
                              Trail Persistence
                            </span>
                            <span className="font-mono tabular-nums text-cyan-300">
                              {Math.round((state.trailPersistence ?? 0) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="0.92"
                            step="0.02"
                            value={state.trailPersistence ?? 0.0}
                            onChange={(e) =>
                              updateCoreParam(
                                'trailPersistence',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full hud-slider"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-neutral-300">
                            <span title="Radial zoom smear per feedback frame (positive = outward rush, negative = inward vortex)">
                              Trail Zoom Smear
                            </span>
                            <span className="font-mono tabular-nums text-cyan-300">
                              {((state.trailZoomWarp ?? 0.009) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-0.025"
                            max="0.025"
                            step="0.001"
                            value={state.trailZoomWarp ?? 0.009}
                            onChange={(e) =>
                              updateCoreParam(
                                'trailZoomWarp',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full hud-slider"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-neutral-300">
                            <span title="Y2K Sony PlayStation 2 BIOS deep cobalt, sapphire, and electric cyan color grade">
                              PS2 Cobalt Grade
                            </span>
                            <span className="font-mono tabular-nums text-indigo-300">
                              {Math.round((state.ps2ColorMatrix ?? 0) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.02"
                            value={state.ps2ColorMatrix ?? 0.0}
                            onChange={(e) =>
                              updateCoreParam(
                                'ps2ColorMatrix',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full hud-slider"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-neutral-300">
                            <span title="Sony Trinitron CRT aperture grille RGB phosphor mask & scanline bloom">
                              Trinitron CRT
                            </span>
                            <span className="font-mono tabular-nums text-amber-400">
                              {Math.round((state.crtScanlines ?? 0) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.02"
                            value={state.crtScanlines ?? 0.0}
                            onChange={(e) =>
                              updateCoreParam(
                                'crtScanlines',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full hud-slider"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dynamically Rendered Layer Cards in User's Stack Order */}
                    <div className="space-y-3">
                      {orderedLayers.map((layer, index) => (
                        <LayerCard
                          key={layer.id}
                          layer={layer}
                          runtime={state.layers[layer.id]}
                          orderIndex={index}
                          totalLayers={orderedLayers.length}
                          activeChainRank={activeChainRankMap[layer.id] ?? null}
                          isDragging={draggedLayerId === layer.id}
                          isDragOver={
                            dragOverLayerId === layer.id &&
                            draggedLayerId !== layer.id
                          }
                          onMixChange={handleLayerMixChange}
                          onSubParamChange={handleLayerSubParamChange}
                          onSolo={handleSoloLayer}
                          onMoveUp={handleMoveLayerUp}
                          onMoveDown={handleMoveLayerDown}
                          onMoveToTop={handleMoveLayerToTop}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'distortion' && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white tracking-wide">
                          Mouse Distortion Mapping
                        </h2>
                        <span className="text-xs text-neutral-400">
                          Shortcut: M (Lock) · C (Center)
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {currentModeInfo.description}
                      </p>
                    </div>

                    {/* Mouse Tracking Lock & Center Control Bar */}
                    <div className="p-3 rounded-lg bg-white/[0.04] border border-white/15 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">
                          Cursor Tracking Status
                        </span>
                        <span
                          className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                            followMouse
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          }`}
                        >
                          {followMouse ? 'Following Cursor' : 'Mouse Locked'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFollowMouse((prev) => !prev)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            followMouse
                              ? 'bg-amber-400 border-amber-300 text-neutral-950'
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                          }`}
                        >
                          {followMouse ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              Stop Following Mouse
                            </>
                          ) : (
                            <>
                              <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                              Follow Mouse Cursor
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleLockAndCenterMouse}
                          title="Lock mouse tracking and recenter shader origin to (0, 0)"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-neutral-200 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                          Center (0,0)
                        </button>
                      </div>
                    </div>

                    {/* 4 Selectable Distortion Mapping Modes */}
                    <div className="grid grid-cols-2 gap-2">
                      {DISTORTION_MODES.map((mode) => {
                        const isSelected = state.distortionMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() =>
                              updateCoreParam('distortionMode', mode.id as DistortionMode)
                            }
                            className={`px-3 py-2.5 rounded-lg text-left transition-colors border cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-400 text-white'
                                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className="text-xs font-semibold whitespace-nowrap truncate">
                              {mode.shortLabel}
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5 truncate font-mono">
                              {mode.formulaSummary}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Mouse Distortion Sliders */}
                    <div className="space-y-4 pt-2 border-t border-white/10">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label htmlFor="slider-distortion" className="text-neutral-200 font-medium">
                            Distortion Intensity
                          </label>
                          <div className="flex items-center gap-2">
                            {state.distortionStrength > 0 && (
                              <button
                                type="button"
                                onClick={() => updateCoreParam('distortionStrength', 0)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 hover:text-white cursor-pointer"
                              >
                                Zero (0.00)
                              </button>
                            )}
                            <span className="font-mono tabular-nums text-amber-400">
                              {state.distortionStrength.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <input
                          id="slider-distortion"
                          type="range"
                          min="0"
                          max="2.5"
                          step="0.05"
                          value={state.distortionStrength}
                          onChange={(e) =>
                            updateCoreParam('distortionStrength', parseFloat(e.target.value))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label htmlFor="slider-swirl" className="text-neutral-200 font-medium">
                            Vortex Angular Twist
                          </label>
                          <span className="font-mono tabular-nums text-amber-400">
                            {state.swirlTwist.toFixed(2)}
                          </span>
                        </div>
                        <input
                          id="slider-swirl"
                          type="range"
                          min="-2.5"
                          max="2.5"
                          step="0.05"
                          value={state.swirlTwist}
                          onChange={(e) =>
                            updateCoreParam('swirlTwist', parseFloat(e.target.value))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label htmlFor="slider-smoothing" className="text-neutral-200 font-medium">
                            Cursor Inertia Responsiveness
                          </label>
                          <span className="font-mono tabular-nums text-amber-400">
                            {state.mouseSmoothing.toFixed(2)}
                          </span>
                        </div>
                        <input
                          id="slider-smoothing"
                          type="range"
                          min="0.02"
                          max="0.35"
                          step="0.01"
                          value={state.mouseSmoothing}
                          onChange={(e) =>
                            updateCoreParam('mouseSmoothing', parseFloat(e.target.value))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label htmlFor="slider-depth" className="text-neutral-200 font-medium">
                            Tunnel Radial Depth (0.3 / r)
                          </label>
                          <span className="font-mono tabular-nums text-amber-400">
                            {state.polarDepth.toFixed(2)}
                          </span>
                        </div>
                        <input
                          id="slider-depth"
                          type="range"
                          min="0.06"
                          max="0.80"
                          step="0.02"
                          value={state.polarDepth}
                          onChange={(e) =>
                            updateCoreParam('polarDepth', parseFloat(e.target.value))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label htmlFor="slider-flow" className="text-neutral-200 font-medium">
                            Tunnel Flow Velocity
                          </label>
                          <span className="font-mono tabular-nums text-amber-400">
                            {state.flowSpeed.toFixed(2)}
                          </span>
                        </div>
                        <input
                          id="slider-flow"
                          type="range"
                          min="-2.0"
                          max="2.0"
                          step="0.05"
                          value={state.flowSpeed}
                          onChange={(e) =>
                            updateCoreParam('flowSpeed', parseFloat(e.target.value))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>

                    {/* Quick Cursor Action Controls */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoOrbit((prev) => !prev)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          autoOrbit
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {autoOrbit ? 'Stop Auto-Orbit' : 'Auto-Orbit Cursor'}
                      </button>
                    </div>
                  </>
                )}

                {activeTab === 'presets' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-white">
                          Curated Modular Presets ({SHADER_PRESETS.length})
                        </h2>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepPreset(-1)}
                            title="Crossfade to previous preset"
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-200 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-3 h-3 text-amber-400" />
                            <span>Prev</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStepPreset(1)}
                            title="Crossfade to next preset"
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-200 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3 h-3 text-amber-400" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Each preset configures active layers, priority order (#1 → #N negative-space cascade), coordinate space, and audio-reactive sub-parameters.
                      </p>
                    </div>

                    {/* Smooth Preset Crossfade Controls */}
                    <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-amber-300">
                          Preset Crossfade Transition
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAutoCyclePresets((prev) => !prev)}
                            title="Automatically crossfade to the next preset every 16 seconds like the PS2 Audio Visualizer"
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                              autoCyclePresets
                                ? 'bg-cyan-400 text-neutral-950 border-cyan-300'
                                : 'bg-white/5 border-white/15 text-cyan-300 hover:bg-white/10'
                            }`}
                          >
                            {autoCyclePresets ? 'VJ Auto-Cycle: ON' : 'VJ Auto-Cycle'}
                          </button>
                          <span className="font-mono tabular-nums text-amber-400">
                            {presetFadeDuration <= 0.01
                              ? 'Instant (0.0s)'
                              : `${presetFadeDuration.toFixed(1)}s Dissolve`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.0"
                          max="5.0"
                          step="0.1"
                          value={presetFadeDuration}
                          onChange={(e) =>
                            setPresetFadeDuration(parseFloat(e.target.value))
                          }
                          aria-label="Preset Crossfade Duration in Seconds"
                          className="flex-1 hud-slider"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          {[
                            { label: '0s', val: 0.0 },
                            { label: '1.0s', val: 1.0 },
                            { label: '1.8s', val: 1.8 },
                            { label: '3.5s', val: 3.5 },
                          ].map((opt) => {
                            const active =
                              Math.abs(presetFadeDuration - opt.val) < 0.05;
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setPresetFadeDuration(opt.val)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-amber-400 text-neutral-950 border-amber-300 font-semibold'
                                    : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {transitionProgress !== null && (
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-amber-300">
                            <span>Crossfading live shader passes...</span>
                            <span>{Math.round(transitionProgress * 100)}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-amber-400 transition-all duration-75"
                              style={{
                                width: `${Math.min(100, Math.max(0, transitionProgress * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Mechanic Mutators for Active Preset */}
                    <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-neutral-300">
                        <span className="font-semibold text-amber-300">
                          Live Preset Mechanics Mutator
                        </span>
                        <span className="font-mono text-neutral-400">
                          Trails {Math.round((state.trailPersistence ?? 0) * 100)}% · Fill{' '}
                          {Math.round(state.negativeSpaceFill * 100)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={handleRotateActiveOrder}
                          title="Cycle #1 top layer to the back of the active stack so #2 becomes #1"
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-200 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                        >
                          <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Cycle #1→#N</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleReverseActiveOrder}
                          title="Invert active layer priority stack (#1 ↔ #N)"
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-200 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Flip Stack</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateCoreParam(
                              'layerCoordSpace',
                              state.layerCoordSpace === 0 ? 1 : 0
                            )
                          }
                          title="Toggle between 2D Planar Cartesian and 3D Polar Tunnel Warp coordinates"
                          className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                            state.layerCoordSpace === 1
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : 'bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10'
                          }`}
                        >
                          <Compass className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{state.layerCoordSpace === 1 ? '3D Polar' : '2D Planar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: 'all', label: `All (${SHADER_PRESETS.length})` },
                          { id: 'ps2-visualizer', label: 'PS2 Visualizer (4)' },
                          { id: 'new-layers', label: 'New Shaders' },
                          { id: 'fractal-cascades', label: '400-Iter & Fractals' },
                          { id: 'order-inversions', label: 'Order Inversions' },
                          { id: 'polar-wrapped', label: '3D Polar Space' },
                          { id: 'audio-reactive', label: 'Audio & 4D' },
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPresetCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                            presetCategory === cat.id
                              ? 'bg-amber-500 text-neutral-950 border-amber-400 font-semibold'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {filteredPresets.map((preset) => {
                        const isSelected = activePresetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`w-full p-3.5 rounded-lg text-left border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-400/70 text-white'
                                : 'bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10 hover:border-amber-400/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-white">
                                {preset.name}
                              </span>
                              <span className="text-[11px] text-amber-400 font-mono shrink-0">
                                {preset.badge}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-400 mt-1 leading-relaxed">
                              {preset.subtitle}
                            </div>
                            {preset.mechanics && preset.mechanics.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {preset.mechanics.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] font-mono text-amber-200/90"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'glsl' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-white">
                          Combined Shadertoy GLSL Code
                        </h2>
                        <p className="text-xs text-neutral-400">
                          Dynamically assembled from active modular shader layers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyGlsl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-neutral-950 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {copiedGlsl ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy GLSL
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3.5 rounded-lg bg-neutral-950/90 border border-white/10 text-[11px] leading-relaxed font-mono text-neutral-200 overflow-x-auto select-all">
                      <code>{liveGlslCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      )}

      {/* Discreet Bottom-Left Interactive Telemetry & Playback Bar */}
      <div className="absolute bottom-5 left-6 right-6 z-10 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4 px-4 py-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 text-xs text-neutral-300">
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span className="text-neutral-400">Mouse</span>
            <span className="text-white">
              ({metrics.x >= 0 ? `+${metrics.x.toFixed(2)}` : metrics.x.toFixed(2)},{' '}
              {metrics.y >= 0 ? `+${metrics.y.toFixed(2)}` : metrics.y.toFixed(2)})
            </span>
          </div>
          <span aria-hidden="true" className="text-white/20">
            ·
          </span>
          <div className="hidden sm:flex items-center gap-2 font-mono tabular-nums">
            <span className="text-neutral-400">Polar r</span>
            <span className="text-amber-400">{metrics.r.toFixed(2)}</span>
            <span aria-hidden="true" className="text-white/20">
              ·
            </span>
            <span className="text-neutral-400">θ</span>
            <span className="text-white">{metrics.angleDeg.toFixed(0)}°</span>
          </div>
          <span aria-hidden="true" className="hidden sm:inline text-white/20">
            ·
          </span>
          <div className="hidden md:flex items-center gap-2 font-mono tabular-nums">
            <span className="text-neutral-400">Shader Speed</span>
            <span className="text-amber-400">
              {metrics.shaderTimeScale.toFixed(2)}x
            </span>
            <span className="text-[11px] text-neutral-400">
              {musicDrivesTime
                ? isAudioPlaying
                  ? '(Music-Driven)'
                  : '(Start Music to Animate)'
                : '(Free Clock)'}
            </span>
          </div>
        </div>

        {/* Right-side Quick Viewport Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFollowMouse((prev) => !prev)}
            title="Toggle Mouse Follow (Shortcut: M)"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl backdrop-blur-md border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              followMouse
                ? 'bg-amber-500/25 border-amber-400 text-amber-200 hover:bg-amber-500/35'
                : 'bg-black/55 border-white/15 text-neutral-200 hover:bg-black/75'
            }`}
          >
            {followMouse ? (
              <>
                <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                Following Mouse (M)
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Mouse Locked (M)
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLockAndCenterMouse}
            title="Center shader origin to (0, 0) and lock mouse (Shortcut: C)"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 text-xs font-medium text-neutral-200 hover:text-white hover:bg-black/75 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            Center (0,0)
          </button>

          <button
            type="button"
            onClick={() => void toggleAudioRef.current?.()}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl backdrop-blur-md border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isAudioPlaying
                ? 'bg-amber-400 border-amber-300 text-neutral-950'
                : 'bg-black/55 border-amber-400/50 text-amber-300 hover:bg-black/75'
            }`}
          >
            {isAudioPlaying ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-neutral-950" />
                Music Driving ({metrics.shaderTimeScale.toFixed(2)}x)
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                Play Music to Animate
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isAnimatingSliders;
              setIsAnimatingSliders(next);
              if (next && musicDrivesTime && !isAudioPlaying) {
                void toggleAudioRef.current?.();
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl backdrop-blur-md border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isAnimatingSliders
                ? 'bg-amber-400 border-amber-300 text-neutral-950'
                : 'bg-black/55 border-white/10 text-white hover:bg-black/75'
            }`}
          >
            <Activity
              className={`w-3.5 h-3.5 ${
                isAnimatingSliders ? 'text-neutral-950' : 'text-amber-400'
              }`}
            />
            {isAnimatingSliders
              ? `Animating Active (${activeOrderedLayers.length})`
              : `Animate Active (${activeOrderedLayers.length})`}
          </button>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 text-xs font-medium text-white hover:bg-black/75 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-amber-400" />
                Resume Time
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                Pause Time
              </>
            )}
          </button>

          {hudVisible && (
            <button
              type="button"
              onClick={handleToggleCollapseBoth}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 text-xs font-medium text-white hover:bg-black/75 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {bothPanelsCollapsed ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  Expand Panels
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-neutral-300" />
                  Collapse Panels
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setHudVisible((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 text-xs font-medium text-white hover:bg-black/75 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {hudVisible ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-neutral-300" />
                Hide Controls
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Show Controls
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
