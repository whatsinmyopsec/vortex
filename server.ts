import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 3000;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function inferAudioContentType(urlStr: string, upstreamType: string | null): string {
  const lowerUrl = urlStr.toLowerCase().split('?')[0];
  if (lowerUrl.endsWith('.m4a') || lowerUrl.endsWith('.mp4')) {
    return 'audio/mp4';
  }
  if (lowerUrl.endsWith('.mp3')) {
    return 'audio/mpeg';
  }
  if (lowerUrl.endsWith('.wav')) {
    return 'audio/wav';
  }
  if (lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.oga')) {
    return 'audio/ogg';
  }
  if (lowerUrl.endsWith('.flac')) {
    return 'audio/flac';
  }
  if (
    upstreamType &&
    upstreamType !== 'application/octet-stream' &&
    upstreamType !== 'binary/octet-stream'
  ) {
    return upstreamType;
  }
  return 'audio/mpeg';
}

interface CachedSunoAudio {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
}

const sunoAudioCache = new Map<string, CachedSunoAudio>();
const sunoInflightRequests = new Map<string, Promise<CachedSunoAudio>>();
const MAX_SUNO_CACHE_ENTRIES = 6;

function extractSunoClipUuid(input: string): string | null {
  const match = input.match(
    /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
  );
  return match ? match[1].toLowerCase() : null;
}

/**
 * Losslessly remuxes Suno's decrypted m4a-opus stream into a standard Ogg Opus
 * container (`audio/ogg`) in ~120ms so HTMLAudioElement and Web Audio decodeAudioData
 * play it across all browsers without needing a custom WASM demuxer.
 */
function remuxToStandardOggOpus(inputBuf: Buffer): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  return new Promise((resolve) => {
    try {
      const ff = spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        'pipe:0',
        '-vn',
        '-c:a',
        'copy',
        '-f',
        'ogg',
        'pipe:1',
      ]);
      const chunks: Buffer[] = [];
      ff.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      ff.on('error', () => {
        resolve({ buffer: inputBuf, contentType: 'audio/mp4' });
      });
      ff.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: 'audio/ogg',
          });
        } else {
          resolve({ buffer: inputBuf, contentType: 'audio/mp4' });
        }
      });
      ff.stdin.on('error', () => {});
      ff.stdin.end(inputBuf);
    } catch {
      resolve({ buffer: inputBuf, contentType: 'audio/mp4' });
    }
  });
}

/**
 * Fetches and decrypts a Suno clip's AES-CTR encrypted .m4a stream using Suno's
 * anonymous playback rights endpoint (/api/mango/rights), with automatic fallback
 * to Suno's unencrypted .mp4 stream if needed.
 */
