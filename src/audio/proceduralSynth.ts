/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AudioBandLevels {
  sub: number; // 0.0 - 1.0 (Sub-bass & Kick envelope 20Hz - 150Hz)
  mid: number; // 0.0 - 1.0 (Mids, Crunchy Acid Pluck & Soaring Lead 150Hz - 1.5kHz)
  high: number; // 0.0 - 1.0 (Highs & Hi-Hat shimmer 1.5kHz - 8kHz)
  rms: number; // 0.0 - 1.0 (Master RMS energy)
  reactivity: number; // 0.0 - 2.5 (Shader audio-reactivity multiplier)
  beatPulse: number; // 0.0 - 1.0 (Smooth rhythmic transient envelope from Kick/Snare/Pluck)
  kickZoom: number; // 0.0 - 1.5 (Fast-attack, spring-release Kick + Bassline optical zoom envelope)
  groovePhase: number; // Continuous BPM-locked musical phase
  isPlaying: boolean; // True when procedural synth is actively playing
  musicDrivesTime: boolean; // When true, music controls shader iTime velocity & parameter morphing
  animDrive: number; // 0.0 - 3.5 (Effective shader animation speed drive, scaled by BPM when bpmLinksDrive is true)
  bpm: number; // Live tune tempo in BPM (configured synth BPM or real-time detected stream BPM)
  bpmLinksDrive: boolean; // When true, Animation Speed Drive scales proportionally with the tune's BPM
}

export const DEFAULT_AUDIO_BAND_LEVELS: AudioBandLevels = {
  sub: 0,
  mid: 0,
  high: 0,
  rms: 0,
  reactivity: 1.0,
  beatPulse: 0,
  kickZoom: 0,
  groovePhase: 0,
  isPlaying: true,
  musicDrivesTime: true,
  animDrive: 1.08,
  bpm: 86,
  bpmLinksDrive: true,
};

/**
 * Computes the BPM-to-Animation-Drive multiplier normalized around 100 BPM = 1.00x.
 * E.g. 70 BPM -> 0.70x, 94 BPM -> 0.94x, 128 BPM -> 1.28x, 174 BPM -> 1.74x.
 */
export function computeBpmDriveScale(bpm: number): number {
  const clamped = Math.max(50, Math.min(200, Number.isFinite(bpm) ? bpm : 94));
  return clamped / 100.0;
}

/**
 * Estimates initial seed BPM from a track URL or title before real-time onset detection refines it.
 */
export function estimateSeedBpmFromTrack(
  url?: string,
  title?: string,
  fallbackBpm = 94
): number {
  const combined = `${url || ''} ${title || ''}`.toLowerCase();
  const explicitBpmMatch = combined.match(/\b(\d{2,3})\s*bpm\b/i);
  if (explicitBpmMatch) {
    const parsed = parseInt(explicitBpmMatch[1], 10);
    if (parsed >= 55 && parsed <= 200) return parsed;
  }
  if (combined.includes('weightless')) return 174;
  if (combined.includes('astral_drift') || combined.includes('astral drift')) return 94;
  if (combined.includes('suburbsofgoa') || combined.includes('suburbs of goa')) return 118;
  if (combined.includes('defcon')) return 128;
  if (combined.includes('synphaera')) return 86;
  if (combined.includes('spacestation')) return 96;
  if (combined.includes('vaporwaves')) return 104;
  if (combined.includes('lX9vCx1RSB4d9bOP'.toLowerCase()) || combined.includes('peak satisfaction')) {
    return 124;
  }
  if (combined.includes('35tZN3FK6QJCpt0S'.toLowerCase())) {
    return 132;
  }
  if (
    combined.includes('6ITmtiP9NU83f2Kj'.toLowerCase()) ||
    combined.includes('7f05f29e-bf18-4c7f-9ed9-0094afa656b6') ||
    combined.includes('melodic female')
  ) {
    return 122;
  }
  return fallbackBpm;
}

export type DrumPatternId =
  | 'astralDrift'
  | 'weightlessDnb'
  | 'hypnotic4x4'
  | 'psyTriplet'
  | 'brokenIdm'
  | 'ambientHalftime'
  | 'acidTribal';

export type AudioSourceMode =
  | 'procedural'
  | 'referenceMp3'
  | 'astralDriftMp3'
  | 'weightlessMp3'
  | 'customUrl';

const APP_BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const DEFAULT_STATIC_WORKER_URL =
  'https://vortex-audio-proxy.keose.workers.dev';
const isStaticBrowserHost =
  typeof window !== 'undefined' &&
  /\.(github\.io|pages\.dev|netlify\.app|vercel\.app)$/i.test(
    window.location.hostname
  );
const AUDIO_API_BASE = (
  import.meta.env.VITE_AUDIO_API_BASE ||
  (isStaticBrowserHost ? DEFAULT_STATIC_WORKER_URL : '')
)
  .trim()
  .replace(/\/+$/, '');

export const REFERENCE_TRACK_URLS: Record<
  'referenceMp3' | 'astralDriftMp3' | 'weightlessMp3',
  string
> = {
  referenceMp3: `${APP_BASE_URL}assets/aistudio/Astral_Drift_-_Heavy_Bass___Crunchy_Tone_dd9fd1be.mp3`,
  astralDriftMp3: `${APP_BASE_URL}assets/aistudio/Astral_Drift_-_Heavy_Bass___Crunchy_Tone_dd9fd1be.mp3`,
  weightlessMp3: `${APP_BASE_URL}assets/aistudio/Weightless_f4356b7d.mp3`,
};

export interface PresetSongLink {
  id: string;
  label: string;
  subtitle: string;
  url: string;
}

export const PRESET_SONG_LINKS: PresetSongLink[] = [
  {
    id: 'somafm-synphaera',
    label: 'Synphaera (Live Stream)',
    subtitle: 'Space Ambient · Modern Electronic · Synphaera',
    url: 'https://ice1.somafm.com/synphaera-128-mp3',
  },
  {
    id: 'suno-peak-satisfaction',
    label: 'Peak Satisfaction (lX9vCx1RSB4d9bOP)',
    subtitle: 'Peak Satisfaction (The Unboxing) · Suno AI',
    url: 'https://suno.com/s/lX9vCx1RSB4d9bOP',
  },
  {
    id: 'suno-featured',
    label: 'Suno Track (35tZN3FK6QJCpt0S)',
    subtitle: 'Bro what the ohio rizzler mew gyatt fanu · Suno AI',
    url: 'https://suno.com/s/35tZN3FK6QJCpt0S',
  },
  {
    id: 'suno-melodic-echoing',
    label: 'Melodic Echoing (6ITmtiP9NU83f2Kj)',
    subtitle: '(melodic female, echoing) · Suno AI',
    url: 'https://suno.com/s/6ITmtiP9NU83f2Kj',
  },
  {
    id: 'suno-i-decide',
    label: 'I decide (FX8XlSwbFVdWUJ76)',
    subtitle: 'I decide · Suno AI',
    url: 'https://suno.com/s/FX8XlSwbFVdWUJ76',
  },
  {
    id: 'somafm-defcon',
    label: 'DEF CON Radio (Live Stream)',
    subtitle: 'Dark Electro · Glitch · Hacker Beats',
    url: 'https://ice1.somafm.com/defcon-128-mp3',
  },
  {
    id: 'somafm-spacestation',
    label: 'Space Station Soma (Live Stream)',
    subtitle: 'Deep Space Electronica · Midtempo',
    url: 'https://ice1.somafm.com/spacestation-128-mp3',
  },
  {
    id: 'somafm-goa',
    label: 'Suburbs of Goa (Live Stream)',
    subtitle: 'Psytrance · Asian-influenced Beats',
    url: 'https://ice1.somafm.com/suburbsofgoa-128-mp3',
  },
  {
    id: 'somafm-vaporwaves',
    label: 'Vaporwaves FM (Live Stream)',
    subtitle: 'Synthwave · Future Funk · Chillwave',
    url: 'https://ice1.somafm.com/vaporwaves-128-mp3',
  },
  {
    id: 'astral-drift-link',
    label: 'Astral Drift (Studio Master)',
    subtitle: '94 BPM Heavy Bass & Crunchy Tone',
    url: `${APP_BASE_URL}assets/aistudio/Astral_Drift_-_Heavy_Bass___Crunchy_Tone_dd9fd1be.mp3`,
  },
  {
    id: 'weightless-link',
    label: 'Weightless (Studio Master)',
    subtitle: '174 BPM Liquid DnB & Ethereal Choir',
    url: `${APP_BASE_URL}assets/aistudio/Weightless_f4356b7d.mp3`,
  },
];

const KNOWN_SUNO_SHORTLINKS: Record<string, { uuid: string; title: string }> = {
  lX9vCx1RSB4d9bOP: {
    uuid: '6500d12d-cabc-4b2e-93fe-baa9df341554',
    title: 'Peak Satisfaction (The Unboxing) · Suno',
  },
  '35tZN3FK6QJCpt0S': {
    uuid: '8492f898-13a7-4c67-a33d-684790e3aef3',
    title: 'Bro what the ohio rizzler mew gyatt fanu · Suno',
  },
  '6ITmtiP9NU83f2Kj': {
    uuid: '7f05f29e-bf18-4c7f-9ed9-0094afa656b6',
    title: '(melodic female, echoing) · Suno',
  },
  FX8XlSwbFVdWUJ76: {
    uuid: 'a0e5e8f7-2b1e-41f3-9268-62286968d42c',
    title: 'I decide · Suno',
  },
};

/**
 * Converts any SomaFM web player or station page URL
 * (e.g. https://somafm.com/player24/station/synphaera, https://somafm.com/synphaera/,
 * https://somafm.com/player/#/now-playing/synphaera, https://somafm.com/synphaera.pls)
 * into its direct CORS-enabled Icecast MP3 stream URL: https://ice1.somafm.com/<station>-128-mp3
 */
export function normalizeSomaFmUrl(
  rawUrl: string
): { streamUrl: string; title: string } | null {
  const trimmed = rawUrl.trim();
  const iceMatch = trimmed.match(
    /^https?:\/\/ice\d*\.somafm\.com\/([a-z0-9_-]+?)(?:-(?:128|192|256|64|32)-(?:mp3|aac))?\/?$/i
  );
  if (iceMatch) {
    const station = iceMatch[1].toLowerCase();
    const hasFormatSuffix = /-(?:128|192|256|64|32)-(?:mp3|aac)\/?$/i.test(trimmed);
    const streamUrl = hasFormatSuffix
      ? trimmed.replace(/\/$/, '')
      : `https://ice1.somafm.com/${station}-128-mp3`;
    const preset = PRESET_SONG_LINKS.find((p) => p.url === streamUrl);
    const prettyStation =
      preset?.label ||
      `${station.charAt(0).toUpperCase()}${station.slice(1)} · SomaFM (Live Stream)`;
    return { streamUrl, title: prettyStation };
  }

  const pageMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?somafm\.com\/(?:player\d*\/station\/|player\/#\/now-playing\/|nossl\/)?([a-z0-9_-]+?)(?:130|256|128|64|32)?(?:\.pls|\.m3u|\/index\.html|\/)?(?:[?#].*)?$/i
  );
  if (pageMatch) {
    const station = pageMatch[1].toLowerCase();
    const reserved = new Set([
      'player',
      'player24',
      'about',
      'support',
      'listen',
      'contact',
      'news',
      'podcasts',
      'articles',
      'charts',
    ]);
    if (!reserved.has(station)) {
      const streamUrl = `https://ice1.somafm.com/${station}-128-mp3`;
      const preset = PRESET_SONG_LINKS.find((p) => p.url === streamUrl);
      const prettyStation =
        preset?.label ||
        `${station.charAt(0).toUpperCase()}${station.slice(1)} · SomaFM (Live Stream)`;
      return { streamUrl, title: prettyStation };
    }
  }
  return null;
}

function isStaticHostWithoutWorker(): boolean {
  if (AUDIO_API_BASE) return false;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.vercel.app')
  );
}

function unwrapDirectFallbackUrl(possiblyProxiedUrl: string): string {
  let raw = possiblyProxiedUrl;
  try {
    if (possiblyProxiedUrl.includes('/api/proxy-audio')) {
      const parsed = new URL(possiblyProxiedUrl, window.location.origin);
      const inner = parsed.searchParams.get('url');
      if (inner) raw = inner;
    }
  } catch {
    // keep raw
  }
  const soma = normalizeSomaFmUrl(raw);
  if (soma) {
    return soma.streamUrl;
  }
  // If static hosting has no backend proxy configured, fall back from AES-encrypted .m4a to Suno's unencrypted .mp4 CDN
  const sunoClipMatch = raw.match(
    /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.(?:m4a|mp3|mp4)/i
  );
  if (sunoClipMatch) {
    return `https://cdn1.suno.ai/${sunoClipMatch[1]}.mp4`;
  }
  return raw;
}

function wrapWithAudioProxy(streamUrl: string): string {
  const soma = normalizeSomaFmUrl(streamUrl);
  if (soma) {
    return soma.streamUrl;
  }
  if (
    !streamUrl ||
    streamUrl.startsWith('/') ||
    streamUrl.startsWith('./') ||
    streamUrl.includes('/api/proxy-audio') ||
    streamUrl.includes('somafm.com')
  ) {
    return streamUrl;
  }
  if (isStaticHostWithoutWorker()) {
    return unwrapDirectFallbackUrl(streamUrl);
  }
  return `${AUDIO_API_BASE}/api/proxy-audio?url=${encodeURIComponent(streamUrl)}`;
}

/**
 * Extracts a clean single URL if the user accidentally pasted a second URL
 * directly onto the end of an existing URL in the input box (e.g.
 * "https://ice1.somafm.com/synphaera-128-mp3https://suno.com/s/6ITmtiP9NU83f2Kj").
 */
export function extractCleanSongUrl(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  if (!trimmed.includes('/api/proxy-audio')) {
    const parts = trimmed
      .split(/(?=https?:\/\/)/i)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (/^https?:\/\//i.test(lastPart)) {
        return lastPart.split(/\s+/)[0];
      }
    }
  }
  return trimmed;
}

/**
 * Normalizes common song sharing links (Suno shortlinks, Suno song pages, SomaFM station pages,
 * Dropbox, GitHub, Google Drive, direct audio URLs) into streamable audio URLs and extracts a clean display title.
 */
export function resolveSongUrl(rawInput: string): {
  url: string;
  title: string;
  needsServerResolve?: boolean;
  unsupportedHint?: string;
} {
  const trimmed = extractCleanSongUrl(rawInput).replace(
    /^https?:\/\/(?=\.?\/|assets\/)/i,
    ''
  );
  if (!trimmed) {
    return { url: '', title: 'No song link entered' };
  }

  // 0. SomaFM player/station URLs (e.g. https://somafm.com/player24/station/synphaera) or Icecast stream URLs
  const somaResolved = normalizeSomaFmUrl(trimmed);
  if (somaResolved) {
    return {
      url: somaResolved.streamUrl,
      title: somaResolved.title,
    };
  }

  // Already a proxied or local asset URL (including Studio Masters in assets/aistudio/)
  if (
    trimmed.includes('/api/proxy-audio') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('./assets/') ||
    trimmed.startsWith('assets/') ||
    trimmed.includes('assets/aistudio/')
  ) {
    if (trimmed.includes('assets/aistudio/')) {
      const fileName = trimmed.split('assets/aistudio/').pop() || '';
      const cleanRelPath = `${APP_BASE_URL}assets/aistudio/${fileName}`;
      const matchedPreset = PRESET_SONG_LINKS.find(
        (p) =>
          p.url === cleanRelPath ||
          (fileName.includes('Astral_Drift') && p.id === 'astral-drift-link') ||
          (fileName.includes('Weightless') && p.id === 'weightless-link')
      );
      return {
        url: cleanRelPath,
        title: matchedPreset?.label || 'Studio Master Audio',
      };
    }
    return { url: trimmed, title: 'Linked Audio Stream' };
  }

  // 1. Suno shortlinks: https://suno.com/s/<shareId>
  const sunoShortMatch = trimmed.match(
    /(?:suno\.com|suno\.ai)\/s\/([a-zA-Z0-9_-]+)/i
  );
  if (sunoShortMatch) {
    const shareCode = sunoShortMatch[1];
    const known = KNOWN_SUNO_SHORTLINKS[shareCode];
    if (known) {
      const mp4Url = `https://cdn1.suno.ai/${known.uuid}.mp4`;
      return {
        url: wrapWithAudioProxy(mp4Url),
        title: known.title,
      };
    }
    return {
      url: trimmed,
      title: `Suno Track (${shareCode})`,
      needsServerResolve: true,
    };
  }

  // 2. Suno AI Song Page Links: https://suno.com/song/<uuid> or https://app.suno.ai/song/<uuid>
  const sunoMatch = trimmed.match(
    /(?:suno\.com|suno\.ai)\/song\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
  );
  if (sunoMatch) {
    const uuid = sunoMatch[1];
    const mp4Url = `https://cdn1.suno.ai/${uuid}.mp4`;
    return {
      url: wrapWithAudioProxy(mp4Url),
      title: `Suno Track (${uuid.slice(0, 8)})`,
      needsServerResolve: true,
    };
  }

  // Check if it matches one of our preset links
  const matchedPreset = PRESET_SONG_LINKS.find((p) => p.url === trimmed);
  if (matchedPreset) {
    return {
      url: wrapWithAudioProxy(matchedPreset.url),
      title: matchedPreset.label,
    };
  }

  // 3. Dropbox share links -> direct dl.dropboxusercontent.com raw stream
  if (trimmed.includes('dropbox.com/')) {
    let direct = trimmed
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dropbox.com', 'dl.dropboxusercontent.com');
    direct = direct.replace(/[?&]dl=0\b/, '');
    const fileNameMatch = trimmed.split('?')[0].split('/').pop();
    const cleanName = fileNameMatch
      ? decodeURIComponent(fileNameMatch).replace(/\.[^/.]+$/, '')
      : 'Dropbox Audio Track';
    return { url: wrapWithAudioProxy(direct), title: cleanName };
  }

  // 4. GitHub blob links -> raw.githubusercontent.com
  const ghMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/
  );
  if (ghMatch) {
    const [, user, repo, rest] = ghMatch;
    const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${rest}`;
    const fileName = rest.split('/').pop() || 'GitHub Audio';
    return {
      url: wrapWithAudioProxy(rawUrl),
      title: decodeURIComponent(fileName).replace(/\.[^/.]+$/, ''),
    };
  }

  // 5. Google Drive file share links -> direct download endpoint
  const gdriveMatch = trimmed.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (gdriveMatch) {
    const fileId = gdriveMatch[1];
    return {
      url: wrapWithAudioProxy(
        `https://docs.google.com/uc?export=download&id=${fileId}`
      ),
      title: `Google Drive Audio (${fileId.slice(0, 6)})`,
    };
  }

  // 6. Detect HTML-only / DRM streaming pages (YouTube, Spotify, SoundCloud web page)
  if (
    /(?:youtube\.com\/watch|youtu\.be\/|open\.spotify\.com\/|soundcloud\.com\/[^/]+\/[^/]+$)/i.test(
      trimmed
    )
  ) {
    return {
      url: trimmed,
      title: 'Web Page Link',
      unsupportedHint:
        'YouTube/Spotify/SoundCloud web pages use DRM HTML players instead of raw audio streams. Paste a Suno link (suno.com/s/... or suno.com/song/...), direct audio link (.mp3, .wav, .ogg, .m4a), Dropbox/GitHub link, or Icecast stream URL.',
    };
  }

  // Extract a clean title from path or hostname
  try {
    const parsed = new URL(trimmed, window.location.origin);
    const lastSeg = parsed.pathname.split('/').filter(Boolean).pop() || '';
    const cleaned = decodeURIComponent(lastSeg)
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    const title = cleaned || parsed.hostname || 'Custom Linked Song';
    return { url: wrapWithAudioProxy(trimmed), title };
  } catch {
    return { url: wrapWithAudioProxy(trimmed), title: 'Custom Linked Song' };
  }
}

