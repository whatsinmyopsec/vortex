/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Disc,
  ExternalLink,
  Link2,
  Maximize2,
  Minimize2,
  Play,
  Radio,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  AudioBandLevels,
  DEFAULT_SYNTH_PARAMS,
  DRUM_PATTERNS,
  DrumPatternId,
  PRESET_SONG_LINKS,
  ProceduralAudioEngine,
  resolveSongUrl,
  resolveSongUrlAsync,
  SynthLiveTelemetry,
  SynthParams,
} from '../audio/proceduralSynth';

function formatTrackTime(sec?: number): string {
  if (!sec || !Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

interface AudioSynthPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  cursorR: number;
  cursorX: number;
  audioBandsRef: React.MutableRefObject<AudioBandLevels>;
  hidden?: boolean;
  shaderTimeScale?: number;
  onAudioStateChange?: (isActive: boolean, musicDrivesTime: boolean) => void;
  externalToggleAudioRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  externalToggleMusicDriveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

type SynthTab = 'drums' | 'voices' | 'architecture';

export const AudioSynthPanel: React.FC<AudioSynthPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  cursorR,
  cursorX,
  audioBandsRef,
  hidden = false,
  shaderTimeScale = 0,
  onAudioStateChange,
  externalToggleAudioRef,
  externalToggleMusicDriveRef,
}) => {
  const [params, setParams] = useState<SynthParams>(DEFAULT_SYNTH_PARAMS);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [synthTab, setSynthTab] = useState<SynthTab>('drums');
  const [expandedVoice, setExpandedVoice] = useState<string | null>('tapePad');
  const [expandedArch, setExpandedArch] = useState<string | null>('audioReactive');
  const [songUrlInput, setSongUrlInput] = useState<string>(
    'https://suno.com/s/lX9vCx1RSB4d9bOP'
  );
  const [showPresetLinks, setShowPresetLinks] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState<boolean>(false);

  const [telemetry, setTelemetry] = useState<SynthLiveTelemetry>({
    subCutoffHz: 250,
    tapePitchOffsetHz: 0,
    tapePanPos: 0,
    lastPingFreqHz: 330,
    lastPingAtMs: 0,
    oceanCutoffHz: 300,
    oceanSwellNorm: 0.4,
    oceanPan: 0,
    lfo1InstantRateHz: 0.28,
    lfo2OutNorm: 0,
    filterCrossModHz: 0,
    bandSub: 0,
    bandMid: 0,
    bandHigh: 0,
    currentStep: 0,
    totalSteps: 16,
    stepsPerBeat: 4,
  });

  const engineRef = useRef<ProceduralAudioEngine | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    engineRef.current = new ProceduralAudioEngine();
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setCursorState(cursorR, cursorX);
  }, [cursorR, cursorX]);

  useEffect(() => {
    engineRef.current?.applyParams(params);
    audioBandsRef.current.musicDrivesTime = params.audioReactive.musicDrivesTime;
    audioBandsRef.current.animDrive = params.audioReactive.animDrive;
    audioBandsRef.current.reactivity = params.audioReactive.enabled
      ? params.audioReactive.reactivity
      : 0;
  }, [params, audioBandsRef]);

  useEffect(() => {
    onAudioStateChange?.(isAudioActive, params.audioReactive.musicDrivesTime);
  }, [isAudioActive, params.audioReactive.musicDrivesTime, onAudioStateChange]);

  // Live oscilloscope, FFT frequency bands -> GLSL shader uniform bridge, & telemetry refresh loop
  useEffect(() => {
    let rafId = 0;
    const waveBytes = new Uint8Array(128);

    const renderLoop = () => {
      const engine = engineRef.current;
      if (engine && isAudioActive) {
        const t = engine.getTelemetry();
        setTelemetry({ ...t });
        engine.getWaveformData(waveBytes);

        const liveBands = engine.getAudioBands();
        audioBandsRef.current.sub = liveBands.sub;
        audioBandsRef.current.mid = liveBands.mid;
        audioBandsRef.current.high = liveBands.high;
        audioBandsRef.current.rms = liveBands.rms;
        audioBandsRef.current.reactivity = liveBands.reactivity;
        audioBandsRef.current.beatPulse = liveBands.beatPulse;
        audioBandsRef.current.groovePhase = liveBands.groovePhase;
        audioBandsRef.current.isPlaying = liveBands.isPlaying;
        audioBandsRef.current.musicDrivesTime = liveBands.musicDrivesTime;
        audioBandsRef.current.animDrive = liveBands.animDrive;
      } else {
        waveBytes.fill(128);
        audioBandsRef.current.sub = 0;
        audioBandsRef.current.mid = 0;
        audioBandsRef.current.high = 0;
        audioBandsRef.current.rms = 0;
        audioBandsRef.current.beatPulse = 0;
        audioBandsRef.current.isPlaying = false;
      }

      const canvas = scopeCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          ctx.strokeStyle = isAudioActive ? '#fbbf24' : 'rgba(255,255,255,0.22)';
          ctx.lineWidth = 1.75;
          ctx.beginPath();
          const sliceWidth = w / (waveBytes.length - 1);
          let x = 0;
          for (let i = 0; i < waveBytes.length; i++) {
            const v = waveBytes[i] / 128.0;
            const y = (v * h) / 2;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isAudioActive, audioBandsRef]);

  const ensureEngineRunning = async (
    overrideParams?: SynthParams
  ): Promise<ProceduralAudioEngine | null> => {
    const engine = engineRef.current;
    if (!engine) return null;
    engine.unlockOnUserGesture();
    const targetParams = overrideParams ?? params;
    if (!isAudioActive) {
      await engine.start(targetParams);
      setIsAudioActive(true);
    } else if (overrideParams) {
      engine.applyParams(overrideParams);
    }
    return engine;
  };

  const handleToggleAudio = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isAudioActive) {
      engine.stop();
      setIsAudioActive(false);
    } else {
      engine.unlockOnUserGesture();
      await engine.start(params);
      setIsAudioActive(true);
    }
  };

  const handleLoadSongLink = async (rawLink?: string) => {
    const engine = engineRef.current;
    // Synchronously unlock Web Audio Context during the user's click event before any async fetch
    engine?.unlockOnUserGesture();

    let targetInput = (rawLink ?? songUrlInput).trim();
    if (!targetInput) {
      setUrlError(
        'Paste a Suno link (suno.com/s/... or suno.com/song/...), direct audio link (.mp3, .wav, .ogg, .m4a), Dropbox/GitHub link, or stream URL.'
      );
      return;
    }

    // Automatically prepend https:// if the user pasted e.g. suno.com/s/lX9vCx1RSB4d9bOP
    if (
      !targetInput.startsWith('http://') &&
      !targetInput.startsWith('https://') &&
      !targetInput.startsWith('/')
    ) {
      targetInput = `https://${targetInput}`;
    }

    const initialCheck = resolveSongUrl(targetInput);
    if (initialCheck.unsupportedHint) {
      setUrlError(initialCheck.unsupportedHint);
      return;
    }

    setUrlError(null);
    if (rawLink !== undefined) {
      setSongUrlInput(rawLink);
    }

    setIsResolvingUrl(true);
    try {
      const resolved = await resolveSongUrlAsync(targetInput);
      if (resolved.unsupportedHint) {
        setUrlError(resolved.unsupportedHint);
        return;
      }

      const nextParams: SynthParams = {
        ...params,
        audioSource: 'customUrl',
        customAudioUrl: resolved.url,
        customAudioTitle: resolved.title,
      };
      setParams(nextParams);

      if (!engine) return;

      if (!isAudioActive) {
        await engine.start(nextParams);
        setIsAudioActive(true);
      } else {
        engine.applyParams(nextParams);
      }
    } finally {
      setIsResolvingUrl(false);
    }
  };

  const handleToggleMusicDrivesTime = async () => {
    engineRef.current?.unlockOnUserGesture();
    const nextMusicDrives = !params.audioReactive.musicDrivesTime;
    const nextParams: SynthParams = {
      ...params,
      audioReactive: {
        ...params.audioReactive,
        enabled: nextMusicDrives ? true : params.audioReactive.enabled,
        musicDrivesTime: nextMusicDrives,
      },
    };
    setParams(nextParams);
    if (nextMusicDrives && !isAudioActive) {
      await ensureEngineRunning(nextParams);
    }
  };

  useEffect(() => {
    if (externalToggleAudioRef) {
      externalToggleAudioRef.current = handleToggleAudio;
    }
    if (externalToggleMusicDriveRef) {
      externalToggleMusicDriveRef.current = handleToggleMusicDrivesTime;
    }
  });

  const handleManualPing = async (freqHz?: number) => {
    const engine = await ensureEngineRunning();
    engine?.triggerBuchlaPing(freqHz);
  };

  const handlePadKick = async () => {
    const engine = await ensureEngineRunning();
    engine?.triggerKick(1.0);
  };

  const handlePadSnare = async () => {
    const engine = await ensureEngineRunning();
    engine?.triggerSnare(1.0);
  };

  const handlePadClosedHat = async () => {
    const engine = await ensureEngineRunning();
    engine?.triggerHiHat(false, 1.0);
  };

  const handlePadOpenHat = async () => {
    const engine = await ensureEngineRunning();
    engine?.triggerHiHat(true, 1.0);
  };

  const handlePadPluck = async () => {
    const engine = await ensureEngineRunning();
    engine?.triggerFmPluck(undefined, 1.0);
  };

  const handleResetSynth = () => {
    setUrlError(null);
    setParams(DEFAULT_SYNTH_PARAMS);
  };

  const toggleVoiceAccordion = (voiceId: string) => {
    setExpandedVoice((prev) => (prev === voiceId ? null : voiceId));
  };

  const toggleArchAccordion = (archId: string) => {
    setExpandedArch((prev) => (prev === archId ? null : archId));
  };

  const activeVoiceCount = [
    params.subBass.enabled,
    params.tapePad.enabled,
    params.buchlaPing.enabled,
    params.oceanWaves.enabled,
    params.justDrone.enabled,
  ].filter(Boolean).length;

  const isCustomUrlMode = params.audioSource === 'customUrl';

  return (
    <aside
      aria-label="Live Procedural Web Audio Synthesizer"
      className={`absolute top-18 left-6 z-10 w-[420px] max-w-[calc(100vw-3rem)] flex flex-col rounded-xl bg-black/65 backdrop-blur-md border border-white/10 text-white overflow-hidden transition-all duration-200 ${
        isCollapsed ? 'max-h-[60px]' : 'max-h-[calc(100vh-7.5rem)]'
      } ${hidden ? 'hidden' : ''}`}
    >
      {/* Panel Header with Collapse / Expand Button */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleToggleAudio}
            title={isAudioActive ? 'Mute Audio Engine' : 'Start Audio Engine'}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-colors shrink-0 cursor-pointer ${
              isAudioActive
                ? 'bg-amber-400 border-amber-300 text-neutral-950'
                : 'bg-white/5 border-white/15 text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isAudioActive ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold tracking-wide text-white truncate">
                {isCustomUrlMode
                  ? params.customAudioTitle || telemetry.trackTitle || 'Linked Song Stream'
                  : params.audioSource === 'weightlessMp3' ||
                    (params.audioSource === 'procedural' &&
                      params.coreDrums.pattern === 'weightlessDnb')
                  ? 'Weightless · Ethereal Liquid DnB & Choir'
                  : 'Astral Drift · Heavy Bass & Crunch'}
              </h2>
              <span className="text-[10px] font-mono text-amber-400 shrink-0">
                {isCustomUrlMode
                  ? 'SONG LINK'
                  : `${params.coreDrums.bpm} BPM`}
              </span>
            </div>
            <p className="text-[10px] font-mono text-neutral-400 truncate">
              {isCustomUrlMode
                ? params.customAudioUrl || 'Paste a song link below to drive shaders'
                : params.audioSource === 'weightlessMp3' ||
                  (params.audioSource === 'procedural' &&
                    params.coreDrums.pattern === 'weightlessDnb')
                ? 'Fm9 → Dbmaj9 → Abmaj7 → Ebmaj7 · Liquid DnB + Vocal Pad'
                : 'Em9 → Cmaj9 → Gmaj7 → Dadd9 · Crunchy Reese Bass + Gliding Lead'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={
            isCollapsed
              ? 'Expand Audio Synthesizer Panel'
              : 'Collapse Audio Synthesizer Panel'
          }
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
        >
          {isCollapsed ? (
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

      {/* Collapsible Panel Body */}
      {!isCollapsed && (
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Top Master Control + Song Link Input + Live Oscilloscope + FFT Audio-to-Shader Bars */}
          <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isAudioActive
                    ? 'bg-amber-400 border-amber-300 text-neutral-950'
                    : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                {isAudioActive
                  ? 'Audio Engine Running (Click to Stop)'
                  : 'Start Live Audio Engine'}
              </button>

              <button
                type="button"
                onClick={handleResetSynth}
                title="Reset synthesizer parameters"
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Audio Source Switcher: Procedural Synths vs Song Link (URL) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-neutral-950/80 border border-white/10">
              <button
                type="button"
                onClick={async () => {
                  engineRef.current?.unlockOnUserGesture();
                  setUrlError(null);
                  const nextParams: SynthParams = {
                    ...params,
                    audioSource: 'procedural',
                    coreDrums: {
                      ...params.coreDrums,
                      pattern: 'astralDrift',
                      bpm: 94,
                      swing: 0.14,
                      kickDecaySec: 0.42,
                      hatToneHz: 7600,
                      hatDecaySec: 0.048,
                    },
                    subBass: {
                      ...params.subBass,
                      crunchDrive: 0.68,
                      sidechainDepth: 0.78,
                    },
                    spatialFx: {
                      ...params.spatialFx,
                      reverbMix: 0.48,
                      delayMix: 0.38,
                      delayLeftSec: 0.319,
                    },
                  };
                  setParams(nextParams);
                  await ensureEngineRunning(nextParams);
                }}
                className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer truncate ${
                  params.audioSource === 'procedural' &&
                  params.coreDrums.pattern !== 'weightlessDnb'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'text-neutral-300 hover:text-white bg-white/[0.03]'
                }`}
              >
                Synth: Astral (94)
              </button>
              <button
                type="button"
                onClick={async () => {
                  engineRef.current?.unlockOnUserGesture();
                  setUrlError(null);
                  const nextParams: SynthParams = {
                    ...params,
                    audioSource: 'procedural',
                    coreDrums: {
                      ...params.coreDrums,
                      pattern: 'weightlessDnb',
                      bpm: 174,
                      swing: 0.04,
                      kickDecaySec: 0.16,
                      hatToneHz: 8800,
                      hatDecaySec: 0.034,
                    },
                    subBass: {
                      ...params.subBass,
                      crunchDrive: 0.14,
                      sidechainDepth: 0.38,
                    },
                    spatialFx: {
                      ...params.spatialFx,
                      reverbMix: 0.68,
                      delayMix: 0.48,
                      delayLeftSec: 0.258,
                    },
                  };
                  setParams(nextParams);
                  await ensureEngineRunning(nextParams);
                }}
                className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer truncate ${
                  params.audioSource === 'procedural' &&
                  params.coreDrums.pattern === 'weightlessDnb'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'text-neutral-300 hover:text-white bg-white/[0.03]'
                }`}
              >
                Synth: Weightless
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (songUrlInput.trim()) {
                    await handleLoadSongLink(songUrlInput);
                  } else {
                    const defaultLink = PRESET_SONG_LINKS[0].url;
                    setSongUrlInput(defaultLink);
                    await handleLoadSongLink(defaultLink);
                  }
                }}
                className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer truncate ${
                  isCustomUrlMode
                    ? 'bg-amber-400 text-neutral-950'
                    : 'text-neutral-300 hover:text-white bg-white/[0.03]'
                }`}
              >
                <Link2 className="w-3 h-3 shrink-0" />
                <span>Song Link</span>
              </button>
            </div>

            {/* Song Link (URL) Input Box & Stream Controls */}
            <div className="p-2.5 rounded-lg bg-neutral-950/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white">
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  Song Link / Audio Stream URL
                </span>
                <button
                  type="button"
                  onClick={() => setShowPresetLinks((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <span>{showPresetLinks ? 'Hide Sample Links' : 'Sample Links'}</span>
                  {showPresetLinks ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleLoadSongLink();
                }}
                className="flex items-center gap-1.5"
              >
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={songUrlInput}
                    onChange={(e) => {
                      setSongUrlInput(e.target.value);
                      if (urlError) setUrlError(null);
                    }}
                    placeholder="Paste Suno link (suno.com/s/...), .mp3, .m4a, Dropbox, stream..."
                    className="w-full pl-2.5 pr-7 py-1.5 rounded-md bg-white/[0.06] border border-white/15 focus:border-amber-400 focus:outline-none text-[11px] font-mono text-white placeholder:text-neutral-500"
                  />
                  {songUrlInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSongUrlInput('');
                        setUrlError(null);
                      }}
                      title="Clear link"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isResolvingUrl}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-neutral-950 text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isResolvingUrl ? 'Resolving...' : 'Load Link'}</span>
                </button>
              </form>

              {/* Quick Sample Song & Radio Stream Links */}
              {showPresetLinks && (
                <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/10">
                  {PRESET_SONG_LINKS.map((preset) => {
                    const isCurrentLink =
                      isCustomUrlMode &&
                      (songUrlInput.trim() === preset.url ||
                        params.customAudioUrl === preset.url);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          void handleLoadSongLink(preset.url);
                        }}
                        className={`px-2 py-1.5 rounded text-left transition-colors cursor-pointer border ${
                          isCurrentLink
                            ? 'bg-amber-400/20 border-amber-400 text-white'
                            : 'bg-white/[0.03] border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="text-[10px] font-semibold truncate flex items-center justify-between gap-1">
                          <span className="truncate">{preset.label}</span>
                          {isCurrentLink && (
                            <Check className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[9px] font-mono text-neutral-400 truncate">
                          {preset.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active Song Link Status & Scrubber Bar */}
              {(isCustomUrlMode || urlError || telemetry.trackErrorMessage) && (
                <div className="pt-1 space-y-1.5">
                  {(urlError || telemetry.trackErrorMessage) ? (
                    <div className="flex items-start gap-1.5 p-2 rounded bg-rose-500/15 border border-rose-400/40 text-[10px] text-rose-200 leading-relaxed">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{urlError || telemetry.trackErrorMessage}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-amber-300 truncate max-w-[200px]">
                          {params.customAudioTitle || telemetry.trackTitle || 'Linked Track'}
                        </span>
                        <span className="text-neutral-400 shrink-0">
                          {telemetry.trackStatus === 'loading'
                            ? 'Connecting stream...'
                            : telemetry.trackDurationSec && telemetry.trackDurationSec > 0
                            ? `${formatTrackTime(telemetry.trackCurrentTimeSec)} / ${formatTrackTime(
                                telemetry.trackDurationSec
                              )}`
                            : 'LIVE AUDIO STREAM'}
                        </span>
                      </div>
                      {telemetry.trackDurationSec && telemetry.trackDurationSec > 0 ? (
                        <input
                          type="range"
                          min={0}
                          max={telemetry.trackDurationSec}
                          step={0.5}
                          value={telemetry.trackCurrentTimeSec || 0}
                          onChange={(e) => {
                            engineRef.current?.seekTrack(parseFloat(e.target.value));
                          }}
                          className="w-full hud-slider"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Real-time Web Audio Waveform Scope */}
            <div className="relative rounded-md bg-neutral-950/90 border border-white/10 overflow-hidden">
              <canvas
                ref={scopeCanvasRef}
                width={350}
                height={46}
                className="w-full h-[46px] block"
              />
              <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-neutral-400 pointer-events-none">
                {isCustomUrlMode ? (
                  <>
                    <span className="truncate max-w-[170px]">
                      TRACK:{' '}
                      <strong className="text-amber-400">
                        {params.customAudioTitle || telemetry.trackTitle || 'Custom Link'}
                      </strong>
                    </span>
                    <span>
                      MODE:{' '}
                      <strong className="text-emerald-400">
                        {telemetry.trackStatus === 'cors-fallback'
                          ? 'DIRECT STREAM'
                          : 'FFT REACTIVE'}
                      </strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      CHORD:{' '}
                      <strong className="text-amber-400">
                        {telemetry.currentChordName || 'Em9'}
                      </strong>
                    </span>
                    <span>
                      REESE LPF:{' '}
                      <strong className="text-amber-400">
                        {telemetry.subCutoffHz.toFixed(0)}Hz
                      </strong>
                    </span>
                    <span>
                      STEP:{' '}
                      <strong className="text-amber-400">
                        {telemetry.currentStep + 1}/{telemetry.totalSteps || 16}
                      </strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Real-Time AnalyserNode FFT Bands Pumping GLSL Shaders */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-neutral-400">uAudioSub</span>
                  <span className="text-amber-400">
                    {Math.round(telemetry.bandSub * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-75"
                    style={{
                      width: `${Math.min(100, Math.round(telemetry.bandSub * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-neutral-400">uAudioMid</span>
                  <span className="text-sky-400">
                    {Math.round(telemetry.bandMid * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all duration-75"
                    style={{
                      width: `${Math.min(100, Math.round(telemetry.bandMid * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-neutral-400">uAudioHigh</span>
                  <span className="text-emerald-400">
                    {Math.round(telemetry.bandHigh * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{
                      width: `${Math.min(100, Math.round(telemetry.bandHigh * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Music Controls Shader Animation Status & Velocity Bar */}
            <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleToggleMusicDrivesTime}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                    params.audioReactive.musicDrivesTime
                      ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  Music Drives Shader Animation:{' '}
                  {params.audioReactive.musicDrivesTime ? 'ON' : 'OFF'}
                </button>
                <span className="text-[11px] font-mono text-amber-400 tabular-nums">
                  {params.audioReactive.musicDrivesTime && !isAudioActive
                    ? '0.00x (Waiting)'
                    : `${shaderTimeScale.toFixed(2)}x Speed`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400 transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.round((shaderTimeScale / 2.6) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Master Gain & Cursor Coupling */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-300">Master Gain</span>
                  <span className="font-mono text-amber-400">
                    {Math.round(params.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={params.masterVolume}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      masterVolume: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full hud-slider"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    setParams((p) => ({ ...p, cursorCoupling: !p.cursorCoupling }))
                  }
                  className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    params.cursorCoupling
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {params.cursorCoupling ? 'Cursor Warp Coupled' : 'Cursor Warp Off'}
                </button>
              </div>
            </div>
          </div>

          {/* Segmented Mode Switcher: Drums & Core | 5 Osc Voices | FX · Matrix */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
            <button
              type="button"
              onClick={() => setSynthTab('drums')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                synthTab === 'drums'
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              Drums &amp; Core
            </button>
            <button
              type="button"
              onClick={() => setSynthTab('voices')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                synthTab === 'voices'
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Voices ({activeVoiceCount}/5)
            </button>
            <button
              type="button"
              onClick={() => setSynthTab('architecture')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                synthTab === 'architecture'
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              FX · Matrix
            </button>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: DRUMS & CORE SOUNDS (Kicks, Hi-Hats, Snare, FM Pluck)      */}
          {/* ================================================================= */}
          {synthTab === 'drums' && (
            <div className="space-y-3">
              {/* Live 6-Pad Drum & Core Sound Trigger Matrix */}
              <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Live Trigger Pads &amp;{' '}
                    {DRUM_PATTERNS[params.coreDrums.pattern]?.stepsPerBeat === 3
                      ? '12-Step Triplet Sequencer'
                      : '16-Step Sequencer'}
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.coreDrums.enabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: { ...p.coreDrums, enabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    Sequencer Run
                  </label>
                </div>

                {/* 16-Step or 12-Step Triplet Visual LED Bar */}
                {(() => {
                  const activePat =
                    DRUM_PATTERNS[params.coreDrums.pattern] || DRUM_PATTERNS.hypnotic4x4;
                  const stepCount = activePat.totalSteps;
                  const stepsPerBeat = activePat.stepsPerBeat;
                  return (
                    <div
                      className={`grid ${
                        stepCount === 12 ? 'grid-cols-12' : 'grid-cols-16'
                      } gap-1 pt-0.5`}
                    >
                      {Array.from({ length: stepCount }).map((_, stepIdx) => {
                        const isCurrent =
                          isAudioActive && telemetry.currentStep === stepIdx;
                        const isBeat = stepIdx % stepsPerBeat === 0;
                        return (
                          <div
                            key={stepIdx}
                            className={`h-2 rounded-sm transition-colors ${
                              isCurrent
                                ? 'bg-amber-400'
                                : isBeat
                                ? 'bg-white/30'
                                : 'bg-white/10'
                            }`}
                          />
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 6 Interactive Trigger Pads */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={handlePadKick}
                    className="px-2.5 py-2 rounded-lg bg-amber-500/15 border border-amber-400/50 hover:bg-amber-400 hover:text-neutral-950 text-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    808 Sub Kick
                  </button>
                  <button
                    type="button"
                    onClick={handlePadClosedHat}
                    className="px-2.5 py-2 rounded-lg bg-white/5 border border-white/15 hover:bg-amber-400 hover:text-neutral-950 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Closed Hi-Hat
                  </button>
                  <button
                    type="button"
                    onClick={handlePadOpenHat}
                    className="px-2.5 py-2 rounded-lg bg-white/5 border border-white/15 hover:bg-amber-400 hover:text-neutral-950 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Open Hi-Hat
                  </button>
                  <button
                    type="button"
                    onClick={handlePadSnare}
                    className="px-2.5 py-2 rounded-lg bg-white/5 border border-white/15 hover:bg-amber-400 hover:text-neutral-950 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Analog Snare
                  </button>
                  <button
                    type="button"
                    onClick={handlePadPluck}
                    className="px-2.5 py-2 rounded-lg bg-white/5 border border-white/15 hover:bg-amber-400 hover:text-neutral-950 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    FM Bass Pluck
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualPing()}
                    className="px-2.5 py-2 rounded-lg bg-white/5 border border-white/15 hover:bg-amber-400 hover:text-neutral-950 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Buchla Ping
                  </button>
                </div>

                {/* Groove Pattern Selector */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {(Object.keys(DRUM_PATTERNS) as DrumPatternId[]).map((patId) => {
                    const isSelected = params.coreDrums.pattern === patId;
                    const isTripletPat = patId === 'psyTriplet';
                    return (
                      <button
                        key={patId}
                        type="button"
                        onClick={() =>
                          setParams((p) => ({
                            ...p,
                            audioSource: 'procedural',
                            coreDrums: {
                              ...p.coreDrums,
                              pattern: patId,
                              bpm:
                                patId === 'weightlessDnb'
                                  ? 174
                                  : patId === 'astralDrift'
                                  ? 94
                                  : patId === 'psyTriplet' && p.coreDrums.bpm < 132
                                  ? 138
                                  : p.coreDrums.bpm,
                              kickDecaySec:
                                patId === 'weightlessDnb'
                                  ? 0.16
                                  : patId === 'astralDrift'
                                  ? 0.42
                                  : p.coreDrums.kickDecaySec,
                              hatToneHz:
                                patId === 'weightlessDnb'
                                  ? 8800
                                  : patId === 'astralDrift'
                                  ? 7600
                                  : p.coreDrums.hatToneHz,
                            },
                            subBass: {
                              ...p.subBass,
                              crunchDrive:
                                patId === 'weightlessDnb'
                                  ? 0.14
                                  : patId === 'astralDrift'
                                  ? 0.68
                                  : p.subBass.crunchDrive,
                              sidechainDepth:
                                patId === 'weightlessDnb'
                                  ? 0.38
                                  : patId === 'astralDrift'
                                  ? 0.78
                                  : p.subBass.sidechainDepth,
                            },
                            spatialFx: {
                              ...p.spatialFx,
                              reverbMix:
                                patId === 'weightlessDnb'
                                  ? 0.68
                                  : patId === 'astralDrift'
                                  ? 0.48
                                  : p.spatialFx.reverbMix,
                              delayMix:
                                patId === 'weightlessDnb'
                                  ? 0.48
                                  : patId === 'astralDrift'
                                  ? 0.38
                                  : p.spatialFx.delayMix,
                            },
                          }))
                        }
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border text-left truncate transition-colors cursor-pointer ${
                          isTripletPat ? 'col-span-2' : ''
                        } ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-white font-semibold'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {DRUM_PATTERNS[patId].name}
                      </button>
                    );
                  })}
                </div>

                {/* Tempo BPM & Groove Swing */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-300">Tempo (BPM)</span>
                      <span className="font-mono text-amber-400">
                        {params.coreDrums.bpm} BPM
                      </span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="180"
                      step="1"
                      value={params.coreDrums.bpm}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            bpm: parseInt(e.target.value, 10),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-300">16th Groove Swing</span>
                      <span className="font-mono text-amber-400">
                        {Math.round(params.coreDrums.swing * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.4"
                      step="0.02"
                      value={params.coreDrums.swing}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            swing: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                </div>
              </div>

              {/* 1. Analog 808/909 Sub Kick Controls */}
              <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.coreDrums.kickEnabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: { ...p.coreDrums, kickEnabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    Analog 808 Sub Kick (Pitch-Drop Sine + Beater Click)
                  </label>
                  <span className="text-[10px] font-mono text-amber-400">
                    {params.coreDrums.kickPunchHz}Hz → 46Hz
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Level</span>
                      <span className="font-mono text-amber-400">
                        {Math.round(params.coreDrums.kickGain * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={params.coreDrums.kickGain}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            kickGain: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Punch Pitch</span>
                      <span className="font-mono text-amber-400">
                        {params.coreDrums.kickPunchHz}Hz
                      </span>
                    </div>
                    <input
                      type="range"
                      min="95"
                      max="220"
                      step="5"
                      value={params.coreDrums.kickPunchHz}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            kickPunchHz: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Sub Decay</span>
                      <span className="font-mono text-amber-400">
                        {params.coreDrums.kickDecaySec.toFixed(2)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.75"
                      step="0.02"
                      value={params.coreDrums.kickDecaySec}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            kickDecaySec: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Metallic Closed & Open Hi-Hats Controls */}
              <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.coreDrums.hatsEnabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: { ...p.coreDrums, hatsEnabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    Metallic Closed &amp; Open Hi-Hats (Square Matrix + HPF)
                  </label>
                  <span className="text-[10px] font-mono text-amber-400">
                    {(params.coreDrums.hatToneHz / 1000).toFixed(1)}kHz
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Level</span>
                      <span className="font-mono text-amber-400">
                        {Math.round(params.coreDrums.hatsGain * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={params.coreDrums.hatsGain}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            hatsGain: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Shimmer HPF</span>
                      <span className="font-mono text-amber-400">
                        {(params.coreDrums.hatToneHz / 1000).toFixed(1)}k
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4500"
                      max="11000"
                      step="200"
                      value={params.coreDrums.hatToneHz}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            hatToneHz: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Crispness</span>
                      <span className="font-mono text-amber-400">
                        {Math.round(params.coreDrums.hatDecaySec * 1000)}ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.12"
                      step="0.005"
                      value={params.coreDrums.hatDecaySec}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            hatDecaySec: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Snare + 4. FM Acid Bass Pluck Controls */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10 space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.coreDrums.snareEnabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            snareEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    Analog Snare / Clap
                  </label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Snare Level</span>
                      <span className="font-mono text-amber-400">
                        {Math.round(params.coreDrums.snareGain * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={params.coreDrums.snareGain}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            snareGain: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Wire Snap</span>
                      <span className="font-mono text-amber-400">
                        {Math.round(params.coreDrums.snareSnap * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={params.coreDrums.snareSnap}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            snareSnap: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10 space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.coreDrums.fmPluckEnabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            fmPluckEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    FM Acid Bass Pluck
                  </label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Pluck Level</span>
                      <span className="font-mono text-amber-400">
                        {Math.round(params.coreDrums.fmPluckGain * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={params.coreDrums.fmPluckGain}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            fmPluckGain: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Acid Filter</span>
                      <span className="font-mono text-amber-400">
                        {params.coreDrums.fmPluckCutoff}Hz
                      </span>
                    </div>
                    <input
                      type="range"
                      min="400"
                      max="3200"
                      step="50"
                      value={params.coreDrums.fmPluckCutoff}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          coreDrums: {
                            ...p.coreDrums,
                            fmPluckCutoff: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full hud-slider"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {synthTab === 'architecture' && (
            <div className="space-y-3">
              {/* ============================================================= */}
              {/* 1. AUDIO-REACTIVE GLSL SHADERS (The Ultimate Synergy)         */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={params.audioReactive.enabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          audioReactive: {
                            ...p.audioReactive,
                            enabled: e.target.checked,
                          },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleArchAccordion('audioReactive')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        1. Audio-Reactive GLSL Shaders (AnalyserNode)
                      </div>
                      <div className="text-[10px] font-mono text-amber-400/90 truncate">
                        Sub · Mid · Highs → All 20 Shader Layers
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleArchAccordion('audioReactive')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedArch === 'audioReactive' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedArch === 'audioReactive' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Drives shader <code className="text-amber-300">iTime</code> velocity, vortex twist, radial tunnel depth, and all 20 layers&apos; continuous parameters directly from live kicks, acid plucks, hi-hats, and FFT bands.
                    </p>

                    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-neutral-950/70 border border-white/10">
                      <span className="text-[11px] font-medium text-neutral-200">
                        Lock Shader Clock &amp; Morph to Music
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleMusicDrivesTime}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                          params.audioReactive.musicDrivesTime
                            ? 'bg-amber-400 border-amber-300 text-neutral-950'
                            : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                        }`}
                      >
                        {params.audioReactive.musicDrivesTime ? 'Music-Driven' : 'Free Clock'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">
                            Animation Speed Drive
                          </span>
                          <span className="font-mono text-amber-400">
                            {params.audioReactive.animDrive.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="2.5"
                          step="0.05"
                          value={params.audioReactive.animDrive}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              audioReactive: {
                                ...p.audioReactive,
                                animDrive: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">
                            Master Shader Reactivity
                          </span>
                          <span className="font-mono text-amber-400">
                            {params.audioReactive.reactivity.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2.5"
                          step="0.05"
                          value={params.audioReactive.reactivity}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              audioReactive: {
                                ...p.audioReactive,
                                reactivity: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Sub → All 20 Layers</span>
                          <span className="font-mono text-amber-400">
                            {params.audioReactive.subPumpStargate.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2.5"
                          step="0.05"
                          value={params.audioReactive.subPumpStargate}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              audioReactive: {
                                ...p.audioReactive,
                                subPumpStargate: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Highs → All 20 Layers</span>
                          <span className="font-mono text-amber-400">
                            {params.audioReactive.highShiftPlasma.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2.5"
                          step="0.05"
                          value={params.audioReactive.highShiftPlasma}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              audioReactive: {
                                ...p.audioReactive,
                                highShiftPlasma: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* 2. MASTER SPATIAL FX CHAIN (Reverb & Stereo Ping-Pong Delay)  */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={
                        params.spatialFx.delayEnabled || params.spatialFx.reverbEnabled
                      }
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          spatialFx: {
                            ...p.spatialFx,
                            delayEnabled: e.target.checked,
                            reverbEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleArchAccordion('spatialFx')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        2. Master Spatial FX Chain (Reverb &amp; Ping-Pong)
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        Ping-Pong Delay (FB={params.spatialFx.delayFeedback.toFixed(2)}, +{params.spatialFx.delayRightOffsetMs}ms R) + Convolution Reverb
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleArchAccordion('spatialFx')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedArch === 'spatialFx' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedArch === 'spatialFx' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Cross-coupled Stereo Ping-Pong Delay with L/R time offset (+{params.spatialFx.delayRightOffsetMs}ms) feeding into a 3.6s diffuse Cathedral Convolution Reverb bus.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Cathedral Reverb</span>
                          <span className="font-mono text-amber-400">
                            {Math.round(params.spatialFx.reverbMix * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.9"
                          step="0.02"
                          value={params.spatialFx.reverbMix}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              spatialFx: {
                                ...p.spatialFx,
                                reverbMix: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Ping-Pong Mix</span>
                          <span className="font-mono text-amber-400">
                            {Math.round(params.spatialFx.delayMix * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.85"
                          step="0.02"
                          value={params.spatialFx.delayMix}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              spatialFx: {
                                ...p.spatialFx,
                                delayMix: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Delay Feedback</span>
                          <span className="font-mono text-amber-400">
                            {params.spatialFx.delayFeedback.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.82"
                          step="0.01"
                          value={params.spatialFx.delayFeedback}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              spatialFx: {
                                ...p.spatialFx,
                                delayFeedback: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">L/R Offset</span>
                          <span className="font-mono text-amber-400">
                            +{params.spatialFx.delayRightOffsetMs}ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="260"
                          step="5"
                          value={params.spatialFx.delayRightOffsetMs}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              spatialFx: {
                                ...p.spatialFx,
                                delayRightOffsetMs: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* 3. STEREO PANNER (0.05Hz) & HAAS EFFECT (15-30ms)             */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={params.stereoMotion.haasEnabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          stereoMotion: {
                            ...p.stereoMotion,
                            haasEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleArchAccordion('stereoMotion')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        3. Stereo Panner (0.05Hz) &amp; Haas Widener
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        Pad Pan ±{params.stereoMotion.autoPanWidth.toFixed(2)} @ {params.stereoMotion.autoPanRateHz.toFixed(2)}Hz · Haas Delay {params.stereoMotion.haasDelayMs.toFixed(0)}ms
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleArchAccordion('stereoMotion')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedArch === 'stereoMotion' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedArch === 'stereoMotion' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Pans the Tape-Warped Pad via a slow {params.stereoMotion.autoPanRateHz.toFixed(2)}Hz LFO (-{params.stereoMotion.autoPanWidth.toFixed(1)} to +{params.stereoMotion.autoPanWidth.toFixed(1)}) and splits oscillator channels with a {params.stereoMotion.haasDelayMs.toFixed(0)}ms Haas psychoacoustic delay.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Auto-Pan Width</span>
                          <span className="font-mono text-amber-400">
                            ±{params.stereoMotion.autoPanWidth.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.0"
                          step="0.05"
                          value={params.stereoMotion.autoPanWidth}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              stereoMotion: {
                                ...p.stereoMotion,
                                autoPanWidth: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Pan LFO Rate</span>
                          <span className="font-mono text-amber-400">
                            {params.stereoMotion.autoPanRateHz.toFixed(2)}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.02"
                          max="0.25"
                          step="0.01"
                          value={params.stereoMotion.autoPanRateHz}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              stereoMotion: {
                                ...p.stereoMotion,
                                autoPanRateHz: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Haas R-Delay</span>
                          <span className="font-mono text-amber-400">
                            {params.stereoMotion.haasDelayMs.toFixed(0)}ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="30"
                          step="1"
                          value={params.stereoMotion.haasDelayMs}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              stereoMotion: {
                                ...p.stereoMotion,
                                haasDelayMs: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Haas Wall Spread</span>
                          <span className="font-mono text-amber-400">
                            {Math.round(params.stereoMotion.haasSpread * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={params.stereoMotion.haasSpread}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              stereoMotion: {
                                ...p.stereoMotion,
                                haasSpread: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* 4. THE MODULATION MATRIX (LFO Cross-Modulation)               */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={params.modMatrix.enabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          modMatrix: { ...p.modMatrix, enabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleArchAccordion('modMatrix')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        4. The Modulation Matrix (LFO Cross-Mod)
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        LFO 2 ({params.modMatrix.lfo2RateHz.toFixed(3)}Hz) → LFO 1 Rate ({telemetry.lfo1InstantRateHz.toFixed(2)}Hz) → Filter LPF
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleArchAccordion('modMatrix')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedArch === 'modMatrix' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedArch === 'modMatrix' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      LFO 2 ({params.modMatrix.lfo2RateHz.toFixed(3)}Hz) continuously modulates the speed and VCA depth of LFO 1, while LFO 1 drives the lowpass filter cutoff for non-repeating generative phrasing.
                    </p>

                    <div className="p-2 rounded bg-neutral-950/80 border border-white/10 flex items-center justify-between text-[10px] font-mono">
                      <span>
                        LFO 1 Speed:{' '}
                        <strong className="text-amber-400">
                          {telemetry.lfo1InstantRateHz.toFixed(2)}Hz
                        </strong>
                      </span>
                      <span>
                        LPF Offset:{' '}
                        <strong className="text-amber-400">
                          {telemetry.filterCrossModHz >= 0
                            ? `+${telemetry.filterCrossModHz.toFixed(0)}Hz`
                            : `${telemetry.filterCrossModHz.toFixed(0)}Hz`}
                        </strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">LFO 1 Base Rate</span>
                          <span className="font-mono text-amber-400">
                            {params.modMatrix.lfo1BaseRateHz.toFixed(2)}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.08"
                          max="1.2"
                          step="0.02"
                          value={params.modMatrix.lfo1BaseRateHz}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              modMatrix: {
                                ...p.modMatrix,
                                lfo1BaseRateHz: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">LFO 1 → LPF Cutoff</span>
                          <span className="font-mono text-amber-400">
                            ±{params.modMatrix.lfo1FilterDepthHz}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="900"
                          step="25"
                          value={params.modMatrix.lfo1FilterDepthHz}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              modMatrix: {
                                ...p.modMatrix,
                                lfo1FilterDepthHz: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">LFO 2 Meta Rate</span>
                          <span className="font-mono text-amber-400">
                            {params.modMatrix.lfo2RateHz.toFixed(3)}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="0.15"
                          step="0.005"
                          value={params.modMatrix.lfo2RateHz}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              modMatrix: {
                                ...p.modMatrix,
                                lfo2RateHz: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">LFO 2 → LFO 1 FM</span>
                          <span className="font-mono text-amber-400">
                            ±{params.modMatrix.lfo2ToLfo1RateDepth.toFixed(2)}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.02"
                          max="0.6"
                          step="0.02"
                          value={params.modMatrix.lfo2ToLfo1RateDepth}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              modMatrix: {
                                ...p.modMatrix,
                                lfo2ToLfo1RateDepth: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {synthTab === 'voices' && (
            <div className="space-y-3">
              {/* ============================================================= */}
              {/* 0. HEAVY CRUNCHY REESE & SUB-BASS FOUNDATION                  */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={params.subBass.enabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          subBass: { ...p.subBass, enabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceAccordion('subBass')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        0. Heavy Crunchy Reese &amp; Sub-Bass
                      </div>
                      <div className="text-[10px] font-mono text-amber-400/90 truncate">
                        Sub Sine + Dual Reese Saws → Tube Crunch ({Math.round((params.subBass.crunchDrive ?? 0.68) * 100)}%) + Kick Sidechain
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVoiceAccordion('subBass')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedVoice === 'subBass' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedVoice === 'subBass' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Follows the 4-bar E-minor progression (<strong className="text-amber-300">Em9 → Cmaj9 → Gmaj7 → Dadd9</strong>) with a deep sub sine + dual detuned Reese sawtooths through a resonant filter envelope, asymmetric tube crunch waveshaper, and kick sidechain pump.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Heavy Bass Level</span>
                          <span className="font-mono text-amber-400">
                            {Math.round(params.subBass.gain * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.02"
                          value={params.subBass.gain}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              subBass: { ...p.subBass, gain: parseFloat(e.target.value) },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Tube Crunch Grit</span>
                          <span className="font-mono text-amber-400">
                            {Math.round((params.subBass.crunchDrive ?? 0.68) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.02"
                          value={params.subBass.crunchDrive ?? 0.68}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              subBass: {
                                ...p.subBass,
                                crunchDrive: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Kick Sidechain Pump</span>
                          <span className="font-mono text-amber-400">
                            {Math.round((params.subBass.sidechainDepth ?? 0.78) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.02"
                          value={params.subBass.sidechainDepth ?? 0.78}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              subBass: {
                                ...p.subBass,
                                sidechainDepth: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Reese Width</span>
                          <span className="font-mono text-amber-400">
                            +{params.subBass.beatDetuneHz.toFixed(2)}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="2.5"
                          step="0.05"
                          value={params.subBass.beatDetuneHz}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              subBass: {
                                ...p.subBass,
                                beatDetuneHz: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* 1. THE TAPE-WARPED AMBIENT PAD (Wow & Flutter)                */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={params.tapePad.enabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          tapePad: { ...p.tapePad, enabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceAccordion('tapePad')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        1. Tape-Warped Ambient Pad (Wow &amp; Flutter)
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        Saw/Tri (~{params.tapePad.detuneCents}c) → WaveShaper → LPF ({params.tapePad.cutoffHz}Hz) · LFO 0.1/0.15Hz
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVoiceAccordion('tapePad')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedVoice === 'tapePad' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedVoice === 'tapePad' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Simulates warm vintage tape instability with independent 0.10Hz &amp; 0.15Hz LFOs modulating pitch by ±{params.tapePad.wowDriftHz.toFixed(1)}Hz into soft-clipping tape saturation.
                    </p>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-300">Pad Mix Level</span>
                        <span className="font-mono text-amber-400">
                          {Math.round(params.tapePad.gain * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={params.tapePad.gain}
                        onChange={(e) =>
                          setParams((p) => ({
                            ...p,
                            tapePad: { ...p.tapePad, gain: parseFloat(e.target.value) },
                          }))
                        }
                        className="w-full hud-slider"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Wow Drift (±Hz)</span>
                          <span className="font-mono text-amber-400">
                            ±{params.tapePad.wowDriftHz.toFixed(1)}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="4.0"
                          step="0.1"
                          value={params.tapePad.wowDriftHz}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              tapePad: {
                                ...p.tapePad,
                                wowDriftHz: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Detune Spread</span>
                          <span className="font-mono text-amber-400">
                            {params.tapePad.detuneCents.toFixed(0)} cents
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="24"
                          step="1"
                          value={params.tapePad.detuneCents}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              tapePad: {
                                ...p.tapePad,
                                detuneCents: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Tape Saturation</span>
                          <span className="font-mono text-amber-400">
                            {Math.round(params.tapePad.saturationDrive * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.02"
                          value={params.tapePad.saturationDrive}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              tapePad: {
                                ...p.tapePad,
                                saturationDrive: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Lowpass Cutoff</span>
                          <span className="font-mono text-amber-400">
                            {params.tapePad.cutoffHz}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="350"
                          max="2800"
                          step="50"
                          value={params.tapePad.cutoffHz}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              tapePad: {
                                ...p.tapePad,
                                cutoffHz: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* 2. SELF-OSCILLATING RESONANT "PING" (West Coast Buchla Bongo) */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={params.buchlaPing.enabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          buchlaPing: { ...p.buchlaPing, enabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceAccordion('buchlaPing')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        2. Soaring Astral Gliding Lead &amp; Crystal Ping
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        Dual Overdriven Saws + Portamento Glide + 5.6Hz Vibrato · E Minor
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVoiceAccordion('buchlaPing')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedVoice === 'buchlaPing' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedVoice === 'buchlaPing' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Excites an extreme-Q BiquadFilterNode (Q={params.buchlaPing.resonanceQ}) with a 0.005s burst of white noise so it rings out like a pitched West Coast acoustic drum.
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleManualPing()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-amber-400 text-neutral-950 hover:bg-amber-300 transition-colors shrink-0 cursor-pointer"
                      >
                        <Zap className="w-3 h-3" />
                        Ping
                      </button>
                      {[220, 275, 330, 440, 550].map((hz) => (
                        <button
                          key={hz}
                          type="button"
                          onClick={() => handleManualPing(hz)}
                          className="flex-1 py-1.5 rounded-md text-[10px] font-mono bg-white/5 border border-white/10 text-neutral-300 hover:bg-amber-500/20 hover:border-amber-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {hz}Hz
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-300">Ping Level</span>
                        <span className="font-mono text-amber-400">
                          {Math.round(params.buchlaPing.gain * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={params.buchlaPing.gain}
                        onChange={(e) =>
                          setParams((p) => ({
                            ...p,
                            buchlaPing: {
                              ...p.buchlaPing,
                              gain: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full hud-slider"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Filter Resonance Q</span>
                          <span className="font-mono text-amber-400">
                            Q = {params.buchlaPing.resonanceQ.toFixed(0)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="18"
                          max="65"
                          step="1"
                          value={params.buchlaPing.resonanceQ}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              buchlaPing: {
                                ...p.buchlaPing,
                                resonanceQ: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Sequence Interval</span>
                          <span className="font-mono text-amber-400">
                            {params.buchlaPing.intervalSec.toFixed(2)}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.25"
                          max="4.0"
                          step="0.05"
                          value={params.buchlaPing.intervalSec}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              buchlaPing: {
                                ...p.buchlaPing,
                                intervalSec: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* 3. STOCHASTIC OCEAN WAVES (Filtered Brown Noise)              */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={params.oceanWaves.enabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          oceanWaves: { ...p.oceanWaves, enabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceAccordion('oceanWaves')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        3. Stochastic Ocean Waves (Brown Noise)
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        1/f² Noise → BPF ({params.oceanWaves.minCutoffHz}Hz &lt;-&gt; {params.oceanWaves.maxCutoffHz}Hz, Q={params.oceanWaves.filterQ.toFixed(1)})
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVoiceAccordion('oceanWaves')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedVoice === 'oceanWaves' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedVoice === 'oceanWaves' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Procedural 1/f² Brown Noise filtered through a compounding {params.oceanWaves.cycleSec}s wave cycle with coupled amplitude swells as each wave crests closer.
                    </p>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                        <span>SWELL CREST: {telemetry.oceanCutoffHz.toFixed(0)}Hz</span>
                        <span>
                          PAN:{' '}
                          {telemetry.oceanPan >= 0
                            ? `R+${telemetry.oceanPan.toFixed(2)}`
                            : `L${telemetry.oceanPan.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-75"
                          style={{
                            width: `${Math.round(telemetry.oceanSwellNorm * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-300">Ocean Surf Level</span>
                        <span className="font-mono text-amber-400">
                          {Math.round(params.oceanWaves.gain * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={params.oceanWaves.gain}
                        onChange={(e) =>
                          setParams((p) => ({
                            ...p,
                            oceanWaves: {
                              ...p.oceanWaves,
                              gain: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full hud-slider"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Wave Period</span>
                          <span className="font-mono text-amber-400">
                            {params.oceanWaves.cycleSec.toFixed(1)}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min="3.0"
                          max="16.0"
                          step="0.5"
                          value={params.oceanWaves.cycleSec}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              oceanWaves: {
                                ...p.oceanWaves,
                                cycleSec: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">Bandpass Q</span>
                          <span className="font-mono text-amber-400">
                            Q = {params.oceanWaves.filterQ.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.8"
                          max="8.0"
                          step="0.2"
                          value={params.oceanWaves.filterQ}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              oceanWaves: {
                                ...p.oceanWaves,
                                filterQ: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* 4. GENERATIVE INTERVAL DRONE (Pythagorean / Just Intonation)  */}
              {/* ============================================================= */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={params.justDrone.enabled}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          justDrone: { ...p.justDrone, enabled: e.target.checked },
                        }))
                      }
                      className="accent-amber-400 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceAccordion('justDrone')}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        4. Generative Interval Drone (Just Intonation)
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        1.0× ({params.justDrone.rootFreq.toFixed(0)}Hz) · 1.25× ({(params.justDrone.rootFreq * 1.25).toFixed(1)}Hz) · 1.5× ({(params.justDrone.rootFreq * 1.5).toFixed(0)}Hz) · 2.0× ({(params.justDrone.rootFreq * 2).toFixed(0)}Hz)
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVoiceAccordion('justDrone')}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {expandedVoice === 'justDrone' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {expandedVoice === 'justDrone' && (
                  <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2.5 text-xs">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Cathedral choir chord locked to mathematically pure harmonic ratios with independent low-rate amplitude tremolo LFOs on every voice.
                    </p>

                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { label: 'Root 1.0×', mult: 1.0 },
                        { label: '3rd 1.25×', mult: 1.25 },
                        { label: '5th 1.50×', mult: 1.5 },
                        { label: 'Oct 2.00×', mult: 2.0 },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="p-1.5 rounded bg-neutral-950/70 border border-white/10"
                        >
                          <div className="text-[9px] text-neutral-400">
                            {item.label}
                          </div>
                          <div className="text-[11px] font-mono text-amber-400 font-semibold">
                            {(params.justDrone.rootFreq * item.mult).toFixed(1)}Hz
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-300">Choir Drone Level</span>
                        <span className="font-mono text-amber-400">
                          {Math.round(params.justDrone.gain * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={params.justDrone.gain}
                        onChange={(e) =>
                          setParams((p) => ({
                            ...p,
                            justDrone: {
                              ...p.justDrone,
                              gain: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full hud-slider"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">
                            Root Pitch (A2=110)
                          </span>
                          <span className="font-mono text-amber-400">
                            {params.justDrone.rootFreq.toFixed(1)}Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="55"
                          max="220"
                          step="0.5"
                          value={params.justDrone.rootFreq}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              justDrone: {
                                ...p.justDrone,
                                rootFreq: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">
                            Tremolo Crossfade
                          </span>
                          <span className="font-mono text-amber-400">
                            {Math.round(params.justDrone.tremoloDepth * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={params.justDrone.tremoloDepth}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              justDrone: {
                                ...p.justDrone,
                                tremoloDepth: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full hud-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