async function getDecryptedSunoAudioBuffer(
  clipId: string,
  encryptedUrl?: string
): Promise<CachedSunoAudio> {
  const normalizedId = clipId.toLowerCase();
  const cached = sunoAudioCache.get(normalizedId);
  if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
    return cached;
  }

  const existingInflight = sunoInflightRequests.get(normalizedId);
  if (existingInflight) {
    return existingInflight;
  }

  const task = (async (): Promise<CachedSunoAudio> => {
    const m4aUrl =
      encryptedUrl ||
      `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${normalizedId}.m4a`;

    try {
      const [rightsRes, mediaRes] = await Promise.all([
        fetch('https://studio-api.prod.suno.com/api/mango/rights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://suno.com',
            Referer: 'https://suno.com/',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          body: JSON.stringify({
            content_params: { content_id: normalizedId, content_type: 'clip' },
          }),
        }),
        fetch(m4aUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        }),
      ]);

      if (rightsRes.ok && mediaRes.ok) {
        const rightsData = (await rightsRes.json()) as {
          key?: string;
          iv?: string;
          glt?: string;
        };
        const encArrayBuf = await mediaRes.arrayBuffer();
        const encBytes = new Uint8Array(encArrayBuf);

        // Check if already unencrypted ISO BMFF ('ftyp' at bytes 4..7)
        if (
          encBytes.length >= 8 &&
          encBytes[4] === 0x66 &&
          encBytes[5] === 0x74 &&
          encBytes[6] === 0x79 &&
          encBytes[7] === 0x70
        ) {
          const remuxed = await remuxToStandardOggOpus(
            Buffer.from(encArrayBuf)
          );
          const entry: CachedSunoAudio = {
            buffer: remuxed.buffer,
            contentType: remuxed.contentType,
            timestamp: Date.now(),
          };
          sunoAudioCache.set(normalizedId, entry);
          return entry;
        }

        if (rightsData.key && rightsData.iv && rightsData.glt) {
          const gltBytes = new TextEncoder().encode(rightsData.glt);
          const gltHash = await crypto.subtle.digest('SHA-256', gltBytes);
          const kek = await crypto.subtle.importKey(
            'raw',
            gltHash,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
          );

          const wrappedKey = Buffer.from(rightsData.key, 'base64');
          const wrappedIv = Buffer.from(rightsData.iv, 'base64');
          const aad = new TextEncoder().encode(normalizedId);

          const rawKey = new Uint8Array(
            await crypto.subtle.decrypt(
              {
                name: 'AES-GCM',
                iv: wrappedKey.slice(0, 12),
                additionalData: aad,
              },
              kek,
              wrappedKey.slice(12)
            )
          );
          const rawIv = new Uint8Array(
            await crypto.subtle.decrypt(
              {
                name: 'AES-GCM',
                iv: wrappedIv.slice(0, 12),
                additionalData: aad,
              },
              kek,
              wrappedIv.slice(12)
            )
          );

          const ctrKey = await crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-CTR' },
            false,
            ['decrypt']
          );

          const decryptedBuf = await crypto.subtle.decrypt(
            { name: 'AES-CTR', counter: rawIv, length: 128 },
            ctrKey,
            encBytes
          );

          const remuxed = await remuxToStandardOggOpus(
            Buffer.from(decryptedBuf)
          );

          const entry: CachedSunoAudio = {
            buffer: remuxed.buffer,
            contentType: remuxed.contentType,
            timestamp: Date.now(),
          };

          if (sunoAudioCache.size >= MAX_SUNO_CACHE_ENTRIES) {
            const oldestKey = sunoAudioCache.keys().next().value;
            if (oldestKey) sunoAudioCache.delete(oldestKey);
          }
          sunoAudioCache.set(normalizedId, entry);
          return entry;
        }
      }
    } catch {
      // Fall through to unencrypted MP4 fallback below
    }

    // Fallback: fetch unencrypted Suno MP4 stream (contains standard AAC mp4a audio track)
    const mp4FallbackUrl = `https://cdn1.suno.ai/${normalizedId}.mp4`;
    const mp4Res = await fetch(mp4FallbackUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (!mp4Res.ok) {
      throw new Error(`Suno upstream returned ${mp4Res.status}`);
    }
    const mp4Buf = Buffer.from(await mp4Res.arrayBuffer());
    const entry: CachedSunoAudio = {
      buffer: mp4Buf,
      contentType: 'audio/mp4',
      timestamp: Date.now(),
    };
    if (sunoAudioCache.size >= MAX_SUNO_CACHE_ENTRIES) {
      const oldestKey = sunoAudioCache.keys().next().value;
      if (oldestKey) sunoAudioCache.delete(oldestKey);
    }
    sunoAudioCache.set(normalizedId, entry);
    return entry;
  })();

  sunoInflightRequests.set(normalizedId, task);
  try {
    return await task;
  } finally {
    sunoInflightRequests.delete(normalizedId);
  }
}