/**
 * Resolves a song link asynchronously via the server-side /api/resolve-song endpoint
 * (or Cloudflare Worker when VITE_AUDIO_API_BASE is set). If running on static GitHub Pages
 * before a Worker is configured, falls back to client-side OpenGraph resolution so Suno
 * shortlinks still resolve and play immediately.
 */
export async function resolveSongUrlAsync(rawInput: string): Promise<{
  url: string;
  title: string;
  unsupportedHint?: string;
}> {
  const cleaned = extractCleanSongUrl(rawInput);
  const syncResult = resolveSongUrl(cleaned);
  if (!cleaned || syncResult.unsupportedHint) {
    return syncResult;
  }

  if (
    (cleaned.startsWith('/') && !cleaned.startsWith('//')) ||
    cleaned.startsWith('./') ||
    cleaned.includes('assets/aistudio/') ||
    cleaned.includes('somafm.com')
  ) {
    return syncResult;
  }

  const isSunoLink = /(?:suno\.com|suno\.ai)\//i.test(cleaned);
  const sunoUuidOrAudioRegex =
    /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})|\.(?:mp4|m4a|mp3|ogg|wav)(?:\?|$)/i;

  // Try primary API base (local server in AI Studio / dev, or Cloudflare Worker on static host)
  const candidateApiBases = isStaticHostWithoutWorker()
    ? [DEFAULT_STATIC_WORKER_URL]
    : AUDIO_API_BASE
    ? [AUDIO_API_BASE]
    : ['', DEFAULT_STATIC_WORKER_URL];

  for (const apiBase of candidateApiBases) {
    try {
      const response = await fetch(
        `${apiBase}/api/resolve-song?url=${encodeURIComponent(cleaned)}`
      );
      if (response.ok) {
        const data = (await response.json()) as {
          ok?: boolean;
          proxiedUrl?: string;
          streamUrl?: string;
          title?: string;
        };
        const candidateStream = data.streamUrl || data.proxiedUrl || '';
        // Ensure that if the input was a Suno shortlink, the resolver actually extracted a UUID or audio stream
        // rather than echoing back the raw HTML shortlink when Cloudflare challenges Worker IPs
        const isValidResolution =
          Boolean(data.ok && candidateStream) &&
          (!isSunoLink || sunoUuidOrAudioRegex.test(candidateStream));

        if (isValidResolution) {
          const resolvedProxyUrl = data.proxiedUrl
            ? data.proxiedUrl.startsWith('/') && apiBase
              ? `${apiBase}${data.proxiedUrl}`
              : data.proxiedUrl
            : wrapWithAudioProxy(data.streamUrl || cleaned);
          return {
            url: resolvedProxyUrl,
            title: data.title || syncResult.title,
          };
        }
      }
    } catch {
      // Try next candidate or client-side fallback below
    }
  }

  // Client-side OpenGraph / Microlink resolution for Suno shortlinks (bypasses Cloudflare Worker-to-Suno blocks)
  if (isSunoLink) {
    try {
      const mlRes = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(cleaned)}`
      );
      if (mlRes.ok) {
        const mlJson = (await mlRes.json()) as {
          status?: string;
          data?: {
            title?: string;
            url?: string;
            image?: { url?: string };
          };
        };
        const resolvedPageUrl = mlJson.data?.url || '';
        const resolvedImageUrl = mlJson.data?.image?.url || '';
        const serializedData = JSON.stringify(mlJson.data || {});
        const uuidMatch =
          resolvedPageUrl.match(
            /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
          ) ||
          resolvedImageUrl.match(
            /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
          ) ||
          serializedData.match(
            /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
          );
        if (uuidMatch) {
          const uuid = uuidMatch[1].toLowerCase();
          const cleanTitle = mlJson.data?.title
            ? `${mlJson.data.title.replace(/\s*\|\s*Suno\s*$/i, '').trim()} · Suno`
            : syncResult.title;
          return {
            url: wrapWithAudioProxy(`https://cdn1.suno.ai/${uuid}.mp4`),
            title: cleanTitle,
          };
        }
      }
    } catch {
      // Ignore and return syncResult
    }
  }

  return syncResult;
}

export interface SynthParams {
  masterVolume: number;
  cursorCoupling: boolean;
  audioSource: AudioSourceMode;
  customAudioUrl?: string;
  customAudioTitle?: string;

  // 1. Audio-Reactive GLSL Shaders Bridge
  audioReactive: {
    enabled: boolean;
    reactivity: number; // 0.0 to 2.5
    subPumpStargate: number; // 0.0 to 2.5
    highShiftPlasma: number; // 0.0 to 2.5
    musicDrivesTime: boolean; // Music controls shader animation clock & parameter morphing
    animDrive: number; // 0.0 to 2.5
    bpmLinksDrive: boolean; // Scale Animation Speed Drive with the tune's live BPM
  };

  // Core Percussion & Rhythm Sequencer (Kicks, Hi-Hats, Snare, Crunchy Acid Pluck)
  coreDrums: {
    enabled: boolean;
    bpm: number; // 70 - 165 BPM (94 BPM default for Astral Drift)
    pattern: DrumPatternId;
    swing: number; // 0.0 - 0.5
    kickEnabled: boolean;
    kickGain: number;
    kickPunchHz: number; // 150Hz -> 41Hz
    kickDecaySec: number; // 0.42s
    hatsEnabled: boolean;
    hatsGain: number;
    hatToneHz: number; // 7600Hz highpass
    hatDecaySec: number; // 0.048s closed hat decay
    snareEnabled: boolean;
    snareGain: number;
    snareSnap: number; // 0.0 - 1.0 crunchy clap/snare snap
    fmPluckEnabled: boolean;
    fmPluckGain: number;
    fmPluckCutoff: number; // 400 - 3200 Hz
  };

  // 0. Heavy Crunchy Reese & Sub-Bass Foundation (E1/C1/G1/D1 Progression + Asymmetric Crunch + Sidechain)
  subBass: {
    enabled: boolean;
    gain: number;
    baseFreq: number; // 41.2 Hz (E1)
    beatDetuneHz: number; // Reese detune spread
    lfoRate: number; // Hz for resonant filter movement
    crunchDrive?: number; // 0.0 - 1.0 Tube/Tape Crunch Waveshaper
    sidechainDepth?: number; // 0.0 - 1.0 Kick sidechain pump
  };

  // 1. The Tape-Warped Ambient Pad (E-Minor 9th Lush Chord Progression + Wow & Flutter)
  tapePad: {
    enabled: boolean;
    gain: number;
    baseFreq: number; // 82.41 Hz (E2)
    detuneCents: number; // ~8 cents
    wowDriftHz: number; // ±0.35 Hz
    saturationDrive: number; // 0.0 to 1.0
    cutoffHz: number; // ~1150 Hz
  };

  // 2. Soaring Astral Gliding Lead & Crystal Bell Ping
  buchlaPing: {
    enabled: boolean;
    gain: number;
    resonanceQ: number; // Filter Q / Lead Harmonic Focus
    intervalSec: number; // Glide speed / phrase rate
    decaySec: number; // Sustain / release duration
    filterType: 'bandpass' | 'lowpass';
  };

  // 3. Stochastic Atmospheric Swells (Filtered Brown Noise)
  oceanWaves: {
    enabled: boolean;
    gain: number;
    cycleSec: number; // 8.5s wave cycle
    filterQ: number; // 2.2
    minCutoffHz: number; // 160 Hz
    maxCutoffHz: number; // 720 Hz
    stereoWidth: number; // 0.0 to 1.0
  };

  // 4. Harmonic Chord Progression Pad (Em9 -> Cmaj9 -> Gmaj7 -> Dadd9)
  justDrone: {
    enabled: boolean;
    gain: number;
    rootFreq: number; // 82.41 Hz (E2)
    tremoloDepth: number; // 0.0 to 1.0
    tremoloRateScale: number; // 0.5x to 2.5x
  };

  // 5. Master Spatial FX Chain (Stereo Ping-Pong Delay & Convolution Reverb)
  spatialFx: {
    delayEnabled: boolean;
    delayMix: number; // 0.0 to 0.85
    delayLeftSec: number; // 0.32s (dotted 8th at 94 BPM)
    delayRightOffsetMs: number; // +160ms offset between L & R channels
    delayFeedback: number; // 0.44 default
    reverbEnabled: boolean;
    reverbMix: number; // 0.0 to 0.90
  };

  // 6. Stereo Panner & Haas Motion (0.05Hz Pan LFO + 15-30ms Haas Widener)
  stereoMotion: {
    autoPanRateHz: number; // 0.06Hz slow LFO
    autoPanWidth: number; // 0.55 (-0.55 to +0.55)
    haasEnabled: boolean;
    haasDelayMs: number; // 15ms to 30ms (21ms default)
    haasSpread: number; // 0.0 to 1.0
  };

  // 7. Modulation Matrix (LFO 2 Cross-Modulating LFO 1 -> Filter Cutoff)
  modMatrix: {
    enabled: boolean;
    lfo1BaseRateHz: number; // 0.24 Hz
    lfo1FilterDepthHz: number; // 240 Hz cutoff swing
    lfo2RateHz: number; // 0.04 Hz ultra-slow meta LFO
    lfo2ToLfo1RateDepth: number; // ±0.12 Hz speed modulation
    lfo2ToLfo1AmpDepth: number; // 0.0 to 1.0 depth modulation
  };
}

export const DEFAULT_SYNTH_PARAMS: SynthParams = {
  masterVolume: 0.82,
  cursorCoupling: true,
  audioSource: 'customUrl',
  customAudioUrl: 'https://ice1.somafm.com/synphaera-128-mp3',
  customAudioTitle: 'Synphaera (Live Stream)',

  audioReactive: {
    enabled: true,
    reactivity: 1.0,
    subPumpStargate: 1.15,
    highShiftPlasma: 1.0,
    musicDrivesTime: true,
    animDrive: 1.25,
    bpmLinksDrive: true,
  },

  coreDrums: {
    enabled: true,
    bpm: 94,
    pattern: 'astralDrift',
    swing: 0.14,
    kickEnabled: true,
    kickGain: 0.86,
    kickPunchHz: 155,
    kickDecaySec: 0.42,
    hatsEnabled: true,
    hatsGain: 0.38,
    hatToneHz: 7600,
    hatDecaySec: 0.048,
    snareEnabled: true,
    snareGain: 0.62,
    snareSnap: 0.72,
    fmPluckEnabled: true,
    fmPluckGain: 0.54,
    fmPluckCutoff: 1450,
  },

  subBass: {
    enabled: true,
    gain: 0.76,
    baseFreq: 41.2, // E1
    beatDetuneHz: 0.65,
    lfoRate: 0.16,
    crunchDrive: 0.68,
    sidechainDepth: 0.78,
  },

  tapePad: {
    enabled: true,
    gain: 0.36,
    baseFreq: 82.41, // E2
    detuneCents: 8.0,
    wowDriftHz: 0.3,
    saturationDrive: 0.42,
    cutoffHz: 1150,
  },

  buchlaPing: {
    enabled: true,
    gain: 0.52,
    resonanceQ: 24.0,
    intervalSec: 0.45,
    decaySec: 0.65,
    filterType: 'lowpass',
  },

  oceanWaves: {
    enabled: true,
    gain: 0.16,
    cycleSec: 8.5,
    filterQ: 2.0,
    minCutoffHz: 160,
    maxCutoffHz: 680,
    stereoWidth: 0.65,
  },

  justDrone: {
    enabled: true,
    gain: 0.32,
    rootFreq: 82.41, // E2
    tremoloDepth: 0.32,
    tremoloRateScale: 0.85,
  },

  spatialFx: {
    delayEnabled: true,
    delayMix: 0.38,
    delayLeftSec: 0.319, // Dotted 8th note at 94 BPM
    delayRightOffsetMs: 160,
    delayFeedback: 0.44,
    reverbEnabled: true,
    reverbMix: 0.48,
  },

  stereoMotion: {
    autoPanRateHz: 0.06,
    autoPanWidth: 0.55,
    haasEnabled: true,
    haasDelayMs: 21.0,
    haasSpread: 0.68,
  },

  modMatrix: {
    enabled: true,
    lfo1BaseRateHz: 0.24,
    lfo1FilterDepthHz: 240,
    lfo2RateHz: 0.04,
    lfo2ToLfo1RateDepth: 0.1,
    lfo2ToLfo1AmpDepth: 0.5,
  },
};

export interface SynthLiveTelemetry {
  subCutoffHz: number;
  tapePitchOffsetHz: number;
  tapePanPos: number;
  lastPingFreqHz: number;
  lastPingAtMs: number;
  oceanCutoffHz: number;
  oceanSwellNorm: number;
  oceanPan: number;
  lfo1InstantRateHz: number;
  lfo2OutNorm: number;
  filterCrossModHz: number;
  bandSub: number;
  bandMid: number;
  bandHigh: number;
  currentStep: number; // 0..15 or 0..11 step indicator
  totalSteps: number; // 16 for 16th-note patterns, 12 for triplet patterns
  stepsPerBeat: number; // 4 for 16th-note, 3 for psytrance triplet
  currentChordName?: string; // e.g. 'Em9', 'Cmaj9', 'Gmaj7', 'Dadd9'
  currentSectionName?: string; // e.g. 'Heavy Bass & Crunch', 'Acid Squelch Matrix', 'Soaring Astral Lead'
  trackCurrentTimeSec?: number;
  trackDurationSec?: number;
  trackStatus?: 'idle' | 'loading' | 'playing' | 'paused' | 'cors-fallback' | 'error';
  trackErrorMessage?: string;
  trackTitle?: string;
  effectiveBpm?: number;
  effectiveAnimDrive?: number;
}

// E Minor Natural / Dorian Scale for Crystal Arpeggios & Pings
const PENTATONIC_SCALE_HZ = [
  164.81, // E3
  196.0,  // G3
  220.0,  // A3
  246.94, // B3
  293.66, // D4
  329.63, // E4
  369.99, // F#4
  392.0,  // G4
  493.88, // B4
  587.33, // D5
  659.25, // E5
];

// Crunchy Acid / Pluck Scale in E Minor (Index 0..7)
const ACID_BASS_SCALE_HZ = [
  82.41,  // 1: E2
  98.0,   // 2: G2
  110.0,  // 3: A2
  123.47, // 4: B2
  146.83, // 5: D3
  164.81, // 6: E3
  185.0,  // 7: F#3
  196.0,  // 8: G3
  246.94, // 9: B3
  293.66, // 10: D4
  329.63, // 11: E4
];

// 4-Bar Harmonic Progression from "Astral Drift - Heavy Bass & Crunchy Tone"
interface AstralChordDef {
  name: string;
  subRootHz: number; // Sub fundamental (E1, C1, G1, D1)
  reeseRootHz: number; // Crunchy Reese octave (E2, C2, G2, D2)
  turnaroundSubHz: number; // Beat 4 bass movement
  turnaroundReeseHz: number;
  padNotesHz: [number, number, number, number]; // 4-voice lush chord
  arpNotesHz: number[]; // Arpeggio / Pluck chord tones
}

const ASTRAL_CHORD_PROGRESSION: AstralChordDef[] = [
  {
    name: 'Em9',
    subRootHz: 41.2, // E1
    reeseRootHz: 82.41, // E2
    turnaroundSubHz: 49.0, // G1 pickup
    turnaroundReeseHz: 98.0,
    padNotesHz: [164.81, 196.0, 246.94, 369.99], // E3, G3, B3, F#4
    arpNotesHz: [164.81, 196.0, 246.94, 293.66, 369.99, 329.63, 246.94, 196.0],
  },
  {
    name: 'Cmaj9',
    subRootHz: 32.7, // C1
    reeseRootHz: 65.41, // C2
    turnaroundSubHz: 36.71, // D1 pickup
    turnaroundReeseHz: 73.42,
    padNotesHz: [130.81, 164.81, 196.0, 293.66], // C3, E3, G3, D4
    arpNotesHz: [130.81, 164.81, 196.0, 246.94, 293.66, 329.63, 246.94, 196.0],
  },
  {
    name: 'Gmaj7',
    subRootHz: 49.0, // G1
    reeseRootHz: 98.0, // G2
    turnaroundSubHz: 41.2, // E1 pickup
    turnaroundReeseHz: 82.41,
    padNotesHz: [146.83, 196.0, 246.94, 369.99], // D3, G3, B3, F#4
    arpNotesHz: [196.0, 246.94, 293.66, 369.99, 392.0, 369.99, 293.66, 246.94],
  },
  {
    name: 'Dadd9 / Bm7',
    subRootHz: 36.71, // D1
    reeseRootHz: 73.42, // D2
    turnaroundSubHz: 61.74, // B1 turnaround
    turnaroundReeseHz: 123.47, // B2 turnaround
    padNotesHz: [146.83, 185.0, 220.0, 329.63], // D3, F#3, A3, E4
    arpNotesHz: [146.83, 185.0, 220.0, 293.66, 369.99, 329.63, 246.94, 220.0],
  },
];

// 4-Bar Harmonic Progression from "Weightless" (F Minor / Db Major / Ab Major / Eb Major Ethereal Liquid DnB)
const WEIGHTLESS_CHORD_PROGRESSION: AstralChordDef[] = [
  {
    name: 'Fm9',
    subRootHz: 43.65, // F1
    reeseRootHz: 87.31, // F2
    turnaroundSubHz: 51.91, // Ab1 pickup
    turnaroundReeseHz: 103.83,
    padNotesHz: [174.61, 207.65, 261.63, 392.0], // F3, Ab3, C4, G4
    arpNotesHz: [261.63, 311.13, 349.23, 392.0, 415.3, 523.25, 392.0, 349.23], // Sparkling C4..C5 crystal harp tones
  },
  {
    name: 'Dbmaj9',
    subRootHz: 34.65, // Db1
    reeseRootHz: 69.3, // Db2
    turnaroundSubHz: 38.89, // Eb1 pickup
    turnaroundReeseHz: 77.78,
    padNotesHz: [138.59, 207.65, 261.63, 311.13], // Db3, Ab3, C4, Eb4
    arpNotesHz: [277.18, 311.13, 349.23, 415.3, 523.25, 415.3, 349.23, 311.13],
  },
  {
    name: 'Abmaj7',
    subRootHz: 51.91, // Ab1
    reeseRootHz: 103.83, // Ab2
    turnaroundSubHz: 43.65, // F1 pickup
    turnaroundReeseHz: 87.31,
    padNotesHz: [155.56, 207.65, 261.63, 392.0], // Eb3, Ab3, C4, G4
    arpNotesHz: [207.65, 261.63, 311.13, 392.0, 415.3, 523.25, 392.0, 311.13],
  },
  {
    name: 'Ebmaj9 / Cm7',
    subRootHz: 38.89, // Eb1
    reeseRootHz: 77.78, // Eb2
    turnaroundSubHz: 32.7, // C1 turnaround
    turnaroundReeseHz: 65.41, // C2 turnaround
    padNotesHz: [155.56, 196.0, 233.08, 349.23], // Eb3, G3, Bb3, F4
    arpNotesHz: [233.08, 293.66, 311.13, 349.23, 392.0, 466.16, 392.0, 311.13],
  },
];

// Soaring Expressive Gliding Lead Melody (4 bars x 16 steps = 64 steps in E minor)
// 0 = sustain current note, -1 = release/rest, >0 = target frequency in Hz with portamento glide
const ASTRAL_LEAD_MELODY_64: number[] = [
  // Bar 1 (Em9): Soaring entry B4 -> E5 -> F#5 -> G5 -> F#5 -> E5 -> D5
  493.88, 0, 659.25, 0, 739.99, 0, 783.99, 0, 739.99, 0, 659.25, 0, 587.33, 0, 493.88, 0,
  // Bar 2 (Cmaj9): Emotional bend E5 -> G5 -> A5 -> G5 -> F#5 -> E5 -> B4
  659.25, 0, 0, 783.99, 880.0, 0, 783.99, 0, 739.99, 0, 659.25, 0, 493.88, 0, 0, -1,
  // Bar 3 (Gmaj7): Expressive cry D5 -> G5 -> F#5 -> E5 -> D5 -> B4 -> D5
  587.33, 0, 783.99, 0, 739.99, 0, 659.25, 0, 587.33, 0, 493.88, 0, 587.33, 0, 659.25, 0,
  // Bar 4 (Dadd9/Bm7): Resolution F#5 -> E5 -> D5 -> B4 -> A4 -> G4 -> F#4 -> E4
  739.99, 0, 659.25, 0, 587.33, 0, 493.88, 0, 440.0, 0, 392.0, 0, 369.99, 0, 329.63, 0,
];

// Angelic Vocal-Formant Choir Melody for "Weightless" ("Ooh — Aah — Tell me..." in F minor / Ab major)
const WEIGHTLESS_LEAD_MELODY_64: number[] = [
  // Bar 1 (Fm9): Angelic "Ooh -> Aah" soar C5 -> F5 -> G5 -> Ab5 -> G5 -> F5
  523.25, 0, 0, 0, 698.46, 0, 0, 0, 783.99, 0, 830.61, 0, 783.99, 0, 698.46, 0,
  // Bar 2 (Dbmaj9): Floating vocal melisma F5 -> Eb5 -> C5 -> Eb5 -> F5 -> Ab5 -> G5
  698.46, 0, 622.25, 0, 523.25, 0, 0, 0, 622.25, 0, 698.46, 0, 830.61, 0, 783.99, 0,
  // Bar 3 (Abmaj7): "Tell me..." high angelic hook Eb5 -> Ab5 -> Bb5 -> Ab5 -> G5 -> F5 -> Eb5
  622.25, 0, 0, 0, 830.61, 0, 932.33, 0, 830.61, 0, 783.99, 0, 698.46, 0, 622.25, 0,
  // Bar 4 (Ebmaj9/Cm7): Weightless descent G5 -> F5 -> Eb5 -> C5 -> Bb4 -> Ab4 -> G4 -> F4
  783.99, 0, 698.46, 0, 622.25, 0, 523.25, 0, 466.16, 0, 0, 0, 415.3, 0, 392.0, 0,
];

interface StepPatternDef {
  name: string;
  stepsPerBeat: 3 | 4; // 4 = 16th notes (16 steps/bar), 3 = 8th-note triplets (12 steps/bar)
  totalSteps: 12 | 16;
  kick: number[]; // 0..1 velocity per step
  closedHat: number[];
  openHat: number[];
  snare: number[];
  pluck: number[]; // 0 = rest, >0 = note index + 1
  reesePulse?: number[]; // 0..1 heavy crunchy bass re-trigger & filter envelope accent per step
}

export const DRUM_PATTERNS: Record<DrumPatternId, StepPatternDef> = {
  astralDrift: {
    name: 'Astral Drift (94 BPM Heavy Bass & Crunch)',
    stepsPerBeat: 4,
    totalSteps: 16,
    // Deep midtempo halftime/boom-bap groove: Kick on 1 (step 0), 2-& (step 6), 3-& (step 10), pickup on step 15
    kick:       [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.88, 0.0, 0.0, 0.0, 0.92, 0.0, 0.0, 0.0, 0.0, 0.52],
    // Crunchy layered snare + clap on Beat 2 (step 4) and Beat 4 (step 12) + ghost notes
    snare:      [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.28, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.34],
    // Rolling 16th hi-hats with dynamic velocity
    closedHat:  [0.75, 0.42, 0.85, 0.48, 0.75, 0.45, 0.85, 0.52, 0.78, 0.45, 0.88, 0.5, 0.75, 0.52, 0.85, 0.62],
    openHat:    [0.0, 0.0, 0.0, 0.72, 0.0, 0.0, 0.0, 0.78, 0.0, 0.0, 0.0, 0.72, 0.0, 0.0, 0.88, 0.0],
    // Crunchy Acid & Arpeggio Pluck sequence
    pluck:      [1, 6, 4, 8, 6, 4, 10, 8, 1, 6, 9, 8, 7, 6, 5, 4],
    // Heavy Crunchy Reese Bass swells & syncopated filter bites
    reesePulse: [1.0, 0.0, 0.65, 0.45, 0.0, 0.78, 0.95, 0.5, 0.85, 0.0, 0.95, 0.6, 0.0, 0.75, 0.88, 0.55],
  },
  weightlessDnb: {
    name: 'Weightless (174 BPM Liquid DnB & Choir)',
    stepsPerBeat: 4,
    totalSteps: 16,
    // Authentic 174 BPM 2-step Liquid Drum & Bass breakbeat: Kick on 0 (Beat 1) and 10 (Beat 3-&)
    kick:       [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.92, 0.0, 0.0, 0.0, 0.0, 0.0],
    // Crisp Liquid DnB Rim/Snare on 4 (Beat 2) and 12 (Beat 4) + delicate shuffling breakbeat ghost snares on 7, 9, 15
    snare:      [0.0, 0.0, 0.0, 0.0, 0.96, 0.0, 0.0, 0.34, 0.0, 0.38, 0.0, 0.0, 0.98, 0.0, 0.0, 0.32],
    // Silky shuffling 174 BPM liquid shaker & hi-hats
    closedHat:  [0.72, 0.44, 0.82, 0.48, 0.72, 0.46, 0.84, 0.52, 0.74, 0.48, 0.86, 0.5, 0.72, 0.46, 0.84, 0.54],
    openHat:    [0.0, 0.0, 0.58, 0.0, 0.0, 0.0, 0.62, 0.0, 0.0, 0.0, 0.58, 0.0, 0.0, 0.0, 0.68, 0.0],
    // Cascading crystalline glass bell arpeggio (16th-note Weightless climax sparkle)
    pluck:      [1, 3, 5, 8, 6, 4, 8, 10, 1, 3, 6, 9, 8, 6, 5, 3],
    // Deep, smooth, sustained Liquid DnB sub-bass foundation
    reesePulse: [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.72, 0.0, 0.0, 0.0, 0.88, 0.0, 0.0, 0.0, 0.64, 0.0],
  },
  hypnotic4x4: {
    name: 'Hypnotic 4/4 Pulse',
    stepsPerBeat: 4,
    totalSteps: 16,
    kick:      [1.0, 0.0, 0.0, 0.0, 0.9, 0.0, 0.0, 0.35, 1.0, 0.0, 0.0, 0.0, 0.9, 0.0, 0.45, 0.0],
    closedHat: [0.4, 0.7, 0.9, 0.6, 0.4, 0.7, 0.9, 0.5, 0.4, 0.7, 0.9, 0.6, 0.4, 0.8, 0.9, 0.7],
    openHat:   [0.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.85, 0.0, 0.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.9, 0.0],
    snare:     [0.0, 0.0, 0.0, 0.0, 0.9, 0.0, 0.0, 0.25, 0.0, 0.0, 0.0, 0.0, 0.95, 0.0, 0.0, 0.3],
    pluck:     [1,   0,   5,   3,   0,   4,   2,   0,   1,   0,   6,   5,   0,   3,   7,   4],
    reesePulse:[1.0, 0.0, 0.7, 0.5, 0.9, 0.0, 0.7, 0.5, 1.0, 0.0, 0.7, 0.5, 0.9, 0.0, 0.8, 0.6],
  },
  psyTriplet: {
    name: 'Psytrance Triplet (K-B-B)',
    stepsPerBeat: 3,
    totalSteps: 12,
    kick:      [1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
    closedHat: [0.35, 0.85, 0.5, 0.35, 0.85, 0.5, 0.35, 0.85, 0.5, 0.35, 0.9, 0.65],
    openHat:   [0.0,  0.0,  0.9, 0.0,  0.0,  0.9, 0.0,  0.0,  0.9, 0.0,  0.0, 0.95],
    snare:     [0.0,  0.0,  0.0, 0.95, 0.0,  0.0, 0.0,  0.0,  0.0, 0.95, 0.0, 0.38],
    pluck:     [0,    1,    5,   0,    1,    5,   0,    1,    6,   0,    3,   5],
    reesePulse:[0.0,  0.95, 0.9, 0.0,  0.95, 0.9, 0.0,  0.95, 0.9, 0.0,  0.95, 0.9],
  },
  brokenIdm: {
    name: 'IDM Broken Syncopation',
    stepsPerBeat: 4,
    totalSteps: 16,
    kick:      [1.0, 0.0, 0.0, 0.75, 0.0, 0.0, 0.85, 0.0, 0.0, 0.6, 0.9, 0.0, 0.0, 0.7, 0.0, 0.4],
    closedHat: [0.9, 0.5, 0.8, 0.4, 0.7, 0.9, 0.5, 0.8, 0.6, 0.4, 0.9, 0.7, 0.8, 0.5, 0.9, 0.9],
    openHat:   [0.0, 0.0, 0.0, 0.75, 0.0, 0.0, 0.0, 0.8, 0.0, 0.0, 0.7, 0.0, 0.0, 0.0, 0.85, 0.0],
    snare:     [0.0, 0.0, 0.0, 0.0, 0.95, 0.0, 0.0, 0.45, 0.0, 0.5, 0.0, 0.0, 0.9, 0.0, 0.35, 0.6],
    pluck:     [5,   3,   0,   1,   6,   0,   4,   2,   0,   7,   5,   0,   3,   1,   8,   0],
    reesePulse:[1.0, 0.0, 0.5, 0.85, 0.0, 0.6, 0.9, 0.0, 0.7, 0.6, 0.9, 0.0, 0.5, 0.8, 0.0, 0.6],
  },
  ambientHalftime: {
    name: 'Deep Ambient Half-Time',
    stepsPerBeat: 4,
    totalSteps: 16,
    kick:      [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.55, 0.0, 0.0, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0, 0.4],
    closedHat: [0.6, 0.0, 0.5, 0.3, 0.6, 0.0, 0.5, 0.4, 0.6, 0.0, 0.5, 0.3, 0.6, 0.4, 0.7, 0.5],
    openHat:   [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.0],
    snare:     [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.95, 0.0, 0.0, 0.0, 0.0, 0.0, 0.35, 0.0],
    pluck:     [1,   0,   0,   5,   0,   0,   3,   0,   0,   6,   0,   0,   4,   0,   2,   0],
    reesePulse:[1.0, 0.0, 0.0, 0.0, 0.6, 0.0, 0.8, 0.0, 0.0, 0.95, 0.0, 0.0, 0.7, 0.0, 0.0, 0.5],
  },
  acidTribal: {
    name: 'Tribal Acid Poly-Groove',
    stepsPerBeat: 4,
    totalSteps: 16,
    kick:      [1.0, 0.0, 0.55, 0.0, 0.9, 0.0, 0.6, 0.0, 1.0, 0.0, 0.55, 0.0, 0.9, 0.45, 0.65, 0.0],
    closedHat: [0.8, 0.6, 0.9, 0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 0.8, 0.9, 0.9],
    openHat:   [0.0, 0.0, 0.85, 0.0, 0.0, 0.7, 0.0, 0.85, 0.0, 0.0, 0.85, 0.0, 0.0, 0.75, 0.0, 0.9],
    snare:     [0.0, 0.0, 0.0, 0.5, 0.85, 0.0, 0.4, 0.0, 0.0, 0.0, 0.0, 0.5, 0.9, 0.0, 0.45, 0.55],
    pluck:     [1,   5,   3,   7,   2,   6,   4,   8,   1,   5,   4,   7,   3,   6,   5,   8],
    reesePulse:[1.0, 0.6, 0.8, 0.5, 0.9, 0.6, 0.8, 0.5, 1.0, 0.6, 0.8, 0.5, 0.9, 0.7, 0.85, 0.6],
  },
};

function createTapeSaturationCurve(drive: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = 1 + drive * 6.5;
  const norm = Math.tanh(k);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

/**
 * Asymmetric Tube & Tape Crunch WaveShaper Curve
 * Adds rich even + odd harmonics for the "Astral Drift - Heavy Bass & Crunchy Tone" grit
 */
function createCrunchDistortionCurve(drive: number): Float32Array<ArrayBuffer> {
  const samples = 2048;
  const curve = new Float32Array(samples);
  const k = 1.5 + drive * 18.0;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    // Asymmetric harmonic fold + warm tanh saturation
    const asym = x >= 0 ? Math.tanh(x * k) : Math.tanh(x * k * 0.78) * 0.95;
    const grit = Math.sin(x * Math.PI * (1.0 + drive * 1.4)) * 0.14 * drive;
    curve[i] = Math.max(-0.98, Math.min(0.98, asym + grit));
  }
  return curve;
}

function createBrownNoiseBuffer(ctx: AudioContext, durationSec = 10): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0.0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }

  const fadeSamples = Math.min(2048, Math.floor(length * 0.05));
  for (let i = 0; i < fadeSamples; i++) {
    const alpha = i / fadeSamples;
    data[i] = data[i] * alpha + data[length - fadeSamples + i] * (1 - alpha);
  }

  return buffer;
}

function createWhiteNoiseBuffer(ctx: AudioContext, durationSec = 1.0): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createCathedralImpulseBuffer(
  ctx: AudioContext,
  durationSec = 3.6,
  decayRate = 2.6
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * durationSec);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  let lpL = 0;
  let lpR = 0;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.pow(1 - t, decayRate);
    const attack = Math.min(1.0, i / (ctx.sampleRate * 0.018));

    const nL = Math.random() * 2 - 1;
    const nR = Math.random() * 2 - 1;

    const damp = 0.25 + 0.65 * (1 - t);
    lpL = lpL + damp * (nL - lpL);
    lpR = lpR + damp * (nR - lpR);

    left[i] = lpL * env * attack * 0.65;
    right[i] = lpR * env * attack * 0.65;
  }

  return impulse;
}