async function resolveExternalSongUrl(rawInput: string): Promise<{
  ok: boolean;
  streamUrl: string;
  title: string;
  error?: string;
}> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false, streamUrl: '', title: '', error: 'Empty URL' };
  }

  // Local asset pass-through
  if (trimmed.startsWith('/')) {
    return {
      ok: true,
      streamUrl: trimmed,
      title: trimmed.split('/').pop() || 'Studio Master',
    };
  }

  // 1. Suno shortlinks (https://suno.com/s/...) or song links (https://suno.com/song/...)
  if (/(?:suno\.com|suno\.ai)\//i.test(trimmed)) {
    try {
      const response = await fetch(trimmed, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const finalUrl = response.url || trimmed;
      const contentType = response.headers.get('content-type') || '';

      // If the URL itself is already a direct audio stream
      if (contentType.startsWith('audio/') || /\.(mp3|m4a|wav|ogg)(\?|$)/i.test(finalUrl)) {
        const directUuid = extractSunoClipUuid(finalUrl);
        if (directUuid) {
          void getDecryptedSunoAudioBuffer(directUuid, finalUrl).catch(() => {});
        }
        return {
          ok: true,
          streamUrl: finalUrl,
          title: 'Suno AI Track',
        };
      }

      const html = await response.text();

      // Extract song title from og:title or <title>
      let title = 'Suno Track';
      const ogTitleMatch =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = decodeHtmlEntities(ogTitleMatch[1].trim());
      } else {
        const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleTagMatch && titleTagMatch[1]) {
          title = decodeHtmlEntities(
            titleTagMatch[1].replace(/\s*\|\s*Suno\s*$/i, '').trim()
          );
        }
      }

      // Extract real audio URL from Suno page HTML (excluding sil-100.mp3 silent placeholder)
      const audioMatches =
        html.match(/https:\/\/[^"'\s\\]+\.(?:m4a|mp3)/gi) || [];
      const validAudioUrls = audioMatches.filter(
        (u) => !u.includes('sil-100.mp3') && !u.includes('silence')
      );

      // Prefer CloudFront .m4a clip URL or cdn1/cdn2.suno.ai URL found in the page
      const cloudfrontM4a = validAudioUrls.find(
        (u) => u.includes('cloudfront.net') && u.endsWith('.m4a')
      );

      const uuid =
        extractSunoClipUuid(finalUrl) ||
        (cloudfrontM4a ? extractSunoClipUuid(cloudfrontM4a) : null) ||
        extractSunoClipUuid(html);

      if (uuid) {
        const clipStreamUrl =
          cloudfrontM4a ||
          `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${uuid}.m4a`;
        // Kick off decryption + Ogg remuxing in background so resolve-song returns immediately
        void getDecryptedSunoAudioBuffer(uuid, clipStreamUrl).catch(() => {});
        return {
          ok: true,
          streamUrl: clipStreamUrl,
          title: `${title} · Suno`,
        };
      }

      if (validAudioUrls.length > 0) {
        return {
          ok: true,
          streamUrl: validAudioUrls[0],
          title: `${title} · Suno`,
        };
      }
    } catch (err) {
      return {
        ok: false,
        streamUrl: '',
        title: 'Suno Track',
        error: `Failed to resolve Suno link: ${(err as Error).message}`,
      };
    }
  }

  // 2. Dropbox share links
  if (trimmed.includes('dropbox.com/')) {
    let direct = trimmed
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dropbox.com', 'dl.dropboxusercontent.com');
    direct = direct.replace(/[?&]dl=0\b/, '');
    const fileName = trimmed.split('?')[0].split('/').pop() || 'Dropbox Track';
    return {
      ok: true,
      streamUrl: direct,
      title: decodeURIComponent(fileName).replace(/\.[^/.]+$/, ''),
    };
  }

  // 3. GitHub blob links
  const ghMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/
  );
  if (ghMatch) {
    const [, user, repo, rest] = ghMatch;
    const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${rest}`;
    const fileName = rest.split('/').pop() || 'GitHub Audio';
    return {
      ok: true,
      streamUrl: rawUrl,
      title: decodeURIComponent(fileName).replace(/\.[^/.]+$/, ''),
    };
  }

  // 4. Google Drive file share links
  const gdriveMatch = trimmed.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (gdriveMatch) {
    const fileId = gdriveMatch[1];
    return {
      ok: true,
      streamUrl: `https://docs.google.com/uc?export=download&id=${fileId}`,
      title: `Google Drive Audio (${fileId.slice(0, 6)})`,
    };
  }

  // 5. Generic URL: check if it's an HTML page with og:audio or embedded audio URL, or a direct stream
  try {
    const parsed = new URL(trimmed);
    const lastSeg = parsed.pathname.split('/').filter(Boolean).pop() || '';
    const defaultTitle =
      decodeURIComponent(lastSeg)
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim() ||
      parsed.hostname ||
      'Linked Audio Stream';

    // If it already ends with an audio extension or is a known Icecast stream, return immediately without probing full stream
    if (
      /\.(mp3|m4a|wav|ogg|oga|flac|aac)(\?|$)/i.test(trimmed) ||
      trimmed.includes('somafm.com') ||
      /-(?:128|192|256|320)-mp3$/i.test(trimmed)
    ) {
      return {
        ok: true,
        streamUrl: trimmed,
        title: defaultTitle,
      };
    }

    // Probe with Range: bytes=0-16383 so we don't hang on infinite Icecast radio streams
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    try {
      const probeRes = await fetch(trimmed, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Range: 'bytes=0-16383',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const ct = (probeRes.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html')) {
        const html = await probeRes.text();
        const ogAudioMatch =
          html.match(/<meta[^>]+property=["']og:audio(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:audio(?::secure_url)?["']/i);
        const ogTitleMatch =
          html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
        const pageTitle = ogTitleMatch?.[1]
          ? decodeHtmlEntities(ogTitleMatch[1].trim())
          : defaultTitle;

        if (ogAudioMatch && ogAudioMatch[1]) {
          return {
            ok: true,
            streamUrl: ogAudioMatch[1],
            title: pageTitle,
          };
        }

        const directMediaMatch = html.match(
          /https:\/\/[^"'\s\\]+\.(?:m4a|mp3|wav|ogg)/i
        );
        if (directMediaMatch && directMediaMatch[0]) {
          return {
            ok: true,
            streamUrl: directMediaMatch[0],
            title: pageTitle,
          };
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }

    return {
      ok: true,
      streamUrl: trimmed,
      title: defaultTitle,
    };
  } catch {
    return {
      ok: false,
      streamUrl: '',
      title: '',
      error: 'Invalid URL format.',
    };
  }
}

async function startServer() {
  const app = express();

  // 1. Resolve song sharing links (Suno shortlinks, Suno song links, Dropbox, etc.)
  app.get('/api/resolve-song', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!rawUrl.trim()) {
      res.status(400).json({ ok: false, error: 'Missing url parameter' });
      return;
    }

    const result = await resolveExternalSongUrl(rawUrl);
    if (!result.ok || !result.streamUrl) {
      res.status(422).json({
        ok: false,
        error:
          result.error ||
          'Could not extract a playable audio stream from this link.',
      });
      return;
    }

    const isLocalAsset = result.streamUrl.startsWith('/');
    const proxiedUrl = isLocalAsset
      ? result.streamUrl
      : `/api/proxy-audio?url=${encodeURIComponent(result.streamUrl)}`;

    res.json({
      ok: true,
      originalUrl: rawUrl,
      streamUrl: result.streamUrl,
      proxiedUrl,
      title: result.title,
    });
  });

  // 2. Proxy external audio streams with CORS + Range support for Web Audio AnalyserNode FFT
  app.get('/api/proxy-audio', async (req: Request, res: Response) => {
    const targetUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      res.status(400).send('Invalid or missing target audio URL');
      return;
    }

    try {
      // Handle Suno AES-CTR encrypted .m4a clips by decrypting server-side and serving with Range support
      const isSunoClip =
        targetUrl.includes('/1/clip/') ||
        targetUrl.includes('suno.ai') ||
        targetUrl.includes('suno.com');
      const sunoUuid = isSunoClip ? extractSunoClipUuid(targetUrl) : null;

      if (sunoUuid) {
        const decrypted = await getDecryptedSunoAudioBuffer(sunoUuid, targetUrl);
        const totalLength = decrypted.buffer.length;
        const rangeHeader =
          typeof req.headers.range === 'string' ? req.headers.range : '';

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', decrypted.contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=1800');

        if (rangeHeader && rangeHeader.startsWith('bytes=')) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10) || 0;
          const end =
            parts[1] && parts[1].length > 0
              ? Math.min(totalLength - 1, parseInt(parts[1], 10))
              : totalLength - 1;

          if (start >= totalLength || start > end) {
            res.status(416);
            res.setHeader('Content-Range', `bytes */${totalLength}`);
            res.end();
            return;
          }

          const chunk = decrypted.buffer.subarray(start, end + 1);
          res.status(206);
          res.setHeader(
            'Content-Range',
            `bytes ${start}-${end}/${totalLength}`
          );
          res.setHeader('Content-Length', String(chunk.length));
          res.end(chunk);
          return;
        }

        res.status(200);
        res.setHeader('Content-Length', String(totalLength));
        res.end(decrypted.buffer);
        return;
      }

      const upstreamHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      };
      if (typeof req.headers.range === 'string') {
        upstreamHeaders['Range'] = req.headers.range;
      }

      const upstream = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: upstreamHeaders,
      });

      if (!upstream.ok && upstream.status !== 206) {
        res
          .status(upstream.status)
          .send(`Upstream audio server returned ${upstream.status}`);
        return;
      }

      const contentType = inferAudioContentType(
        targetUrl,
        upstream.headers.get('content-type')
      );

      res.status(upstream.status);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');

      const contentLength = upstream.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      const cacheControl = upstream.headers.get('cache-control');
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl);
      }

      if (!upstream.body) {
        res.end();
        return;
      }

      const reader = upstream.body.getReader();
      let clientClosed = false;
      req.on('close', () => {
        clientClosed = true;
        void reader.cancel().catch(() => {});
      });

      try {
        while (!clientClosed) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && !clientClosed) {
            res.write(value);
          }
        }
        if (!clientClosed) {
          res.end();
        }
      } catch {
        if (!res.headersSent) {
          res.status(502).end();
        } else {
          res.end();
        }
      }
    } catch (err) {
      if (!res.headersSent) {
        res
          .status(502)
          .send(`Audio proxy error: ${(err as Error).message}`);
      }
    }
  });

  // 3. Remux/transcode browser MediaRecorder video into universal H.264 + AAC MP4 so audio plays in all media players
  app.post(
    '/api/remux-mp4',
    express.raw({ type: '*/*', limit: '80mb' }),
    async (req: Request, res: Response) => {
      const inputBuf = req.body as Buffer;
      if (!Buffer.isBuffer(inputBuf) || inputBuf.length === 0) {
        res.status(400).send('Empty video payload');
        return;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const inPath = path.join(os.tmpdir(), `vortex-in-${id}.bin`);
      const outPath = path.join(os.tmpdir(), `vortex-out-${id}.mp4`);

      const cleanup = () => {
        try {
          if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
        } catch {}
        try {
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        } catch {}
      };

      const runFfmpeg = (args: string[]): Promise<void> =>
        new Promise((resolve, reject) => {
          const ff = spawn('ffmpeg', args);
          ff.on('error', reject);
          ff.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited with code ${code}`));
          });
        });

      try {
        await fs.promises.writeFile(inPath, inputBuf);

        // Fast path (~80ms): if browser recorded H.264 video in MP4/MKV, copy video stream directly and encode audio to AAC
        try {
          await runFfmpeg([
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            inPath,
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-ac',
            '2',
            '-movflags',
            '+faststart',
            outPath,
          ]);
        } catch {
          // Fallback if input video codec is VP8/VP9 (WebM): fast transcode to H.264 + AAC
          await runFfmpeg([
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            inPath,
            '-vf',
            "scale='min(1280,trunc(iw/2)*2)':trunc(ow/dar/2)*2",
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            '-crf',
            '20',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-ac',
            '2',
            '-movflags',
            '+faststart',
            outPath,
          ]);
        }

        const mp4Buf = await fs.promises.readFile(outPath);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', String(mp4Buf.length));
        res.send(mp4Buf);
      } catch {
        // Fallback: return original buffer if ffmpeg unavailable
        res.setHeader('Content-Type', 'video/mp4');
        res.send(inputBuf);
      } finally {
        cleanup();
      }
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