export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private proceduralMasterBus: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private freqBins: Uint8Array<ArrayBuffer> = new Uint8Array(256);
  private isRunning = false;
  private params: SynthParams = DEFAULT_SYNTH_PARAMS;

  // Reference Track & Custom Song Link HTMLAudioElement bridge
  private refAudioEl: HTMLAudioElement | null = null;
  private refMediaSource: MediaElementAudioSourceNode | null = null;
  private refGainNode: GainNode | null = null;
  private corsFallbackAudioEl: HTMLAudioElement | null = null;
  private usingCorsFallback = false;
  private prevFftSub = 0;
  private currentRefTrackUrl = '';
  private gestureListenerAttached = false;

  // Shared buses
  private dryBus: GainNode | null = null;
  private sidechainBus: GainNode | null = null; // Ducks Reese bass & pads on Kick hits
  private haasInputBus: GainNode | null = null;
  private haasDelayRight: DelayNode | null = null;
  private haasRightWetGain: GainNode | null = null;
  private haasRightDryGain: GainNode | null = null;

  private fxSendBus: GainNode | null = null;
  private delayLeft: DelayNode | null = null;
  private delayRight: DelayNode | null = null;
  private delayFeedbackL: GainNode | null = null;
  private delayFeedbackR: GainNode | null = null;
  private delayWetGain: GainNode | null = null;

  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;

  // Shared noise buffers & waveshaper curves
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private noiseBurstBuffer: AudioBuffer | null = null;
  private pluckCrunchCurve: Float32Array<ArrayBuffer> = createCrunchDistortionCurve(0.65);

  // Sequencer & 4-Bar Harmonic Progression state
  private current16thStep = 0;
  private totalBarsElapsed = 0;
  private currentBarInProgression = 0; // 0..3 (Em9 -> Cmaj9 -> Gmaj7 -> Dadd9)
  private nextStepTime = 0;

  // 0. Heavy Crunchy Reese & Sub-Bass Foundation nodes
  private subSineOsc: OscillatorNode | null = null;
  private subSineGain: GainNode | null = null;
  private subOsc1: OscillatorNode | null = null; // Sawtooth 1
  private subOsc2: OscillatorNode | null = null; // Sawtooth 2 (detuned)
  private subOsc3: OscillatorNode | null = null; // Square/Pulse harmonic layer
  private subFilter: BiquadFilterNode | null = null;
  private subCrunchShaper: WaveShaperNode | null = null;
  private subPostFilter: BiquadFilterNode | null = null;
  private subGain: GainNode | null = null;

  // 1. Tape-Warped Ambient Pad nodes + 0.05Hz StereoPanner LFO
  private tapeOsc1: OscillatorNode | null = null;
  private tapeOsc2: OscillatorNode | null = null;
  private tapeLfo1: OscillatorNode | null = null;
  private tapeLfo2: OscillatorNode | null = null;
  private tapeLfoGain1: GainNode | null = null;
  private tapeLfoGain2: GainNode | null = null;
  private tapeShaper: WaveShaperNode | null = null;
  private tapeFilter: BiquadFilterNode | null = null;
  private tapePanner: StereoPannerNode | null = null;
  private tapePanLfo: OscillatorNode | null = null;
  private tapePanLfoGain: GainNode | null = null;
  private tapeGain: GainNode | null = null;

  // 2. Soaring Expressive Astral Gliding Lead / Weightless Vocal Formant Choir + Crystal Ping nodes
  private leadOsc1: OscillatorNode | null = null;
  private leadOsc2: OscillatorNode | null = null;
  private leadSubOsc: OscillatorNode | null = null;
  private leadVibratoLfo: OscillatorNode | null = null;
  private leadVibratoGain: GainNode | null = null;
  private leadCrunchShaper: WaveShaperNode | null = null;
  private leadFilter: BiquadFilterNode | null = null;
  private leadDryFilterMixGain: GainNode | null = null;
  private leadFormantF1: BiquadFilterNode | null = null;
  private leadFormantF2: BiquadFilterNode | null = null;
  private leadFormantF3: BiquadFilterNode | null = null;
  private leadFormantMixGain: GainNode | null = null;
  private leadBreathGain: GainNode | null = null;
  private leadVca: GainNode | null = null;
  private leadMasterGain: GainNode | null = null;
  private leadFxSendGain: GainNode | null = null;
  private nextPingTime = 0;
  private scaleStepIndex = 0;
  private vowelToggle = 0;

  // 3. Stochastic Ocean Waves nodes
  private oceanSource: AudioBufferSourceNode | null = null;
  private oceanFilter: BiquadFilterNode | null = null;
  private oceanPanner: StereoPannerNode | null = null;
  private oceanGain: GainNode | null = null;
  private oceanJitterValue = 0;
  private oceanJitterTarget = 0;

  // 4. Generative Chord Progression Pad (4 voices following Em9 -> Cmaj9 -> Gmaj7 -> Dadd9)
  private droneOscs: OscillatorNode[] = [];
  private droneVoiceGains: GainNode[] = [];
  private droneLfos: OscillatorNode[] = [];
  private droneLfoGains: GainNode[] = [];
  private droneMasterGain: GainNode | null = null;

  // 7. Modulation Matrix nodes
  private modLfo1: OscillatorNode | null = null;
  private modLfo1DepthVca: GainNode | null = null;
  private modLfo2: OscillatorNode | null = null;
  private modLfo2ToRateGain: GainNode | null = null;
  private modLfo2ToDepthGain: GainNode | null = null;

  private cursorR = 0.15;
  private cursorX = 0.0;

  private smoothedBands: AudioBandLevels = { ...DEFAULT_AUDIO_BAND_LEVELS };

  // Smooth musical transient envelopes triggered by drums & synth notes
  private kickEnv = 0;
  private snareEnv = 0;
  private pluckEnv = 0;
  private hatEnv = 0;
  private groovePhase = 0;
  private lastBandTickTime = 0;

  // Real-time onset beat-interval BPM detector for external tunes & streams
  private detectedTrackBpm = 86;
  private lastOnsetTimeSec = 0;
  private onsetIntervalsSec: number[] = [];
  private prevSubFlux = 0;

  private rafId: number | null = null;
  private startTime = 0;

  private telemetry: SynthLiveTelemetry = {
    subCutoffHz: 320,
    tapePitchOffsetHz: 0,
    tapePanPos: 0,
    lastPingFreqHz: 493.88,
    lastPingAtMs: 0,
    oceanCutoffHz: 300,
    oceanSwellNorm: 0.4,
    oceanPan: 0,
    lfo1InstantRateHz: 0.24,
    lfo2OutNorm: 0,
    filterCrossModHz: 0,
    bandSub: 0,
    bandMid: 0,
    bandHigh: 0,
    currentStep: 0,
    totalSteps: 16,
    stepsPerBeat: 4,
    currentChordName: 'Em9',
    currentSectionName: 'Astral Drift · Heavy Bass & Crunch',
    trackTitle: 'Synphaera (Live Stream)',
    effectiveBpm: 86,
    effectiveAnimDrive: 1.08,
  };

  /**
   * Synchronously creates and resumes the Web Audio context inside a user click/keydown
   * event BEFORE any async network fetch runs, preventing browser autoplay blocking.
   */
  public unlockOnUserGesture(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      // Immediately request resume while inside the synchronous user gesture
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      this.buildGraph(this.ctx);
    } else if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    if (!this.gestureListenerAttached && typeof window !== 'undefined') {
      this.gestureListenerAttached = true;
      const resumeOnInteract = () => {
        if (this.ctx && this.isRunning && this.ctx.state === 'suspended') {
          void this.ctx.resume().catch(() => {});
        }
        if (this.isRunning && this.params.audioSource !== 'procedural') {
          const activeEl = this.usingCorsFallback
            ? this.corsFallbackAudioEl
            : this.refAudioEl;
          if (activeEl && activeEl.paused && activeEl.src) {
            void activeEl.play().catch(() => {});
          }
        }
      };
      window.addEventListener('pointerdown', resumeOnInteract, { passive: true });
      window.addEventListener('touchstart', resumeOnInteract, { passive: true });
      window.addEventListener('click', resumeOnInteract, { passive: true });
      window.addEventListener('keydown', resumeOnInteract, { passive: true });
    }
  }

  public async start(initialParams: SynthParams): Promise<void> {
    this.params = initialParams;
    this.unlockOnUserGesture();

    if (!this.ctx) return;

    this.nextStepTime = this.ctx.currentTime + 0.04;
    this.lastBandTickTime = performance.now() * 0.001;
    this.isRunning = true;
    this.smoothedBands.isPlaying = true;
    this.applyParams(this.params);
    this.syncAudioSourcePlayback();
    this.startProceduralLoop();

    if (this.ctx.state === 'suspended') {
      await Promise.race([
        this.ctx.resume().catch(() => {}),
        new Promise<void>((resolve) => setTimeout(resolve, 120)),
      ]);
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.refAudioEl) {
      this.refAudioEl.pause();
    }
    if (this.corsFallbackAudioEl) {
      this.corsFallbackAudioEl.pause();
    }
    this.kickEnv = 0;
    this.snareEnv = 0;
    this.pluckEnv = 0;
    this.hatEnv = 0;
    this.smoothedBands.sub = 0;
    this.smoothedBands.mid = 0;
    this.smoothedBands.high = 0;
    this.smoothedBands.rms = 0;
    this.smoothedBands.beatPulse = 0;
    this.smoothedBands.isPlaying = false;
    if (this.telemetry.trackStatus === 'playing' || this.telemetry.trackStatus === 'cors-fallback') {
      this.telemetry.trackStatus = 'paused';
    }
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  public destroy(): void {
    this.stop();
    if (this.refAudioEl) {
      this.refAudioEl.pause();
      this.refAudioEl.src = '';
      this.refAudioEl = null;
    }
    if (this.corsFallbackAudioEl) {
      this.corsFallbackAudioEl.pause();
      this.corsFallbackAudioEl.src = '';
      this.corsFallbackAudioEl = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getCaptureAudioStream(): MediaStream | null {
    this.unlockOnUserGesture();
    if (
      this.usingCorsFallback &&
      this.corsFallbackAudioEl &&
      !this.corsFallbackAudioEl.paused
    ) {
      const elWithCapture = this.corsFallbackAudioEl as HTMLAudioElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      };
      const fallbackStream =
        elWithCapture.captureStream?.() || elWithCapture.mozCaptureStream?.();
      if (fallbackStream && fallbackStream.getAudioTracks().length > 0) {
        return fallbackStream;
      }
    }
    if (!this.mediaStreamDest) return null;
    return this.mediaStreamDest.stream;
  }

  public getTelemetry(): SynthLiveTelemetry {
    const activeEl = this.usingCorsFallback ? this.corsFallbackAudioEl : this.refAudioEl;
    if (activeEl && this.params.audioSource !== 'procedural') {
      this.telemetry.trackCurrentTimeSec = Number.isFinite(activeEl.currentTime)
        ? activeEl.currentTime
        : 0;
      this.telemetry.trackDurationSec =
        Number.isFinite(activeEl.duration) && activeEl.duration > 0
          ? activeEl.duration
          : 0;
    }
    return this.telemetry;
  }

  public getAudioBands(): AudioBandLevels {
    return this.smoothedBands;
  }

  public getWaveformData(targetArray: Uint8Array<ArrayBuffer>): void {
    if (!this.analyser || !this.isRunning) {
      targetArray.fill(128);
      return;
    }
    const activeEl = this.usingCorsFallback
      ? this.corsFallbackAudioEl
      : this.refAudioEl;
    const isWaitingOrFallbackStream =
      this.params.audioSource !== 'procedural' &&
      ((this.usingCorsFallback &&
        this.corsFallbackAudioEl &&
        !this.corsFallbackAudioEl.paused) ||
        this.ctx?.state === 'suspended' ||
        !activeEl ||
        activeEl.paused);
    if (isWaitingOrFallbackStream) {
      // Synthesize live visual oscilloscope wave when playing a non-CORS external stream or buffering initial stream
      const now = performance.now() * 0.004;
      const amp = 28 * (0.35 + this.smoothedBands.rms * 0.85);
      for (let i = 0; i < targetArray.length; i++) {
        const x = i / targetArray.length;
        const w1 = Math.sin(x * Math.PI * 6 + now * 2.4);
        const w2 = Math.sin(x * Math.PI * 18 - now * 4.1) * 0.45;
        targetArray[i] = Math.max(
          8,
          Math.min(248, Math.round(128 + (w1 + w2) * amp))
        );
      }
      return;
    }
    this.analyser.getByteTimeDomainData(targetArray);
  }

  public setCursorState(r: number, x: number): void {
    this.cursorR = Math.min(1.5, Math.max(0, r));
    this.cursorX = Math.min(1, Math.max(-1, x));
  }

  public seekTrack(timeSec: number): void {
    const activeEl = this.usingCorsFallback ? this.corsFallbackAudioEl : this.refAudioEl;
    if (!activeEl) return;
    if (Number.isFinite(activeEl.duration) && activeEl.duration > 0) {
      activeEl.currentTime = Math.max(0, Math.min(activeEl.duration, timeSec));
      this.telemetry.trackCurrentTimeSec = activeEl.currentTime;
    }
  }

  /**
   * Loads and plays a custom song URL. First attempts CORS-enabled playback through
   * the Web Audio AnalyserNode for true FFT band extraction; if the remote server
   * omits CORS headers, automatically falls back to direct stream playback so any
   * valid audio URL plays out loud and drives the shaders.
   */
  public async loadCustomAudioUrl(
    rawInputUrl: string
  ): Promise<{ ok: boolean; error?: string; title: string; resolvedUrl?: string }> {
    this.telemetry.trackStatus = 'loading';
    this.telemetry.trackErrorMessage = undefined;

    const resolved = await resolveSongUrlAsync(rawInputUrl);
    if (!resolved.url) {
      this.telemetry.trackStatus = 'error';
      this.telemetry.trackErrorMessage = 'Please paste a valid song link.';
      return { ok: false, error: this.telemetry.trackErrorMessage, title: '' };
    }

    if (resolved.unsupportedHint) {
      this.telemetry.trackStatus = 'error';
      this.telemetry.trackErrorMessage = resolved.unsupportedHint;
      return { ok: false, error: resolved.unsupportedHint, title: resolved.title };
    }

    this.params.customAudioUrl = resolved.url;
    this.params.customAudioTitle = resolved.title;
    this.params.audioSource = 'customUrl';
    this.telemetry.trackTitle = resolved.title;

    if (!this.isRunning) {
      await this.start(this.params);
    } else {
      this.syncAudioSourcePlayback(true);
    }

    return { ok: true, title: resolved.title, resolvedUrl: resolved.url };
  }

  private syncAudioSourcePlayback(forceReload = false): void {
    if (!this.ctx || !this.proceduralMasterBus || !this.refGainNode) return;
    const now = this.ctx.currentTime;
    const isExternalTrack =
      this.params.audioSource === 'referenceMp3' ||
      this.params.audioSource === 'astralDriftMp3' ||
      this.params.audioSource === 'weightlessMp3' ||
      this.params.audioSource === 'customUrl';

    if (isExternalTrack) {
      let targetUrl = REFERENCE_TRACK_URLS.astralDriftMp3;
      let trackTitle = 'Astral Drift (94 BPM)';

      if (this.params.audioSource === 'weightlessMp3') {
        targetUrl = REFERENCE_TRACK_URLS.weightlessMp3;
        trackTitle = 'Weightless (174 BPM)';
      } else if (this.params.audioSource === 'customUrl') {
        const rawCustom = this.params.customAudioUrl || '';
        const resolved = resolveSongUrl(rawCustom);
        targetUrl = resolved.url || REFERENCE_TRACK_URLS.astralDriftMp3;
        trackTitle =
          this.params.customAudioTitle || resolved.title || 'Custom Song Link';
      }

      this.telemetry.trackTitle = trackTitle;

      this.proceduralMasterBus.gain.setTargetAtTime(0.0, now, 0.04);
      this.refGainNode.gain.setTargetAtTime(1.0, now, 0.04);

      if (
        this.refAudioEl &&
        (forceReload || this.currentRefTrackUrl !== targetUrl)
      ) {
        this.currentRefTrackUrl = targetUrl;
        this.detectedTrackBpm = estimateSeedBpmFromTrack(
          targetUrl,
          trackTitle,
          this.params.coreDrums.bpm
        );
        this.onsetIntervalsSec = [];
        this.lastOnsetTimeSec = 0;
        this.usingCorsFallback = false;
        if (this.corsFallbackAudioEl) {
          this.corsFallbackAudioEl.pause();
          this.corsFallbackAudioEl.src = '';
        }
        this.telemetry.trackStatus = 'loading';
        this.telemetry.trackErrorMessage = undefined;
        this.refAudioEl.src = targetUrl;
        this.refAudioEl.load();
      }

      if (this.isRunning) {
        if (this.ctx.state === 'suspended') {
          void this.ctx.resume().catch(() => {});
        }
        const activeEl = this.usingCorsFallback
          ? this.corsFallbackAudioEl
          : this.refAudioEl;
        if (activeEl) {
          void activeEl.play().catch((err: unknown) => {
            const errName = (err as { name?: string })?.name || '';
            if (errName === 'AbortError') {
              // Superseded by a newer load() or play(); canplay listener will start playback
              return;
            }
          });
        }
      }
    } else {
      this.refGainNode.gain.setTargetAtTime(0.0, now, 0.04);
      this.proceduralMasterBus.gain.setTargetAtTime(1.0, now, 0.04);
      if (this.refAudioEl && !this.refAudioEl.paused) {
        this.refAudioEl.pause();
      }
      if (this.corsFallbackAudioEl && !this.corsFallbackAudioEl.paused) {
        this.corsFallbackAudioEl.pause();
      }
      this.telemetry.trackStatus = 'idle';
      this.telemetry.trackErrorMessage = undefined;
    }
  }

  private buildGraph(ctx: AudioContext): void {
    this.startTime = ctx.currentTime;

    // Master Bus Glue Compressor (Punchy Midtempo Mastering)
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -11;
    compressor.knee.value = 10;
    compressor.ratio.value = 4.5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.18;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.params.masterVolume;

    this.proceduralMasterBus = ctx.createGain();
    this.proceduralMasterBus.gain.value = 1.0;
    this.proceduralMasterBus.connect(this.masterGain);

    // Setup Reference Track & Custom Song Link MediaElement bridge (with CORS FFT + automatic non-CORS fallback)
    this.refAudioEl = new Audio();
    this.refAudioEl.preload = 'auto';
    this.refAudioEl.loop = true;
    this.refAudioEl.crossOrigin = 'anonymous';

    this.corsFallbackAudioEl = new Audio();
    this.corsFallbackAudioEl.preload = 'auto';
    this.corsFallbackAudioEl.loop = true;
    this.corsFallbackAudioEl.volume = this.params.masterVolume;

    this.refAudioEl.addEventListener('canplay', () => {
      if (
        this.isRunning &&
        this.params.audioSource !== 'procedural' &&
        !this.usingCorsFallback &&
        this.refAudioEl &&
        this.refAudioEl.paused
      ) {
        if (this.ctx && this.ctx.state === 'suspended') {
          void this.ctx.resume().catch(() => {});
        }
        void this.refAudioEl.play().catch(() => {});
      }
    });

    this.refAudioEl.addEventListener('playing', () => {
      if (!this.usingCorsFallback) {
        this.telemetry.trackStatus = 'playing';
        this.telemetry.trackErrorMessage = undefined;
      }
    });

    this.refAudioEl.addEventListener('error', () => {
      if (this.params.audioSource === 'procedural' || !this.currentRefTrackUrl) {
        return;
      }

      // Step 1a: If a direct ice1.somafm.com live stream hiccups, try SomaFM's ice2 mirror on refAudioEl (keeping Web Audio FFT active)
      if (
        this.refAudioEl &&
        this.currentRefTrackUrl.includes('ice1.somafm.com')
      ) {
        const mirrorUrl = this.currentRefTrackUrl.replace(
          'ice1.somafm.com',
          'ice2.somafm.com'
        );
        this.currentRefTrackUrl = mirrorUrl;
        this.refAudioEl.src = mirrorUrl;
        this.refAudioEl.load();
        if (this.isRunning) {
          void this.refAudioEl.play().catch(() => {});
        }
        return;
      }

      // Step 1b: If ice2.somafm.com also fails and we have a local/worker proxy, try proxying the stream on refAudioEl
      if (
        this.refAudioEl &&
        this.currentRefTrackUrl.includes('ice2.somafm.com') &&
        !this.currentRefTrackUrl.includes('/api/proxy-audio') &&
        !isStaticHostWithoutWorker()
      ) {
        const originalSoma = this.currentRefTrackUrl.replace(
          'ice2.somafm.com',
          'ice1.somafm.com'
        );
        const proxiedSoma = `${AUDIO_API_BASE}/api/proxy-audio?url=${encodeURIComponent(originalSoma)}`;
        this.currentRefTrackUrl = proxiedSoma;
        this.refAudioEl.src = proxiedSoma;
        this.refAudioEl.load();
        if (this.isRunning) {
          void this.refAudioEl.play().catch(() => {});
        }
        return;
      }

      const unwrappedUrl = unwrapDirectFallbackUrl(this.currentRefTrackUrl);
      // Step 1c: If refAudioEl was using a local /api/proxy-audio URL that failed, retry via the CORS-enabled
      // Cloudflare Worker proxy on refAudioEl so Web Audio AnalyserNode FFT remains active
      const workerProxyUrl = `${DEFAULT_STATIC_WORKER_URL}/api/proxy-audio?url=${encodeURIComponent(unwrappedUrl)}`;
      if (
        this.refAudioEl &&
        unwrappedUrl &&
        !this.currentRefTrackUrl.startsWith(DEFAULT_STATIC_WORKER_URL) &&
        !unwrappedUrl.includes('somafm.com') &&
        !unwrappedUrl.includes('assets/aistudio/')
      ) {
        this.currentRefTrackUrl = workerProxyUrl;
        this.refAudioEl.src = workerProxyUrl;
        this.refAudioEl.load();
        if (this.isRunning) {
          void this.refAudioEl.play().catch(() => {});
        }
        return;
      }

      // Step 1d: If a local Studio Master MP3 (assets/aistudio/) is missing (e.g. binary files omitted during GitHub export),
      // seamlessly fall back to the live Procedural Studio Master arrangement so audio & shader reactivity play immediately
      if (this.currentRefTrackUrl.includes('assets/aistudio/')) {
        const isWeightless =
          this.currentRefTrackUrl.includes('Weightless') ||
          this.params.audioSource === 'weightlessMp3';
        this.params = {
          ...this.params,
          audioSource: 'procedural',
          coreDrums: {
            ...this.params.coreDrums,
            pattern: isWeightless ? 'weightlessDnb' : 'astralDrift',
            bpm: isWeightless ? 174 : 94,
            swing: isWeightless ? 0.04 : 0.14,
            kickDecaySec: isWeightless ? 0.16 : 0.42,
            hatToneHz: isWeightless ? 8800 : 7600,
            hatDecaySec: isWeightless ? 0.034 : 0.048,
          },
          subBass: {
            ...this.params.subBass,
            crunchDrive: isWeightless ? 0.14 : 0.68,
            sidechainDepth: isWeightless ? 0.38 : 0.78,
          },
          spatialFx: {
            ...this.params.spatialFx,
            reverbMix: isWeightless ? 0.68 : 0.48,
            delayMix: isWeightless ? 0.48 : 0.38,
            delayLeftSec: isWeightless ? 0.258 : 0.319,
          },
        };
        this.applyParams(this.params);
        if (this.ctx && this.proceduralMasterBus && this.refGainNode) {
          const now = this.ctx.currentTime;
          this.refGainNode.gain.setTargetAtTime(0.0, now, 0.04);
          this.proceduralMasterBus.gain.setTargetAtTime(1.0, now, 0.04);
        }
        this.telemetry.trackTitle = isWeightless
          ? 'Weightless (Studio Synth Master)'
          : 'Astral Drift (Studio Synth Master)';
        this.telemetry.trackStatus = 'playing';
        this.telemetry.trackErrorMessage = undefined;
        return;
      }

      // Step 2: If CORS proxy playback also failed, fall back to corsFallbackAudioEl (no crossOrigin attribute)
      if (
        this.params.audioSource === 'customUrl' &&
        this.currentRefTrackUrl &&
        !this.usingCorsFallback &&
        this.corsFallbackAudioEl
      ) {
        this.usingCorsFallback = true;
        this.corsFallbackAudioEl.volume = this.params.masterVolume;
        this.corsFallbackAudioEl.src = unwrappedUrl;
        this.corsFallbackAudioEl.load();
        if (this.isRunning) {
          void this.corsFallbackAudioEl
            .play()
            .then(() => {
              this.telemetry.trackStatus = 'cors-fallback';
              this.telemetry.trackErrorMessage = undefined;
            })
            .catch((err: unknown) => {
              const errName = (err as { name?: string })?.name || '';
              if (errName === 'AbortError' || errName === 'NotAllowedError') {
                // Superseded by load() or awaiting next user interaction; canplay/interaction listener will resume
                return;
              }
              this.telemetry.trackStatus = 'error';
              this.telemetry.trackErrorMessage =
                'Could not load audio from this link. Ensure it is a direct audio URL (.mp3, .wav, .ogg, .m4a), Suno link, or live stream.';
            });
        }
      } else {
        this.telemetry.trackStatus = 'error';
        this.telemetry.trackErrorMessage =
          'Could not load audio from this link. Ensure it is a direct audio URL (.mp3, .wav, .ogg, .m4a) or stream.';
      }
    });

    this.corsFallbackAudioEl.addEventListener('canplay', () => {
      if (
        this.isRunning &&
        this.params.audioSource !== 'procedural' &&
        this.usingCorsFallback &&
        this.corsFallbackAudioEl &&
        this.corsFallbackAudioEl.paused
      ) {
        void this.corsFallbackAudioEl.play().catch(() => {});
      }
    });

    this.corsFallbackAudioEl.addEventListener('playing', () => {
      if (this.usingCorsFallback) {
        this.telemetry.trackStatus = 'cors-fallback';
        this.telemetry.trackErrorMessage = undefined;
      }
    });

    this.corsFallbackAudioEl.addEventListener('error', () => {
      if (this.usingCorsFallback && this.params.audioSource !== 'procedural') {
        this.telemetry.trackStatus = 'error';
        this.telemetry.trackErrorMessage =
          'Unable to play this link. Make sure the URL points directly to an audio file (.mp3, .wav, .ogg, .m4a) or stream.';
      }
    });

    this.refGainNode = ctx.createGain();
    this.refGainNode.gain.value = 0.0;
    try {
      this.refMediaSource = ctx.createMediaElementSource(this.refAudioEl);
      this.refMediaSource.connect(this.refGainNode);
      this.refGainNode.connect(this.masterGain);
    } catch {
      // Fallback if media element already bound
    }

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.93;
    this.freqBins = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain.connect(compressor);
    compressor.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    try {
      this.mediaStreamDest = ctx.createMediaStreamDestination();
      compressor.connect(this.mediaStreamDest);
    } catch {
      this.mediaStreamDest = null;
    }

    this.dryBus = ctx.createGain();
    this.dryBus.gain.value = 1.0;
    this.dryBus.connect(this.proceduralMasterBus);

    // Kick Sidechain Ducking Bus (Reese Bass, Pads & Chords pump to the Kick)
    this.sidechainBus = ctx.createGain();
    this.sidechainBus.gain.value = 1.0;
    this.sidechainBus.connect(this.dryBus);

    // Pre-create White Noise buffer for Hi-Hats & Snare
    this.whiteNoiseBuffer = createWhiteNoiseBuffer(ctx, 1.0);

    // =========================================================================
    // HAAS EFFECT / MULTI-TAP STEREO WIDENER (15ms - 30ms Right-Channel Offset)
    // =========================================================================
    this.haasInputBus = ctx.createGain();
    const haasSplitter = ctx.createChannelSplitter(2);
    const haasMerger = ctx.createChannelMerger(2);

    this.haasDelayRight = ctx.createDelay(0.1);
    this.haasDelayRight.delayTime.value = this.params.stereoMotion.haasDelayMs / 1000;

    this.haasRightWetGain = ctx.createGain();
    this.haasRightWetGain.gain.value = 0.75;

    this.haasRightDryGain = ctx.createGain();
    this.haasRightDryGain.gain.value = 0.25;

    this.haasInputBus.connect(haasSplitter);
    haasSplitter.connect(haasMerger, 0, 0);
    haasSplitter.connect(this.haasRightDryGain, 1);
    this.haasRightDryGain.connect(haasMerger, 0, 1);
    haasSplitter.connect(this.haasDelayRight, 0);
    this.haasDelayRight.connect(this.haasRightWetGain);
    this.haasRightWetGain.connect(haasMerger, 0, 1);

    haasMerger.connect(this.sidechainBus);

    // =========================================================================
    // MASTER SPATIAL FX CHAIN (Stereo Ping-Pong Delay + Convolution Reverb)
    // =========================================================================
    this.fxSendBus = ctx.createGain();
    this.fxSendBus.gain.value = 1.0;

    this.delayLeft = ctx.createDelay(2.0);
    this.delayRight = ctx.createDelay(2.0);
    this.delayLeft.delayTime.value = this.params.spatialFx.delayLeftSec;
    this.delayRight.delayTime.value =
      this.params.spatialFx.delayLeftSec +
      this.params.spatialFx.delayRightOffsetMs / 1000;

    this.delayFeedbackL = ctx.createGain();
    this.delayFeedbackR = ctx.createGain();
    this.delayFeedbackL.gain.value = this.params.spatialFx.delayFeedback;
    this.delayFeedbackR.gain.value = this.params.spatialFx.delayFeedback;

    const delayDampFilter = ctx.createBiquadFilter();
    delayDampFilter.type = 'lowpass';
    delayDampFilter.frequency.value = 2800;

    const pingPongMerger = ctx.createChannelMerger(2);
    this.delayWetGain = ctx.createGain();
    this.delayWetGain.gain.value = this.params.spatialFx.delayMix;

    this.fxSendBus.connect(delayDampFilter);
    delayDampFilter.connect(this.delayLeft);

    this.delayLeft.connect(this.delayRight);
    this.delayRight.connect(this.delayFeedbackR);
    this.delayFeedbackR.connect(this.delayLeft);

    this.delayLeft.connect(this.delayFeedbackL);
    this.delayFeedbackL.connect(this.delayRight);

    this.delayLeft.connect(pingPongMerger, 0, 0);
    this.delayRight.connect(pingPongMerger, 0, 1);
    pingPongMerger.connect(this.delayWetGain);
    this.delayWetGain.connect(this.proceduralMasterBus);

    this.convolver = ctx.createConvolver();
    this.convolver.buffer = createCathedralImpulseBuffer(ctx, 3.6, 2.5);
    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.value = this.params.spatialFx.reverbMix;

    this.fxSendBus.connect(this.convolver);
    pingPongMerger.connect(this.convolver);
    this.convolver.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.proceduralMasterBus);

    // =========================================================================
    // 0. HEAVY CRUNCHY REESE & SUB-BASS ENGINE ("Astral Drift" Signature Bass)
    //    Clean Sub Sine (E1..D1) + Dual Detuned Saws + Pulse -> Resonant LPF -> Crunch WaveShaper
    // =========================================================================
    this.subSineOsc = ctx.createOscillator();
    this.subSineOsc.type = 'sine';
    this.subSineOsc.frequency.value = 41.2; // E1

    this.subSineGain = ctx.createGain();
    this.subSineGain.gain.value = 0.55;

    this.subOsc1 = ctx.createOscillator();
    this.subOsc2 = ctx.createOscillator();
    this.subOsc3 = ctx.createOscillator();
    this.subOsc1.type = 'sawtooth';
    this.subOsc2.type = 'sawtooth';
    this.subOsc3.type = 'square';

    this.subOsc1.frequency.value = 82.41; // E2
    this.subOsc2.frequency.value = 83.05; // Detuned Reese saw
    this.subOsc3.frequency.value = 82.41;
    this.subOsc1.detune.value = -11;
    this.subOsc2.detune.value = 11;

    const osc3Gain = ctx.createGain();
    osc3Gain.gain.value = 0.35;
    this.subOsc3.connect(osc3Gain);

    this.subFilter = ctx.createBiquadFilter();
    this.subFilter.type = 'lowpass';
    this.subFilter.frequency.value = 340.0;
    this.subFilter.Q.value = 3.8; // Crunchy resonant mid-bass peak

    this.subCrunchShaper = ctx.createWaveShaper();
    this.subCrunchShaper.curve = createCrunchDistortionCurve(
      this.params.subBass.crunchDrive ?? 0.68
    );
    this.subCrunchShaper.oversample = '2x';

    // Post-saturation cabinet rolloff so crunch stays warm & musical, never harsh
    this.subPostFilter = ctx.createBiquadFilter();
    this.subPostFilter.type = 'lowpass';
    this.subPostFilter.frequency.value = 1350.0;
    this.subPostFilter.Q.value = 0.7;

    this.subGain = ctx.createGain();
    this.subGain.gain.value = this.params.subBass.enabled
      ? this.params.subBass.gain * 0.48
      : 0.0;

    // Route Reese saws -> Resonant LPF -> Tube Crunch Shaper -> Post LPF -> subGain
    this.subOsc1.connect(this.subFilter);
    this.subOsc2.connect(this.subFilter);
    osc3Gain.connect(this.subFilter);
    this.subFilter.connect(this.subCrunchShaper);
    this.subCrunchShaper.connect(this.subPostFilter);
    this.subPostFilter.connect(this.subGain);

    // Route Clean Sub Sine directly to subGain for deep chest-hitting low end
    this.subSineOsc.connect(this.subSineGain);
    this.subSineGain.connect(this.subGain);

    this.subGain.connect(this.sidechainBus);

    this.subSineOsc.start();
    this.subOsc1.start();
    this.subOsc2.start();
    this.subOsc3.start();

    // =========================================================================
    // 1. TAPE-WARPED AMBIENT PAD (Lush Saw/Tri + Gentle Wow & Flutter)
    // =========================================================================
    this.tapeOsc1 = ctx.createOscillator();
    this.tapeOsc2 = ctx.createOscillator();
    this.tapeOsc1.type = 'sawtooth';
    this.tapeOsc2.type = 'triangle';
    this.tapeOsc1.frequency.value = 82.41; // E2
    this.tapeOsc2.frequency.value = 164.81; // E3
    this.tapeOsc1.detune.value = -6.0;
    this.tapeOsc2.detune.value = 6.0;

    this.tapeLfo1 = ctx.createOscillator();
    this.tapeLfo2 = ctx.createOscillator();
    this.tapeLfo1.type = 'sine';
    this.tapeLfo2.type = 'sine';
    this.tapeLfo1.frequency.value = 0.11;
    this.tapeLfo2.frequency.value = 0.16;

    this.tapeLfoGain1 = ctx.createGain();
    this.tapeLfoGain2 = ctx.createGain();
    this.tapeLfoGain1.gain.value = 0.3;
    this.tapeLfoGain2.gain.value = 0.3;

    this.tapeLfo1.connect(this.tapeLfoGain1);
    this.tapeLfo2.connect(this.tapeLfoGain2);
    this.tapeLfoGain1.connect(this.tapeOsc1.frequency);
    this.tapeLfoGain2.connect(this.tapeOsc2.frequency);

    this.tapeShaper = ctx.createWaveShaper();
    this.tapeShaper.curve = createTapeSaturationCurve(this.params.tapePad.saturationDrive);
    this.tapeShaper.oversample = '2x';

    this.tapeFilter = ctx.createBiquadFilter();
    this.tapeFilter.type = 'lowpass';
    this.tapeFilter.frequency.value = this.params.tapePad.cutoffHz;
    this.tapeFilter.Q.value = 1.4;

    this.tapePanner = ctx.createStereoPanner();
    this.tapePanLfo = ctx.createOscillator();
    this.tapePanLfo.type = 'sine';
    this.tapePanLfo.frequency.value = this.params.stereoMotion.autoPanRateHz;

    this.tapePanLfoGain = ctx.createGain();
    this.tapePanLfoGain.gain.value = this.params.stereoMotion.autoPanWidth;

    this.tapePanLfo.connect(this.tapePanLfoGain);
    this.tapePanLfoGain.connect(this.tapePanner.pan);

    this.tapeGain = ctx.createGain();
    this.tapeGain.gain.value = 0.0;

    this.tapeOsc1.connect(this.tapeShaper);
    this.tapeOsc2.connect(this.tapeShaper);
    this.tapeShaper.connect(this.tapeFilter);
    this.tapeFilter.connect(this.tapePanner);
    this.tapePanner.connect(this.tapeGain);

    this.tapeGain.connect(this.haasInputBus);
    this.tapeGain.connect(this.fxSendBus);

    this.tapeOsc1.start();
    this.tapeOsc2.start();
    this.tapeLfo1.start();
    this.tapeLfo2.start();
    this.tapePanLfo.start();

    // =========================================================================
    // 2. SOARING EXPRESSIVE GLIDING LEAD ("Astral Drift") &
    //    ANGELIC VOCAL FORMANT CHOIR ("Weightless" Ooh/Aah/Tell Me Soprano Choir)
    // =========================================================================
    this.leadOsc1 = ctx.createOscillator();
    this.leadOsc2 = ctx.createOscillator();
    this.leadSubOsc = ctx.createOscillator();
    this.leadOsc1.type = 'sawtooth';
    this.leadOsc2.type = 'sawtooth';
    this.leadSubOsc.type = 'triangle';
    this.leadOsc1.frequency.value = 493.88; // B4
    this.leadOsc2.frequency.value = 493.88;
    this.leadSubOsc.frequency.value = 246.94; // B3 octave body
    this.leadOsc1.detune.value = -9;
    this.leadOsc2.detune.value = 9;

    const leadSubMix = ctx.createGain();
    leadSubMix.gain.value = 0.42;
    this.leadSubOsc.connect(leadSubMix);

    // Expressive 5.5Hz Vibrato LFO
    this.leadVibratoLfo = ctx.createOscillator();
    this.leadVibratoLfo.type = 'sine';
    this.leadVibratoLfo.frequency.value = 5.5;
    this.leadVibratoGain = ctx.createGain();
    this.leadVibratoGain.gain.value = 4.2; // ±4.2 Hz expressive vibrato
    this.leadVibratoLfo.connect(this.leadVibratoGain);
    this.leadVibratoGain.connect(this.leadOsc1.frequency);
    this.leadVibratoGain.connect(this.leadOsc2.frequency);
    this.leadVibratoGain.connect(this.leadSubOsc.frequency);

    this.leadCrunchShaper = ctx.createWaveShaper();
    this.leadCrunchShaper.curve = createCrunchDistortionCurve(0.72);
    this.leadCrunchShaper.oversample = '2x';

    // Path A: Classic Lowpass Filter ("Astral Drift" Soaring Lead)
    this.leadFilter = ctx.createBiquadFilter();
    this.leadFilter.type = 'lowpass';
    this.leadFilter.frequency.value = 2350;
    this.leadFilter.Q.value = 2.6;

    this.leadDryFilterMixGain = ctx.createGain();
    this.leadDryFilterMixGain.gain.value = 1.0;

    // Path B: 3-Band Parallel Vocal Formant Choir Filter Bank ("Weightless" Angelic Ooh/Aah Voice)
    this.leadFormantF1 = ctx.createBiquadFilter();
    this.leadFormantF1.type = 'bandpass';
    this.leadFormantF1.frequency.value = 420; // Vowel F1 ("Ooh" ~360Hz -> "Aah" ~740Hz)
    this.leadFormantF1.Q.value = 5.8;

    this.leadFormantF2 = ctx.createBiquadFilter();
    this.leadFormantF2.type = 'bandpass';
    this.leadFormantF2.frequency.value = 920; // Vowel F2 ("Ooh" ~780Hz -> "Aah" ~1240Hz)
    this.leadFormantF2.Q.value = 7.2;

    this.leadFormantF3 = ctx.createBiquadFilter();
    this.leadFormantF3.type = 'bandpass';
    this.leadFormantF3.frequency.value = 2680; // Singer's formant air/presence (~2650Hz)
    this.leadFormantF3.Q.value = 8.0;

    const f1Gain = ctx.createGain();
    f1Gain.gain.value = 1.35;
    const f2Gain = ctx.createGain();
    f2Gain.gain.value = 1.15;
    const f3Gain = ctx.createGain();
    f3Gain.gain.value = 0.65;

    this.leadFormantMixGain = ctx.createGain();
    this.leadFormantMixGain.gain.value = 0.0; // Activated in Weightless mode

    // Breathy vocal whisper generator feeding into the formant filters for realistic human choir air
    if (this.whiteNoiseBuffer) {
      const breathSrc = ctx.createBufferSource();
      breathSrc.buffer = this.whiteNoiseBuffer;
      breathSrc.loop = true;
      const breathHp = ctx.createBiquadFilter();
      breathHp.type = 'highpass';
      breathHp.frequency.value = 1600;
      this.leadBreathGain = ctx.createGain();
      this.leadBreathGain.gain.value = 0.0;
      breathSrc.connect(breathHp);
      breathHp.connect(this.leadBreathGain);
      this.leadBreathGain.connect(this.leadFormantF1);
      this.leadBreathGain.connect(this.leadFormantF2);
      this.leadBreathGain.connect(this.leadFormantF3);
      breathSrc.start();
    }

    this.leadVca = ctx.createGain();
    this.leadVca.gain.value = 0.0; // Enveloped by melody sequencer

    this.leadMasterGain = ctx.createGain();
    this.leadMasterGain.gain.value = this.params.buchlaPing.enabled
      ? this.params.buchlaPing.gain * 0.34
      : 0.0;

    this.leadFxSendGain = ctx.createGain();
    this.leadFxSendGain.gain.value = 1.0;

    this.leadOsc1.connect(this.leadCrunchShaper);
    this.leadOsc2.connect(this.leadCrunchShaper);
    leadSubMix.connect(this.leadCrunchShaper);

    // Connect Path A (Astral Lead LPF)
    this.leadCrunchShaper.connect(this.leadFilter);
    this.leadFilter.connect(this.leadDryFilterMixGain);
    this.leadDryFilterMixGain.connect(this.leadVca);

    // Connect Path B (Weightless 3-Formant Vocal Choir Bank)
    this.leadCrunchShaper.connect(this.leadFormantF1);
    this.leadCrunchShaper.connect(this.leadFormantF2);
    this.leadCrunchShaper.connect(this.leadFormantF3);
    this.leadFormantF1.connect(f1Gain);
    this.leadFormantF2.connect(f2Gain);
    this.leadFormantF3.connect(f3Gain);
    f1Gain.connect(this.leadFormantMixGain);
    f2Gain.connect(this.leadFormantMixGain);
    f3Gain.connect(this.leadFormantMixGain);
    this.leadFormantMixGain.connect(this.leadVca);

    this.leadVca.connect(this.leadMasterGain);

    this.leadMasterGain.connect(this.haasInputBus);
    this.leadMasterGain.connect(this.leadFxSendGain);
    this.leadFxSendGain.connect(this.fxSendBus);

    this.leadOsc1.start();
    this.leadOsc2.start();
    this.leadSubOsc.start();
    this.leadVibratoLfo.start();

    // Also keep burst buffer for manual resonant Crystal Pings
    const burstSamples = Math.max(32, Math.floor(ctx.sampleRate * 0.005));
    this.noiseBurstBuffer = ctx.createBuffer(1, burstSamples, ctx.sampleRate);
    const burstData = this.noiseBurstBuffer.getChannelData(0);
    for (let i = 0; i < burstSamples; i++) {
      const env = 1.0 - i / burstSamples;
      burstData[i] = (Math.random() * 2 - 1) * env;
    }
    this.nextPingTime = ctx.currentTime + 0.5;

    // =========================================================================
    // 3. STOCHASTIC ATMOSPHERIC SWELLS (Filtered Brown Noise)
    // =========================================================================
    this.oceanSource = ctx.createBufferSource();
    this.oceanSource.buffer = createBrownNoiseBuffer(ctx, 12);
    this.oceanSource.loop = true;

    this.oceanFilter = ctx.createBiquadFilter();
    this.oceanFilter.type = 'bandpass';
    this.oceanFilter.frequency.value = 300;
    this.oceanFilter.Q.value = 2.0;

    this.oceanPanner = ctx.createStereoPanner();
    this.oceanPanner.pan.value = 0;

    this.oceanGain = ctx.createGain();
    this.oceanGain.gain.value = 0.0;

    this.oceanSource.connect(this.oceanFilter);
    this.oceanFilter.connect(this.oceanPanner);
    this.oceanPanner.connect(this.oceanGain);
    this.oceanGain.connect(this.sidechainBus);
    this.oceanGain.connect(this.fxSendBus);

    this.oceanSource.start();

    // =========================================================================
    // 4. HARMONIC CHORD PROGRESSION PAD (Em9 -> Cmaj9 -> Gmaj7 -> Dadd9)
    // =========================================================================
    const initialChord = ASTRAL_CHORD_PROGRESSION[0].padNotesHz;
    const baseTremoloRates = [0.08, 0.11, 0.14, 0.09];
    const voiceWeights = [0.32, 0.26, 0.24, 0.2];

    const chordFilter = ctx.createBiquadFilter();
    chordFilter.type = 'lowpass';
    chordFilter.frequency.value = 1500;
    chordFilter.Q.value = 0.8;

    this.droneMasterGain = ctx.createGain();
    this.droneMasterGain.gain.value = 0.0;
    this.droneMasterGain.connect(chordFilter);
    chordFilter.connect(this.haasInputBus);
    chordFilter.connect(this.fxSendBus);

    initialChord.forEach((freqHz, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freqHz;
      osc.detune.value = (idx - 1.5) * 4.5;

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = voiceWeights[idx];

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = baseTremoloRates[idx];

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = voiceWeights[idx] * 0.45;

      lfo.connect(lfoGain);
      lfoGain.connect(voiceGain.gain);

      osc.connect(voiceGain);
      voiceGain.connect(this.droneMasterGain!);

      osc.start();
      lfo.start();

      this.droneOscs.push(osc);
      this.droneVoiceGains.push(voiceGain);
      this.droneLfos.push(lfo);
      this.droneLfoGains.push(lfoGain);
    });

    // =========================================================================
    // 7. THE MODULATION MATRIX (LFO 2 Cross-Modulating LFO 1 -> Filter Cutoff)
    // =========================================================================
    this.modLfo1 = ctx.createOscillator();
    this.modLfo1.type = 'sine';
    this.modLfo1.frequency.value = this.params.modMatrix.lfo1BaseRateHz;

    this.modLfo1DepthVca = ctx.createGain();
    this.modLfo1DepthVca.gain.value = this.params.modMatrix.lfo1FilterDepthHz;

    this.modLfo2 = ctx.createOscillator();
    this.modLfo2.type = 'sine';
    this.modLfo2.frequency.value = this.params.modMatrix.lfo2RateHz;

    this.modLfo2ToRateGain = ctx.createGain();
    this.modLfo2ToRateGain.gain.value = this.params.modMatrix.lfo2ToLfo1RateDepth;
    this.modLfo2.connect(this.modLfo2ToRateGain);
    this.modLfo2ToRateGain.connect(this.modLfo1.frequency);

    this.modLfo2ToDepthGain = ctx.createGain();
    this.modLfo2ToDepthGain.gain.value =
      this.params.modMatrix.lfo1FilterDepthHz *
      this.params.modMatrix.lfo2ToLfo1AmpDepth *
      0.65;
    this.modLfo2.connect(this.modLfo2ToDepthGain);
    this.modLfo2ToDepthGain.connect(this.modLfo1DepthVca.gain);

    this.modLfo1.connect(this.modLfo1DepthVca);
    this.modLfo1DepthVca.connect(this.tapeFilter.frequency);

    this.modLfo1.start();
    this.modLfo2.start();
  }

  /**
   * Procedural Kick Drum + Automatic Sidechain Ducking
   * - Astral Drift: Deep 808 Sub Kick (0.42s decay)
   * - Weightless: Tight, crisp 174 BPM Liquid DnB 2-step kick (0.16s decay)
   */
  public triggerKick(velocity = 1.0): void {
    if (!this.ctx || !this.dryBus) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    const now = this.ctx.currentTime;
    const isWeightless = this.params.coreDrums.pattern === 'weightlessDnb';
    const decay = isWeightless
      ? Math.min(0.18, this.params.coreDrums.kickDecaySec)
      : this.params.coreDrums.kickDecaySec;
    const peakGain = Math.max(
      0.001,
      this.params.coreDrums.kickGain * velocity * (isWeightless ? 0.84 : 0.98)
    );

    const bodyOsc = this.ctx.createOscillator();
    bodyOsc.type = 'sine';
    const startPitch = isWeightless
      ? Math.min(142, this.params.coreDrums.kickPunchHz)
      : this.params.coreDrums.kickPunchHz;
    bodyOsc.frequency.setValueAtTime(startPitch, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(isWeightless ? 52.0 : 48.0, now + 0.035);
    bodyOsc.frequency.exponentialRampToValueAtTime(isWeightless ? 43.65 : 38.0, now + decay);

    const clickOsc = this.ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(isWeightless ? 620.0 : 860.0, now);
    clickOsc.frequency.exponentialRampToValueAtTime(75.0, now + 0.015);

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(peakGain * (isWeightless ? 0.26 : 0.42), now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    const kickVca = this.ctx.createGain();
    kickVca.gain.setValueAtTime(peakGain, now);
    kickVca.gain.exponentialRampToValueAtTime(0.0008, now + decay);

    bodyOsc.connect(kickVca);
    clickOsc.connect(clickGain);
    clickGain.connect(kickVca);
    kickVca.connect(this.dryBus);

    bodyOsc.start(now);
    clickOsc.start(now);
    bodyOsc.stop(now + decay + 0.02);
    clickOsc.stop(now + 0.024);

    // Sidechain Pump (fast & transparent in Weightless so choir pads float smoothly)
    if (this.sidechainBus) {
      const scDepth = isWeightless
        ? Math.min(0.42, this.params.subBass.sidechainDepth ?? 0.42)
        : this.params.subBass.sidechainDepth ?? 0.78;
      const duckFloor = Math.max(0.22, 1.0 - scDepth * velocity * 0.75);
      const releaseSec = isWeightless ? 0.12 : 0.24;
      this.sidechainBus.gain.cancelScheduledValues(now);
      this.sidechainBus.gain.setValueAtTime(this.sidechainBus.gain.value, now);
      this.sidechainBus.gain.linearRampToValueAtTime(duckFloor, now + 0.012);
      this.sidechainBus.gain.exponentialRampToValueAtTime(1.0, now + releaseSec);
    }

    this.kickEnv = Math.min(1.0, this.kickEnv + 0.85 * velocity);
  }

  /**
   * Triggers Bass Filter Swell & Pitch Glide
   * - Astral Drift: Heavy Crunchy Reese Bass with resonant mid-range growl
   * - Weightless: Deep, warm, silky Liquid DnB Sub-Bass with zero harsh mid-range buzz
   */
  public triggerReeseBassPulse(
    subFreqHz: number,
    reeseFreqHz: number,
    velocity = 1.0
  ): void {
    if (!this.ctx || !this.subFilter || !this.subSineOsc || !this.subOsc1 || !this.subOsc2 || !this.subOsc3) {
      return;
    }
    const now = this.ctx.currentTime;
    const isWeightless = this.params.coreDrums.pattern === 'weightlessDnb';
    const glideSec = isWeightless ? 0.065 : 0.045;

    this.subSineOsc.frequency.setTargetAtTime(subFreqHz, now, glideSec);
    this.subOsc1.frequency.setTargetAtTime(reeseFreqHz, now, glideSec);
    this.subOsc2.frequency.setTargetAtTime(
      reeseFreqHz + (isWeightless ? 0.35 : this.params.subBass.beatDetuneHz),
      now,
      glideSec
    );
    this.subOsc3.frequency.setTargetAtTime(reeseFreqHz, now, glideSec);

    if (isWeightless) {
      // Silky, warm, deep Liquid DnB Sub-Bass envelope (150Hz -> 260Hz, never harsh)
      const baseCut = 145;
      const peakCut = baseCut + velocity * 125;
      this.subFilter.frequency.cancelScheduledValues(now);
      this.subFilter.frequency.setValueAtTime(this.subFilter.frequency.value, now);
      this.subFilter.frequency.linearRampToValueAtTime(peakCut, now + 0.045);
      this.subFilter.frequency.exponentialRampToValueAtTime(baseCut + 25, now + 0.32);
      this.telemetry.subCutoffHz = peakCut;
    } else {
      // Crunchy resonant lowpass filter bite ("Astral Drift" wow/growl envelope)
      const baseCut = 210;
      const peakCut = Math.min(
        1400,
        baseCut + velocity * 580 * (0.65 + (this.params.subBass.crunchDrive ?? 0.68) * 0.6)
      );
      this.subFilter.frequency.cancelScheduledValues(now);
      this.subFilter.frequency.setValueAtTime(this.subFilter.frequency.value, now);
      this.subFilter.frequency.linearRampToValueAtTime(peakCut, now + 0.032);
      this.subFilter.frequency.exponentialRampToValueAtTime(baseCut + 70, now + 0.28);
      this.telemetry.subCutoffHz = peakCut;
    }
  }

  /**
   * Procedural Hi-Hat / Liquid DnB Shaker (Closed or Open)
   */
  public triggerHiHat(isOpen = false, velocity = 1.0): void {
    if (!this.ctx || !this.dryBus || !this.whiteNoiseBuffer) {
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    const now = this.ctx.currentTime;
    const isWeightless = this.params.coreDrums.pattern === 'weightlessDnb';
    const baseDecay = isWeightless
      ? Math.min(0.036, this.params.coreDrums.hatDecaySec)
      : this.params.coreDrums.hatDecaySec;
    const decay = isOpen ? Math.max(0.14, baseDecay * 4.2) : baseDecay;
    const peakGain = Math.max(
      0.001,
      this.params.coreDrums.hatsGain * velocity * (isWeightless ? 0.38 : 0.55)
    );

    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(
      isWeightless ? Math.max(8600, this.params.coreDrums.hatToneHz) : this.params.coreDrums.hatToneHz,
      now
    );
    hpFilter.Q.value = isWeightless ? 0.85 : 1.2;

    const hatVca = this.ctx.createGain();
    hatVca.gain.setValueAtTime(peakGain, now);
    hatVca.gain.exponentialRampToValueAtTime(0.0006, now + decay);

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.whiteNoiseBuffer;
    noiseSrc.connect(hpFilter);

    // In Weightless mode, use a silky airy shaker/cymbal shimmer instead of clangy square waves
    if (!isWeightless) {
      const metallicFreqs = [245.4, 369.6, 522.7, 800.0];
      for (const f of metallicFreqs) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f * (this.params.coreDrums.hatToneHz / 7400), now);
        const oGain = this.ctx.createGain();
        oGain.gain.value = 0.032;
        osc.connect(oGain);
        oGain.connect(hpFilter);
        osc.start(now);
        osc.stop(now + decay + 0.01);
      }
    }

    hpFilter.connect(hatVca);
    if (this.haasInputBus) {
      hatVca.connect(this.haasInputBus);
    } else {
      hatVca.connect(this.dryBus);
    }
    if (isOpen && this.fxSendBus) {
      const sendTap = this.ctx.createGain();
      sendTap.gain.value = isWeightless ? 0.45 : 0.35;
      hatVca.connect(sendTap);
      sendTap.connect(this.fxSendBus);
    }

    noiseSrc.start(now);
    noiseSrc.stop(now + decay + 0.01);

    this.hatEnv = Math.min(1.0, this.hatEnv + (isOpen ? 0.62 : 0.34) * velocity);
  }

  /**
   * Procedural Snare Drum
   * - Astral Drift: Crunchy Layered Midtempo Snare + Handclap
   * - Weightless: Crisp, light, airy 174 BPM Liquid Breakbeat Rim/Snare & Ghost Brush
   */
  public triggerSnare(velocity = 1.0): void {
    if (!this.ctx || !this.dryBus || !this.whiteNoiseBuffer) {
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    const now = this.ctx.currentTime;
    const isWeightless = this.params.coreDrums.pattern === 'weightlessDnb';
    const peakGain = Math.max(
      0.001,
      this.params.coreDrums.snareGain * velocity * (isWeightless ? 0.56 : 0.72)
    );

    if (isWeightless) {
      // Crisp, tight Liquid DnB breakbeat rim/snare (no harsh crunch distortion)
      const isGhost = velocity < 0.55;
      const bodyOsc = this.ctx.createOscillator();
      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(isGhost ? 290.0 : 268.0, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(158.0, now + 0.055);

      const bodyVca = this.ctx.createGain();
      bodyVca.gain.setValueAtTime(peakGain * (isGhost ? 0.45 : 0.72), now);
      bodyVca.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      bodyOsc.connect(bodyVca);
      bodyVca.connect(this.dryBus);

      // Airy high-passed breakbeat snare brush
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = this.whiteNoiseBuffer;

      const bpFilter = this.ctx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.setValueAtTime(isGhost ? 3400 : 2850, now);
      bpFilter.Q.value = 0.95;

      const snapDecay = isGhost ? 0.065 : 0.115;
      const noiseVca = this.ctx.createGain();
      noiseVca.gain.setValueAtTime(peakGain * 0.68, now);
      noiseVca.gain.exponentialRampToValueAtTime(0.0008, now + snapDecay);

      noiseSrc.connect(bpFilter);
      bpFilter.connect(noiseVca);
      noiseVca.connect(this.dryBus);

      if (this.fxSendBus && !isGhost) {
        const revSend = this.ctx.createGain();
        revSend.gain.value = 0.34;
        noiseVca.connect(revSend);
        revSend.connect(this.fxSendBus);
      }

      bodyOsc.start(now);
      bodyOsc.stop(now + 0.085);
      noiseSrc.start(now);
      noiseSrc.stop(now + snapDecay + 0.015);

      this.snareEnv = Math.min(1.0, this.snareEnv + 0.65 * velocity);
      return;
    }

    // 1. Punchy Drum Shell Body (235Hz -> 125Hz) for Astral Drift
    const bodyOsc = this.ctx.createOscillator();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(235.0, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(122.0, now + 0.085);

    const bodyVca = this.ctx.createGain();
    bodyVca.gain.setValueAtTime(peakGain * 0.78, now);
    bodyVca.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    bodyOsc.connect(bodyVca);
    bodyVca.connect(this.dryBus);

    // 2. Crunchy Snare Wires + Layered Clap Noise Burst
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.whiteNoiseBuffer;

    const bpFilter = this.ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.setValueAtTime(1850, now);
    bpFilter.Q.value = 1.1;

    const crunchShaper = this.ctx.createWaveShaper();
    crunchShaper.curve = this.pluckCrunchCurve;

    const snapDecay = 0.16 + this.params.coreDrums.snareSnap * 0.14;
    const noiseVca = this.ctx.createGain();
    const wirePeak = Math.max(
      0.001,
      peakGain * (0.48 + this.params.coreDrums.snareSnap * 0.75)
    );
    noiseVca.gain.setValueAtTime(wirePeak * 0.75, now);
    noiseVca.gain.linearRampToValueAtTime(wirePeak, now + 0.012);
    noiseVca.gain.exponentialRampToValueAtTime(0.0008, now + snapDecay);

    noiseSrc.connect(bpFilter);
    bpFilter.connect(crunchShaper);
    crunchShaper.connect(noiseVca);
    noiseVca.connect(this.dryBus);

    if (this.fxSendBus) {
      const revSend = this.ctx.createGain();
      revSend.gain.value = 0.42;
      noiseVca.connect(revSend);
      revSend.connect(this.fxSendBus);
    }

    bodyOsc.start(now);
    bodyOsc.stop(now + 0.14);
    noiseSrc.start(now);
    noiseSrc.stop(now + snapDecay + 0.02);

    this.snareEnv = Math.min(1.0, this.snareEnv + 0.78 * velocity);
  }

  /**
   * Procedural Synth Pluck / Arpeggio
   * - Astral Drift: Crunchy Acid / Squelch Saw+Square Pluck with asymmetric distortion
   * - Weightless: Sparkling, high-register Crystalline Glass Bell / Harp Arpeggio (pure, zero distortion)
   */
  public triggerFmPluck(freqHz?: number, velocity = 1.0, customDecaySec?: number): void {
    if (!this.ctx || !this.dryBus) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    const now = this.ctx.currentTime;
    const isWeightless = this.params.coreDrums.pattern === 'weightlessDnb';

    if (isWeightless) {
      // Sparkling High-Register Crystal Bell / Harp Arpeggio ("Weightless" 1:58-2:38 climax bells)
      const baseHz =
        freqHz ??
        PENTATONIC_SCALE_HZ[Math.floor(Math.random() * PENTATONIC_SCALE_HZ.length)];
      // Pitch into the shimmering crystal bell register (C5 - G6)
      const bellHz = baseHz < 440 ? baseHz * 2.0 : baseHz;
      const peakGain = Math.max(0.001, this.params.coreDrums.fmPluckGain * velocity * 0.34);
      const decay = customDecaySec ?? 0.28;

      const carrier = this.ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(bellHz, now);

      const shimmerTri = this.ctx.createOscillator();
      shimmerTri.type = 'triangle';
      shimmerTri.frequency.setValueAtTime(bellHz * 2.0, now); // Delicate octave overtone
      shimmerTri.detune.setValueAtTime(4, now);
      const shimmerGain = this.ctx.createGain();
      shimmerGain.gain.setValueAtTime(0.24, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + decay * 0.65);
      shimmerTri.connect(shimmerGain);

      // Gentle glassy FM bell chime on attack
      const modulator = this.ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(bellHz * 3.0, now);

      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(bellHz * 0.22, now);
      modGain.gain.exponentialRampToValueAtTime(0.5, now + 0.045);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(1.2, now);
      filter.frequency.setValueAtTime(4800, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(1200, bellHz * 1.8), now + decay);

      const vca = this.ctx.createGain();
      vca.gain.setValueAtTime(0.001, now);
      vca.gain.linearRampToValueAtTime(peakGain, now + 0.005);
      vca.gain.exponentialRampToValueAtTime(0.0006, now + decay);

      carrier.connect(filter);
      shimmerGain.connect(filter);
      filter.connect(vca);

      if (this.haasInputBus) {
        vca.connect(this.haasInputBus);
      } else {
        vca.connect(this.dryBus);
      }
      if (this.fxSendBus) {
        const fxTap = this.ctx.createGain();
        fxTap.gain.value = 0.76; // Lush stereo ping-pong delay & cathedral reverb tail
        vca.connect(fxTap);
        fxTap.connect(this.fxSendBus);
      }

      carrier.start(now);
      shimmerTri.start(now);
      modulator.start(now);
      carrier.stop(now + decay + 0.02);
      shimmerTri.stop(now + decay + 0.02);
      modulator.stop(now + decay + 0.02);

      this.pluckEnv = Math.min(1.0, this.pluckEnv + 0.52 * velocity);
      return;
    }

    const noteHz =
      freqHz ??
      ACID_BASS_SCALE_HZ[Math.floor(Math.random() * ACID_BASS_SCALE_HZ.length)];
    const peakGain = Math.max(0.001, this.params.coreDrums.fmPluckGain * velocity * 0.52);
    const decay = customDecaySec ?? 0.24;

    // Sawtooth + Square dual oscillator for rich harmonic bite
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(noteHz, now);

    const subSq = this.ctx.createOscillator();
    subSq.type = 'square';
    subSq.frequency.setValueAtTime(noteHz * 0.5, now);
    const subSqGain = this.ctx.createGain();
    subSqGain.gain.value = 0.28;
    subSq.connect(subSqGain);

    // Crunchy FM harmonic attack transient
    const modulator = this.ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(noteHz * 2.0, now);

    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(noteHz * 0.85, now);
    modGain.gain.exponentialRampToValueAtTime(1.0, now + 0.085);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Squelchy Resonant Lowpass Filter ("Astral Drift" 0:49-1:13 Acid/Crunch Matrix)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(5.2, now);
    const maxCut = Math.max(320, this.params.coreDrums.fmPluckCutoff * (0.75 + velocity * 0.45));
    filter.frequency.setValueAtTime(maxCut, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(140, noteHz * 1.4), now + decay * 0.85);

    // Crunchy Waveshaper stage
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.pluckCrunchCurve;

    const vca = this.ctx.createGain();
    vca.gain.setValueAtTime(peakGain, now);
    vca.gain.exponentialRampToValueAtTime(0.0008, now + decay);

    carrier.connect(filter);
    subSqGain.connect(filter);
    filter.connect(shaper);
    shaper.connect(vca);

    if (this.haasInputBus) {
      vca.connect(this.haasInputBus);
    } else {
      vca.connect(this.dryBus);
    }
    if (this.fxSendBus) {
      const fxTap = this.ctx.createGain();
      fxTap.gain.value = 0.48;
      vca.connect(fxTap);
      fxTap.connect(this.fxSendBus);
    }

    carrier.start(now);
    subSq.start(now);
    modulator.start(now);
    carrier.stop(now + decay + 0.02);
    subSq.stop(now + decay + 0.02);
    modulator.stop(now + decay + 0.02);

    this.pluckEnv = Math.min(1.0, this.pluckEnv + 0.68 * velocity);
  }

  /**
   * Updates the Lead / Vocal Choir note with smooth exponential portamento
   * - Astral Drift: Soaring distorted solo lead
   * - Weightless: Angelic Female Vocal Formant Choir ("Ooh — Aah — Tell me...")
   */
  public triggerGlidingLeadNote(targetFreqHz: number, sustainSec = 0.45): void {
    if (
      !this.ctx ||
      !this.leadOsc1 ||
      !this.leadOsc2 ||
      !this.leadSubOsc ||
      !this.leadVca ||
      !this.leadFilter
    ) {
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    const now = this.ctx.currentTime;
    const isWeightless = this.params.coreDrums.pattern === 'weightlessDnb';
    const glideTime = isWeightless
      ? 0.085 // Smooth human legato vocal slide
      : Math.max(0.025, Math.min(0.18, this.params.buchlaPing.intervalSec * 0.16));

    // Exponential portamento pitch slide on lead oscillators
    this.leadOsc1.frequency.setTargetAtTime(targetFreqHz, now, glideTime);
    this.leadOsc2.frequency.setTargetAtTime(targetFreqHz, now, glideTime);
    // In Weightless mode, pitch the 3rd oscillator at unison/soprano instead of an octave-down baritone growl
    this.leadSubOsc.frequency.setTargetAtTime(
      isWeightless ? targetFreqHz : targetFreqHz * 0.5,
      now,
      glideTime
    );

    if (
      isWeightless &&
      this.leadFormantF1 &&
      this.leadFormantF2 &&
      this.leadFormantF3
    ) {
      // Morph between Angelic Female Choir Vowels ("Ooh" -> "Aah" -> "Eeh")
      this.vowelToggle = (this.vowelToggle + 1) % 3;
      const startF1 = this.vowelToggle === 0 ? 360 : this.vowelToggle === 1 ? 450 : 520;
      const startF2 = this.vowelToggle === 0 ? 780 : this.vowelToggle === 1 ? 1150 : 1680;
      const endF1 = 720; // Opens into warm angelic "Aah"
      const endF2 = 1260;
      const endF3 = 2780;

      this.leadFormantF1.frequency.cancelScheduledValues(now);
      this.leadFormantF2.frequency.cancelScheduledValues(now);
      this.leadFormantF3.frequency.cancelScheduledValues(now);

      this.leadFormantF1.frequency.setTargetAtTime(startF1, now, 0.04);
      this.leadFormantF1.frequency.setTargetAtTime(endF1, now + 0.12, 0.28);

      this.leadFormantF2.frequency.setTargetAtTime(startF2, now, 0.04);
      this.leadFormantF2.frequency.setTargetAtTime(endF2, now + 0.12, 0.28);

      this.leadFormantF3.frequency.setTargetAtTime(endF3, now, 0.08);

      if (this.leadBreathGain) {
        this.leadBreathGain.gain.cancelScheduledValues(now);
        this.leadBreathGain.gain.setTargetAtTime(0.065, now, 0.03);
        this.leadBreathGain.gain.setTargetAtTime(0.018, now + 0.14, 0.25);
      }

      // Soft, breathy choir attack and long floating release
      this.leadVca.gain.cancelScheduledValues(now);
      this.leadVca.gain.setTargetAtTime(0.95, now, 0.065);
      this.leadVca.gain.setTargetAtTime(0.0, now + sustainSec, 0.35);
    } else {
      // Expressive filter swell on new note articulation for Astral Drift
      const filterPeak = Math.min(4200, Math.max(1200, targetFreqHz * 4.2));
      this.leadFilter.frequency.setTargetAtTime(filterPeak, now, 0.04);
      this.leadFilter.frequency.setTargetAtTime(1850, now + 0.12, 0.22);

      this.leadVca.gain.cancelScheduledValues(now);
      this.leadVca.gain.setTargetAtTime(0.85, now, 0.025);
      this.leadVca.gain.setTargetAtTime(0.0, now + sustainSec, 0.18);
    }

    this.telemetry.lastPingFreqHz = targetFreqHz;
    this.telemetry.lastPingAtMs = performance.now();
    this.pluckEnv = Math.min(1.0, this.pluckEnv + 0.45);
  }

  public applyParams(next: SynthParams): void {
    const prevSource = this.params.audioSource;
    const prevCustomUrl = this.params.customAudioUrl;
    this.params = next;
    this.smoothedBands.reactivity = next.audioReactive.enabled
      ? next.audioReactive.reactivity
      : 0.0;
    this.smoothedBands.musicDrivesTime = next.audioReactive.musicDrivesTime;
    this.smoothedBands.animDrive = next.audioReactive.animDrive;

    if (!this.ctx) return;

    if (
      prevSource !== next.audioSource ||
      (next.audioSource === 'customUrl' && prevCustomUrl !== next.customAudioUrl)
    ) {
      this.syncAudioSourcePlayback();
    }

    const now = this.ctx.currentTime;
    const ramp = 0.06;
    const isWeightless = next.coreDrums.pattern === 'weightlessDnb';

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(next.masterVolume, now, ramp);
    }
    if (this.corsFallbackAudioEl) {
      this.corsFallbackAudioEl.volume = Math.max(0, Math.min(1, next.masterVolume));
    }

    // 0. Sub-Bass Foundation (Silky Deep Liquid Sub in Weightless vs Crunchy Reese in Astral Drift)
    if (
      this.subGain &&
      this.subCrunchShaper &&
      this.subFilter &&
      this.subPostFilter &&
      this.subSineGain
    ) {
      const targetSubGain = next.subBass.enabled ? next.subBass.gain * 0.52 : 0.0;
      this.subGain.gain.setTargetAtTime(targetSubGain, now, ramp);
      if (isWeightless) {
        // Pure, warm, deep Liquid DnB Sub-Bass without harsh acid distortion
        this.subSineGain.gain.setTargetAtTime(0.82, now, ramp);
        this.subFilter.Q.setTargetAtTime(1.25, now, ramp);
        this.subPostFilter.frequency.setTargetAtTime(380, now, ramp);
        this.subCrunchShaper.curve = createTapeSaturationCurve(0.14);
      } else {
        this.subSineGain.gain.setTargetAtTime(0.55, now, ramp);
        this.subFilter.Q.setTargetAtTime(3.8, now, ramp);
        this.subPostFilter.frequency.setTargetAtTime(1350, now, ramp);
        this.subCrunchShaper.curve = createCrunchDistortionCurve(
          next.subBass.crunchDrive ?? 0.68
        );
      }
    }

    // 1. Tape-Warped / Ethereal Ambient Pad
    if (
      this.tapeOsc1 &&
      this.tapeOsc2 &&
      this.tapeLfoGain1 &&
      this.tapeLfoGain2 &&
      this.tapeShaper &&
      this.tapeFilter &&
      this.tapeGain
    ) {
      this.tapeOsc1.detune.setTargetAtTime(-next.tapePad.detuneCents * 0.5, now, ramp);
      this.tapeOsc2.detune.setTargetAtTime(next.tapePad.detuneCents * 0.5, now, ramp);
      this.tapeLfoGain1.gain.setTargetAtTime(next.tapePad.wowDriftHz, now, ramp);
      this.tapeLfoGain2.gain.setTargetAtTime(next.tapePad.wowDriftHz, now, ramp);
      this.tapeShaper.curve = createTapeSaturationCurve(
        isWeightless ? Math.min(0.15, next.tapePad.saturationDrive) : next.tapePad.saturationDrive
      );
      this.tapeFilter.frequency.setTargetAtTime(
        isWeightless ? Math.max(1550, next.tapePad.cutoffHz) : next.tapePad.cutoffHz,
        now,
        ramp
      );

      const targetTapeGain = next.tapePad.enabled
        ? next.tapePad.gain * (isWeightless ? 0.48 : 0.42)
        : 0.0;
      this.tapeGain.gain.setTargetAtTime(targetTapeGain, now, ramp);
    }

    // 2. Soaring Astral Gliding Lead vs Weightless Angelic Vocal Formant Choir
    if (
      this.leadMasterGain &&
      this.leadFilter &&
      this.leadCrunchShaper &&
      this.leadDryFilterMixGain &&
      this.leadFormantMixGain &&
      this.leadFxSendGain
    ) {
      const targetLeadGain = next.buchlaPing.enabled
        ? next.buchlaPing.gain * (isWeightless ? 0.46 : 0.36)
        : 0.0;
      this.leadMasterGain.gain.setTargetAtTime(targetLeadGain, now, ramp);

      if (isWeightless) {
        // Pure warm vocal saturation + 3-Band Vowel Formant Choir Filter Bank
        this.leadCrunchShaper.curve = createTapeSaturationCurve(0.14);
        this.leadDryFilterMixGain.gain.setTargetAtTime(0.22, now, ramp);
        this.leadFormantMixGain.gain.setTargetAtTime(0.95, now, ramp);
        this.leadFxSendGain.gain.setTargetAtTime(1.45, now, ramp); // Cathedral vocal shimmer
        this.leadFilter.Q.setTargetAtTime(1.6, now, ramp);
      } else {
        this.leadCrunchShaper.curve = createCrunchDistortionCurve(0.72);
        this.leadDryFilterMixGain.gain.setTargetAtTime(1.0, now, ramp);
        this.leadFormantMixGain.gain.setTargetAtTime(0.0, now, ramp);
        this.leadFxSendGain.gain.setTargetAtTime(1.0, now, ramp);
        this.leadFilter.Q.setTargetAtTime(
          Math.min(8.0, Math.max(1.2, next.buchlaPing.resonanceQ * 0.12)),
          now,
          ramp
        );
      }
    }

    // 3. Ocean Waves static Q
    if (this.oceanFilter) {
      this.oceanFilter.Q.setTargetAtTime(next.oceanWaves.filterQ, now, ramp);
    }
    if (this.oceanGain && !next.oceanWaves.enabled) {
      this.oceanGain.gain.setTargetAtTime(0.0, now, ramp);
    }

    // 4. Harmonic Chord Progression Pad
    const baseTremoloRates = [0.08, 0.11, 0.14, 0.09];
    const voiceWeights = [0.32, 0.26, 0.24, 0.2];

    this.droneLfos.forEach((lfo, idx) => {
      const lfoGain = this.droneLfoGains[idx];
      if (lfo) {
        lfo.frequency.setTargetAtTime(
          baseTremoloRates[idx] * next.justDrone.tremoloRateScale,
          now,
          ramp
        );
      }
      if (lfoGain) {
        lfoGain.gain.setTargetAtTime(
          voiceWeights[idx] * next.justDrone.tremoloDepth * 0.75,
          now,
          ramp
        );
      }
    });

    if (this.droneMasterGain) {
      const targetDroneGain = next.justDrone.enabled
        ? next.justDrone.gain * (isWeightless ? 0.56 : 0.48)
        : 0.0;
      this.droneMasterGain.gain.setTargetAtTime(targetDroneGain, now, ramp);
    }

    // 5. Master Spatial FX Chain
    if (
      this.delayLeft &&
      this.delayRight &&
      this.delayFeedbackL &&
      this.delayFeedbackR &&
      this.delayWetGain
    ) {
      this.delayLeft.delayTime.setTargetAtTime(next.spatialFx.delayLeftSec, now, ramp);
      this.delayRight.delayTime.setTargetAtTime(
        next.spatialFx.delayLeftSec + next.spatialFx.delayRightOffsetMs / 1000,
        now,
        ramp
      );
      this.delayFeedbackL.gain.setTargetAtTime(next.spatialFx.delayFeedback, now, ramp);
      this.delayFeedbackR.gain.setTargetAtTime(next.spatialFx.delayFeedback, now, ramp);
      this.delayWetGain.gain.setTargetAtTime(
        next.spatialFx.delayEnabled ? next.spatialFx.delayMix : 0.0,
        now,
        ramp
      );
    }

    if (this.reverbWetGain) {
      this.reverbWetGain.gain.setTargetAtTime(
        next.spatialFx.reverbEnabled ? next.spatialFx.reverbMix : 0.0,
        now,
        ramp
      );
    }

    // 6. Stereo Panner LFO & Haas Effect Widener
    if (this.tapePanLfo && this.tapePanLfoGain) {
      this.tapePanLfo.frequency.setTargetAtTime(
        next.stereoMotion.autoPanRateHz,
        now,
        ramp
      );
      this.tapePanLfoGain.gain.setTargetAtTime(
        next.stereoMotion.autoPanWidth,
        now,
        ramp
      );
    }

    if (this.haasDelayRight && this.haasRightWetGain && this.haasRightDryGain) {
      const delaySec = Math.max(0.005, Math.min(0.05, next.stereoMotion.haasDelayMs / 1000));
      this.haasDelayRight.delayTime.setTargetAtTime(delaySec, now, ramp);
      const spread = next.stereoMotion.haasEnabled ? next.stereoMotion.haasSpread : 0.0;
      this.haasRightWetGain.gain.setTargetAtTime(spread, now, ramp);
      this.haasRightDryGain.gain.setTargetAtTime(1.0 - spread * 0.75, now, ramp);
    }

    // 7. Modulation Matrix
    if (
      this.modLfo1 &&
      this.modLfo1DepthVca &&
      this.modLfo2 &&
      this.modLfo2ToRateGain &&
      this.modLfo2ToDepthGain
    ) {
      const matrixActive = next.modMatrix.enabled ? 1.0 : 0.0;
      this.modLfo1.frequency.setTargetAtTime(next.modMatrix.lfo1BaseRateHz, now, ramp);
      this.modLfo1DepthVca.gain.setTargetAtTime(
        next.modMatrix.lfo1FilterDepthHz * matrixActive,
        now,
        ramp
      );
      this.modLfo2.frequency.setTargetAtTime(next.modMatrix.lfo2RateHz, now, ramp);
      this.modLfo2ToRateGain.gain.setTargetAtTime(
        next.modMatrix.lfo2ToLfo1RateDepth * matrixActive,
        now,
        ramp
      );
      this.modLfo2ToDepthGain.gain.setTargetAtTime(
        next.modMatrix.lfo1FilterDepthHz *
          next.modMatrix.lfo2ToLfo1AmpDepth *
          0.65 *
          matrixActive,
        now,
        ramp
      );
    }
  }

  /**
   * Fires a manual soaring lead note + crystal resonant harmonic ping
   */
  public triggerBuchlaPing(forcedFreqHz?: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBurstBuffer) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;

    let freq = forcedFreqHz;
    if (!freq) {
      this.scaleStepIndex = (this.scaleStepIndex + 1) % PENTATONIC_SCALE_HZ.length;
      freq = PENTATONIC_SCALE_HZ[this.scaleStepIndex];
    }

    // Also glide the Lead / Vocal Choir to this note!
    this.triggerGlidingLeadNote(freq, Math.max(0.4, this.params.buchlaPing.decaySec));

    const burst = this.ctx.createBufferSource();
    burst.buffer = this.noiseBurstBuffer;

    const resonantFilter = this.ctx.createBiquadFilter();
    resonantFilter.type = this.params.buchlaPing.filterType;
    resonantFilter.frequency.setValueAtTime(freq, now);
    resonantFilter.Q.setValueAtTime(this.params.buchlaPing.resonanceQ, now);

    const jitteredDecay =
      this.params.buchlaPing.decaySec * (0.75 + Math.random() * 0.45);

    const pingGain = this.ctx.createGain();
    const peakGain = Math.max(0.001, this.params.buchlaPing.gain * 0.9);
    pingGain.gain.setValueAtTime(peakGain, now);
    pingGain.gain.exponentialRampToValueAtTime(0.0008, now + jitteredDecay);

    burst.connect(resonantFilter);
    resonantFilter.connect(pingGain);
    if (this.haasInputBus) {
      pingGain.connect(this.haasInputBus);
    } else {
      pingGain.connect(this.masterGain);
    }
    if (this.fxSendBus) {
      pingGain.connect(this.fxSendBus);
    }

    burst.start(now);
    burst.stop(now + 0.006);

    setTimeout(() => {
      try {
        pingGain.disconnect();
        resonantFilter.disconnect();
      } catch {
        // Ignore already disconnected
      }
    }, Math.ceil((jitteredDecay + 0.15) * 1000));

    this.telemetry.lastPingFreqHz = freq;
    this.telemetry.lastPingAtMs = performance.now();
    this.pluckEnv = Math.min(1.0, this.pluckEnv + 0.62);
  }

  /**
   * Updates the 4-bar chord progression:
   * - Astral Drift: Em9 -> Cmaj9 -> Gmaj7 -> Dadd9/Bm7
   * - Weightless:   Fm9 -> Dbmaj9 -> Abmaj7 -> Ebmaj9/Cm7
   */
  private getActiveChordProgression(): AstralChordDef[] {
    return this.params.coreDrums.pattern === 'weightlessDnb'
      ? WEIGHTLESS_CHORD_PROGRESSION
      : ASTRAL_CHORD_PROGRESSION;
  }

  private applyChordProgressionBar(barIdx: number, now: number): void {
    const progression = this.getActiveChordProgression();
    const chord = progression[barIdx % progression.length];
    this.telemetry.currentChordName = chord.name;

    const pitchScale = this.params.justDrone.rootFreq / 82.41; // Relative to E2 = 82.41Hz

    // Smoothly glide the 4-voice Chord Pad (justDrone) to the new bar's chord
    chord.padNotesHz.forEach((hz, idx) => {
      const osc = this.droneOscs[idx];
      if (osc) {
        osc.frequency.setTargetAtTime(hz * pitchScale, now, 0.14);
      }
    });

    // Smoothly glide the Tape-Warped Pad root & fifth/octave
    if (this.tapeOsc1 && this.tapeOsc2) {
      this.tapeOsc1.frequency.setTargetAtTime(chord.reeseRootHz * pitchScale, now, 0.12);
      this.tapeOsc2.frequency.setTargetAtTime(chord.padNotesHz[0] * pitchScale, now, 0.12);
    }
  }

  private stepCoreDrumSequencer(now: number): void {
    if (this.params.audioSource !== 'procedural') return;

    const pat = DRUM_PATTERNS[this.params.coreDrums.pattern] || DRUM_PATTERNS.astralDrift;
    const isWeightless = this.params.coreDrums.pattern === 'weightlessDnb';
    const activeProgression = this.getActiveChordProgression();
    this.telemetry.totalSteps = pat.totalSteps;
    this.telemetry.stepsPerBeat = pat.stepsPerBeat;

    if (!this.params.coreDrums.enabled) return;

    while (now >= this.nextStepTime) {
      const totalSteps = pat.totalSteps;
      const step = this.current16thStep % totalSteps;
      this.telemetry.currentStep = step;

      // On Step 0 of each bar, advance the 4-Bar Chord Progression
      if (step === 0) {
        this.currentBarInProgression =
          this.totalBarsElapsed % activeProgression.length;
        this.applyChordProgressionBar(this.currentBarInProgression, now);
      }

      const chord =
        activeProgression[this.currentBarInProgression] ||
        activeProgression[0];
      const bassScaleRatio = this.params.subBass.baseFreq / 41.2; // Relative to E1 (41.2Hz)
      const isTripletMode = pat.stepsPerBeat === 3;

      // 0. Sub-Bass & Reese Sequencer
      if (this.params.subBass.enabled) {
        const reesePat = pat.reesePulse || DRUM_PATTERNS.astralDrift.reesePulse!;
        const pulseVel = reesePat[step % reesePat.length] ?? 0;
        if (pulseVel > 0) {
          // On the last beat of the bar (steps 12..15), play the turnaround bass note
          const isTurnaround = step >= totalSteps - pat.stepsPerBeat;
          const subHz =
            (isTurnaround ? chord.turnaroundSubHz : chord.subRootHz) * bassScaleRatio;
          const reeseHz =
            (isTurnaround ? chord.turnaroundReeseHz : chord.reeseRootHz) * bassScaleRatio;
          this.triggerReeseBassPulse(subHz, reeseHz, pulseVel);
        }
      }

      // 1. Kick (triggers sub kick + automatic sidechain pump)
      if (this.params.coreDrums.kickEnabled && pat.kick[step] > 0) {
        this.triggerKick(pat.kick[step]);
      }

      // 2. Closed & Open Hi-Hats
      if (this.params.coreDrums.hatsEnabled) {
        if (pat.openHat[step] > 0) {
          this.triggerHiHat(true, pat.openHat[step]);
        } else if (pat.closedHat[step] > 0) {
          this.triggerHiHat(false, pat.closedHat[step]);
        }
      }

      // 3. Snare / Rim Clap
      if (this.params.coreDrums.snareEnabled && pat.snare[step] > 0) {
        this.triggerSnare(pat.snare[step]);
      }

      // 4. Arpeggio Pluck (Crystalline Glass Bells in Weightless vs Crunchy Acid in Astral Drift)
      if (this.params.coreDrums.fmPluckEnabled && pat.pluck[step] > 0) {
        const rootScaleRatio = this.params.justDrone.rootFreq / 82.41;
        let noteHz: number;
        if (
          this.params.coreDrums.pattern === 'astralDrift' ||
          this.params.coreDrums.pattern === 'weightlessDnb'
        ) {
          const arpNotes = chord.arpNotesHz;
          const baseNote = arpNotes[step % arpNotes.length];
          const octaveMult = isWeightless
            ? step % 4 === 3
              ? 2.0
              : 1.0
            : step % 4 === 2
            ? 2.0
            : step % 4 === 3
            ? 0.5
            : 1.0;
          noteHz = baseNote * octaveMult * rootScaleRatio;
        } else {
          const noteIdx = (pat.pluck[step] - 1) % ACID_BASS_SCALE_HZ.length;
          noteHz = ACID_BASS_SCALE_HZ[noteIdx] * rootScaleRatio;
        }

        // In Weightless, alternate between sparse delicate chimes and full cascading 16th-note crystal bells
        const shouldTriggerInWeightless =
          !isWeightless ||
          this.currentBarInProgression >= 1 ||
          step % 2 === 0;

        if (shouldTriggerInWeightless) {
          const pluckVel = isTripletMode
            ? step % 3 === 2
              ? 0.96
              : 0.84
            : isWeightless
            ? step % 2 === 0
              ? 0.86
              : 0.64
            : step % 2 === 1
            ? 0.92
            : 0.78;
          const pluckDecay = isTripletMode ? 0.135 : isWeightless ? 0.28 : 0.21;
          this.triggerFmPluck(noteHz, pluckVel, pluckDecay);
        }
      }

      // 5. Soaring Lead / Angelic Vocal Formant Choir Melody (64-step 4-bar phrase)
      if (this.params.buchlaPing.enabled && !isTripletMode) {
        const melodyStepIdx = (this.currentBarInProgression * 16 + step) % 64;
        const activeMelody = isWeightless
          ? WEIGHTLESS_LEAD_MELODY_64
          : ASTRAL_LEAD_MELODY_64;
        const leadTarget = activeMelody[melodyStepIdx];
        const beatSec = 60.0 / Math.max(40, this.params.coreDrums.bpm);
        const stepSec = beatSec / 4;
        if (leadTarget > 0) {
          const leadScale = this.params.justDrone.rootFreq / 82.41;
          this.triggerGlidingLeadNote(
            leadTarget * leadScale,
            stepSec * (isWeightless ? 6.5 : 3.5)
          );
        } else if (leadTarget === -1 && this.leadVca) {
          this.leadVca.gain.setTargetAtTime(0.0, now, 0.08);
        }
      }

      // Advance clock: either 1/16th notes (4 per beat) with swing, or true 1/8th-note triplets (3 per beat)
      const beatSec = 60.0 / Math.max(40, this.params.coreDrums.bpm);
      const baseStepSec = beatSec / pat.stepsPerBeat;

      let swingOffset = 0;
      if (!isTripletMode) {
        const isOddStep = step % 2 === 1;
        swingOffset = isOddStep
          ? -baseStepSec * this.params.coreDrums.swing
          : baseStepSec * this.params.coreDrums.swing;
      }

      const nextStep = (this.current16thStep + 1) % totalSteps;
      if (nextStep === 0) {
        this.totalBarsElapsed += 1;
      }
      this.current16thStep = nextStep;
      this.nextStepTime += Math.max(0.035, baseStepSec + swingOffset);
    }
  }

  private updateFrequencyBands(): void {
    if (!this.analyser || !this.isRunning || !this.ctx) {
      this.smoothedBands.sub = 0;
      this.smoothedBands.mid = 0;
      this.smoothedBands.high = 0;
      this.smoothedBands.rms = 0;
      this.smoothedBands.beatPulse = 0;
      this.smoothedBands.kickZoom = 0;
      this.smoothedBands.isPlaying = false;
      return;
    }

    const wallNow = performance.now() * 0.001;
    const now = this.ctx.state === 'running' ? this.ctx.currentTime : wallNow;
    const dt = Math.min(0.1, Math.max(0.001, wallNow - this.lastBandTickTime));
    this.lastBandTickTime = wallNow;

    const isExternalTrack = this.params.audioSource !== 'procedural';

    // Gentle exponential decay of percussion & synth note envelopes
    const envDecay = Math.exp(-dt * 3.6);
    this.kickEnv *= envDecay;
    this.snareEnv *= envDecay;
    this.pluckEnv *= Math.exp(-dt * 4.2);
    this.hatEnv *= Math.exp(-dt * 4.8);

    this.analyser.getByteFrequencyData(this.freqBins);

    let subSum = 0;
    for (let i = 0; i <= 4; i++) subSum += this.freqBins[i];
    const rawSubNorm = subSum / (5 * 255);
    let fftSub = Math.pow(Math.max(0, rawSubNorm - 0.08) / 0.92, 1.1);

    let midSum = 0;
    for (let i = 5; i <= 20; i++) midSum += this.freqBins[i];
    const rawMidNorm = midSum / (16 * 255);
    let fftMid = Math.pow(Math.max(0, rawMidNorm - 0.06) / 0.94, 1.1);

    let highSum = 0;
    for (let i = 21; i <= 80; i++) highSum += this.freqBins[i];
    const rawHighNorm = Math.min(1.0, (highSum / (60 * 255)) * 2.1);
    let fftHigh = Math.pow(rawHighNorm, 1.08);

    const activeEl = this.usingCorsFallback
      ? this.corsFallbackAudioEl
      : this.refAudioEl;
    const isStreamBufferingOrAwaitingGesture =
      isExternalTrack &&
      rawSubNorm < 0.005 &&
      rawMidNorm < 0.005 &&
      ((this.usingCorsFallback &&
        this.corsFallbackAudioEl &&
        !this.corsFallbackAudioEl.paused) ||
        this.ctx.state === 'suspended' ||
        !activeEl ||
        activeEl.paused);

    // If playing a non-CORS external stream via corsFallbackAudioEl or while initial stream buffers/unlocks, synthesize dynamic musical band envelopes
    if (isStreamBufferingOrAwaitingGesture) {
      const fallbackBeatRate = Math.max(60, this.detectedTrackBpm) / 60.0;
      const t = wallNow * fallbackBeatRate;
      const beatWave = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2.0), 3.0);
      fftSub = 0.34 + beatWave * 0.48;
      fftMid = 0.28 + (0.5 + 0.5 * Math.sin(t * 1.618 + 0.8)) * 0.44;
      fftHigh = 0.22 + (0.5 + 0.5 * Math.cos(t * 3.14 + 1.7)) * 0.4;
    }

    // Spectral flux transient kick detector + real-time beat-interval BPM estimator for external tracks & song links
    const subFlux = Math.max(0, fftSub - this.prevFftSub);
    this.prevFftSub = fftSub;
    if (isExternalTrack && subFlux > 0.04) {
      this.kickEnv = Math.min(1.0, this.kickEnv + subFlux * 3.2);

      // Detect distinct kick/bass onset peaks to estimate external tune BPM in real time
      if (
        !this.usingCorsFallback &&
        subFlux > 0.052 &&
        subFlux >= this.prevSubFlux &&
        fftSub > 0.26
      ) {
        const sinceLastOnset = now - this.lastOnsetTimeSec;
        if (sinceLastOnset >= 0.28) {
          if (sinceLastOnset <= 1.85 && this.lastOnsetTimeSec > 0) {
            let candidateBpm = 60.0 / sinceLastOnset;
            // Fold half-time or double-time intervals toward the natural 75-180 BPM musical range
            while (candidateBpm < 72) candidateBpm *= 2.0;
            while (candidateBpm > 182) candidateBpm *= 0.5;

            // Keep octave consistency with known high-tempo tracks (e.g. Weightless 174 BPM)
            const seedBpm = estimateSeedBpmFromTrack(
              this.currentRefTrackUrl,
              this.telemetry.trackTitle,
              0
            );
            if (seedBpm >= 155 && candidateBpm < 105) {
              candidateBpm *= 2.0;
            } else if (seedBpm > 0 && seedBpm <= 102 && candidateBpm > 155) {
              candidateBpm *= 0.5;
            }

            if (candidateBpm >= 65 && candidateBpm <= 190) {
              this.onsetIntervalsSec.push(60.0 / candidateBpm);
              if (this.onsetIntervalsSec.length > 9) {
                this.onsetIntervalsSec.shift();
              }
              if (this.onsetIntervalsSec.length >= 3) {
                const sorted = [...this.onsetIntervalsSec].sort((a, b) => a - b);
                const medianInterval = sorted[Math.floor(sorted.length / 2)];
                const medianBpm = 60.0 / medianInterval;
                this.detectedTrackBpm +=
                  (medianBpm - this.detectedTrackBpm) * 0.22;
              }
            }
          }
          this.lastOnsetTimeSec = now;
        }
      }
    }
    this.prevSubFlux = subFlux;

    // Determine live effective BPM of the currently playing tune
    const effectiveBpm = isExternalTrack
      ? Math.max(55, Math.min(200, this.detectedTrackBpm))
      : Math.max(55, Math.min(200, this.params.coreDrums.bpm));

    // Advance BPM-synchronized musical groove phase (1 full cycle per 4-beat bar for smooth modulation)
    const beatsPerSec = effectiveBpm / 60.0;
    this.groovePhase += dt * beatsPerSec * Math.PI * 0.5;

    const combinedSub = isExternalTrack
      ? Math.min(1.0, fftSub * 0.95 + this.kickEnv * 0.35)
      : Math.min(1.0, fftSub * 0.72 + this.kickEnv * 0.52);

    const combinedMid = isExternalTrack
      ? Math.min(1.0, fftMid * 0.98)
      : Math.min(1.0, fftMid * 0.7 + this.pluckEnv * 0.42 + this.snareEnv * 0.35);

    const combinedHigh = isExternalTrack
      ? Math.min(1.0, fftHigh * 0.98)
      : Math.min(1.0, fftHigh * 0.68 + this.hatEnv * 0.42 + this.snareEnv * 0.25);

    // Frame-rate-independent liquid envelope followers (smooth attack, lush slow release) so music never causes visual jitter
    const subTarget = Math.tanh(combinedSub * this.params.audioReactive.subPumpStargate);
    const midTarget = Math.tanh(combinedMid * 1.05);
    const highTarget = Math.tanh(combinedHigh * this.params.audioReactive.highShiftPlasma);

    const attackAlpha = 1.0 - Math.exp(-dt * 4.2);
    const releaseAlpha = 1.0 - Math.exp(-dt * 2.0);

    const subLerp = subTarget > this.smoothedBands.sub ? attackAlpha : releaseAlpha;
    const midLerp = midTarget > this.smoothedBands.mid ? attackAlpha : releaseAlpha;
    const highLerp = highTarget > this.smoothedBands.high ? attackAlpha : releaseAlpha;

    this.smoothedBands.sub += (subTarget - this.smoothedBands.sub) * subLerp;
    this.smoothedBands.mid += (midTarget - this.smoothedBands.mid) * midLerp;
    this.smoothedBands.high += (highTarget - this.smoothedBands.high) * highLerp;

    const rawBeat = isExternalTrack
      ? Math.min(1.0, fftSub * 0.65 + this.kickEnv * 0.65)
      : Math.min(
          1.0,
          this.kickEnv * 0.65 +
            this.snareEnv * 0.4 +
            this.pluckEnv * 0.32 +
            fftSub * 0.35
        );
    const beatAttack = 1.0 - Math.exp(-dt * 4.8);
    const beatRelease = 1.0 - Math.exp(-dt * 2.2);
    const beatLerp = rawBeat > this.smoothedBands.beatPulse ? beatAttack : beatRelease;
    this.smoothedBands.beatPulse += (rawBeat - this.smoothedBands.beatPulse) * beatLerp;

    // Fast-attack (~38ms), elastic-release (~165ms) Kick + Bassline optical zoom envelope
    // Responds both to sharp kick transients (this.kickEnv / subFlux) and sustained heavy basslines (fftSub)
    const bassLineSustain = Math.pow(Math.max(0, fftSub - 0.14) / 0.86, 1.15);
    const rawKickZoom = Math.min(
      1.35,
      (this.kickEnv * 0.92 + bassLineSustain * 0.85) *
        Math.max(0.5, this.params.audioReactive.subPumpStargate * 0.85)
    );
    const zoomAttack = 1.0 - Math.exp(-dt * 26.0);
    const zoomRelease = 1.0 - Math.exp(-dt * 6.0);
    const zoomLerp =
      rawKickZoom > this.smoothedBands.kickZoom ? zoomAttack : zoomRelease;
    this.smoothedBands.kickZoom +=
      (rawKickZoom - this.smoothedBands.kickZoom) * zoomLerp;

    const bpmScale = this.params.audioReactive.bpmLinksDrive
      ? computeBpmDriveScale(effectiveBpm)
      : 1.0;
    const effectiveAnimDrive = Math.min(
      3.5,
      Math.max(0.05, this.params.audioReactive.animDrive * bpmScale)
    );

    this.smoothedBands.rms =
      this.smoothedBands.sub * 0.45 +
      this.smoothedBands.mid * 0.35 +
      this.smoothedBands.high * 0.2;
    this.smoothedBands.groovePhase = this.groovePhase;
    this.smoothedBands.isPlaying = this.isRunning;
    this.smoothedBands.reactivity = this.params.audioReactive.enabled
      ? this.params.audioReactive.reactivity
      : 0.0;
    this.smoothedBands.musicDrivesTime = this.params.audioReactive.musicDrivesTime;
    this.smoothedBands.bpm = effectiveBpm;
    this.smoothedBands.bpmLinksDrive = this.params.audioReactive.bpmLinksDrive;
    this.smoothedBands.animDrive = effectiveAnimDrive;

    this.telemetry.bandSub = Math.min(1.0, this.smoothedBands.sub);
    this.telemetry.bandMid = Math.min(1.0, this.smoothedBands.mid);
    this.telemetry.bandHigh = Math.min(1.0, this.smoothedBands.high);
    this.telemetry.effectiveBpm = Math.round(effectiveBpm);
    this.telemetry.effectiveAnimDrive = effectiveAnimDrive;
  }

  private startProceduralLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    const tick = () => {
      if (!this.isRunning || !this.ctx) return;

      const now = this.ctx.currentTime;
      const elapsed = now - this.startTime;
      const cursorBoost = this.params.cursorCoupling ? this.cursorR * 0.35 : 0.0;

      // Advance 16-step Kicks, Hi-Hats, Crunchy Snare, Reese Bass, Acid Pluck & Gliding Lead
      this.stepCoreDrumSequencer(now);

      // Extract real-time FFT frequency bins for Audio-Reactive GLSL Shaders
      this.updateFrequencyBands();

      // Modulation Matrix telemetry
      const lfo2Wave = Math.sin(elapsed * Math.PI * 2 * this.params.modMatrix.lfo2RateHz);
      const instantLfo1Rate = Math.max(
        0.02,
        this.params.modMatrix.lfo1BaseRateHz +
          lfo2Wave * this.params.modMatrix.lfo2ToLfo1RateDepth
      );
      const instantDepthScale =
        1.0 + lfo2Wave * this.params.modMatrix.lfo2ToLfo1AmpDepth * 0.65;
      const lfo1Wave = Math.sin(elapsed * Math.PI * 2 * instantLfo1Rate);
      const filterModOffset = this.params.modMatrix.enabled
        ? lfo1Wave * this.params.modMatrix.lfo1FilterDepthHz * instantDepthScale
        : 0;

      this.telemetry.lfo2OutNorm = lfo2Wave;
      this.telemetry.lfo1InstantRateHz = instantLfo1Rate;
      this.telemetry.filterCrossModHz = filterModOffset;

      // 0. Heavy Crunchy Reese Bass LFO Modulation (adds organic breathing on top of step bites)
      if (this.subFilter && !this.params.coreDrums.enabled) {
        const subNorm =
          0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2 * this.params.subBass.lfoRate);
        const subCutoff = Math.max(
          140,
          240 +
            subNorm * 420 * (1 + cursorBoost * 0.4) +
            filterModOffset * 0.25
        );
        this.subFilter.frequency.setTargetAtTime(subCutoff, now, 0.06);
        this.telemetry.subCutoffHz = subCutoff;
      }

      // 1. Tape Pad telemetry
      const drift =
        Math.sin(elapsed * Math.PI * 2 * 0.11) * this.params.tapePad.wowDriftHz * 0.55 +
        Math.sin(elapsed * Math.PI * 2 * 0.16 + 1.3) *
          this.params.tapePad.wowDriftHz *
          0.45;
      this.telemetry.tapePitchOffsetHz = drift;
      this.telemetry.tapePanPos =
        Math.sin(elapsed * Math.PI * 2 * this.params.stereoMotion.autoPanRateHz) *
        this.params.stereoMotion.autoPanWidth;

      if (this.tapeFilter && this.params.cursorCoupling) {
        const targetCutoff = Math.min(
          3200,
          Math.max(350, this.params.tapePad.cutoffHz * (1 + this.cursorR * 0.45))
        );
        this.tapeFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);
      }

      // 2. If sequencer is paused, still allow periodic ambient lead/crystal pings
      if (
        this.params.audioSource === 'procedural' &&
        !this.params.coreDrums.enabled &&
        this.params.buchlaPing.enabled &&
        now >= this.nextPingTime
      ) {
        this.triggerBuchlaPing();
        const variance = 0.65 + Math.random() * 0.7;
        this.nextPingTime =
          now + Math.max(0.35, this.params.buchlaPing.intervalSec * variance * 3.0);
      }

      // 3. Stochastic Ocean Waves
      if (this.oceanFilter && this.oceanGain && this.oceanPanner) {
        if (Math.random() < 0.06) {
          this.oceanJitterTarget = (Math.random() * 2 - 1) * 0.18;
        }
        this.oceanJitterValue += (this.oceanJitterTarget - this.oceanJitterValue) * 0.03;

        const cycleFreq = 1.0 / Math.max(2.0, this.params.oceanWaves.cycleSec);
        const primaryWave = Math.sin(elapsed * Math.PI * 2 * cycleFreq);
        const secondaryWave =
          0.35 * Math.sin(elapsed * Math.PI * 2 * cycleFreq * 1.618 + 0.9);
        const rawNorm =
          0.5 + 0.38 * primaryWave + 0.12 * secondaryWave + this.oceanJitterValue;
        const swellNorm = Math.min(1.0, Math.max(0.0, rawNorm));

        const minF = this.params.oceanWaves.minCutoffHz;
        const maxF = Math.max(minF + 40, this.params.oceanWaves.maxCutoffHz);
        const cutoff = minF + swellNorm * (maxF - minF);

        this.oceanFilter.frequency.setTargetAtTime(cutoff, now, 0.08);

        if (this.params.oceanWaves.enabled) {
          const coupledGain =
            this.params.oceanWaves.gain * (0.18 + 0.82 * Math.pow(swellNorm, 1.35));
          this.oceanGain.gain.setTargetAtTime(coupledGain, now, 0.08);
        }

        const pan =
          Math.sin(elapsed * Math.PI * 2 * (cycleFreq * 0.5)) *
            this.params.oceanWaves.stereoWidth *
            0.75 +
          (this.params.cursorCoupling ? this.cursorX * 0.25 : 0);
        this.oceanPanner.pan.setTargetAtTime(
          Math.min(1, Math.max(-1, pan)),
          now,
          0.1
        );

        this.telemetry.oceanCutoffHz = cutoff;
        this.telemetry.oceanSwellNorm = swellNorm;
        this.telemetry.oceanPan = pan;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }
}
