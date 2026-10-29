/**
 * Free Cloudflare Worker for Vortex — Interactive Polar Shader Lab
 * Provides /api/resolve-song and /api/proxy-audio with CORS headers so
 * Suno shortlinks (https://suno.com/s/...), Dropbox, Google Drive, GitHub,
 * and external audio streams work with full Web Audio API FFT spectrum
 * analysis on GitHub Pages.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
  'Access-Control-Expose-Headers':
    'Content-Length, Content-Range, Accept-Ranges, Content-Type',
};

const KNOWN_SUNO_SHORTLINKS = {
  lX9vCx1RSB4d9bOP: {
    uuid: '6500d12d-cabc-4b2e-93fe-baa9df341554',
    title: 'Peak Satisfaction (The Unboxing) · Suno',
  },
  '35tZN3FK6QJCpt0S': {
    uuid: '8492f898-13a7-4c67-a33d-684790e3aef3',
    title: 'Bro what the ohio rizzler mew gyatt fanu · Suno',
  },
};

const UUID_REGEX =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function resolveViaMicrolink(targetUrl) {
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const finalUrl = json?.data?.url || targetUrl;
    const rawTitle = json?.data?.title || 'Suno Track';
    const uuidMatch =
      finalUrl.match(UUID_REGEX) ||
      JSON.stringify(json?.data || {}).match(UUID_REGEX);
    if (uuidMatch) {
      const cleanTitle = rawTitle.replace(/\s*\|\s*Suno\s*$/i, '').trim();
      return {
        streamUrl: `https://cdn1.suno.ai/${uuidMatch[0].toLowerCase()}.mp4`,
        title: `${cleanTitle} · Suno`,
      };
    }
  } catch {
    // Ignore Microlink errors
  }
  return null;
}

async function resolveSongTarget(rawUrl) {
  const trimmed = (rawUrl || '').trim();

  // 1. Known Suno shortlinks (instant resolution)
  const shortMatch = trimmed.match(
    /(?:suno\.com|suno\.ai)\/s\/([a-zA-Z0-9_-]+)/i
  );
  if (shortMatch && KNOWN_SUNO_SHORTLINKS[shortMatch[1]]) {
    const known = KNOWN_SUNO_SHORTLINKS[shortMatch[1]];
    return {
      streamUrl: `https://cdn1.suno.ai/${known.uuid}.mp4`,
      title: known.title,
    };
  }

  // 2. Direct Suno UUID in URL (e.g. suno.com/song/<uuid>)
  if (/(?:suno\.com|suno\.ai)\//i.test(trimmed)) {
    const directUuid = trimmed.match(UUID_REGEX);
    if (directUuid) {
      const microlink = await resolveViaMicrolink(trimmed);
      return {
        streamUrl: `https://cdn1.suno.ai/${directUuid[0].toLowerCase()}.mp4`,
        title: microlink?.title || `Suno Track (${directUuid[0].slice(0, 8)})`,
      };
    }
  }

  // 3. Dropbox share links
  if (trimmed.includes('dropbox.com/')) {
    const direct = trimmed
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dropbox.com', 'dl.dropboxusercontent.com')
      .replace(/[?&]dl=0\b/, '');
    const fileName = trimmed.split('?')[0].split('/').pop() || 'Dropbox Track';
    return {
      streamUrl: direct,
      title: decodeURIComponent(fileName).replace(/\.[^/.]+$/, ''),
    };
  }

  // 4. GitHub blob links
  const ghMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/
  );
  if (ghMatch) {
    const [, user, repo, rest] = ghMatch;
    const raw = `https://raw.githubusercontent.com/${user}/${repo}/${rest}`;
    const fileName = rest.split('/').pop() || 'GitHub Audio';
    return {
      streamUrl: raw,
      title: decodeURIComponent(fileName).replace(/\.[^/.]+$/, ''),
    };
  }

  // 5. Google Drive file share links
  const gdriveMatch = trimmed.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (gdriveMatch) {
    const fileId = gdriveMatch[1];
    return {
      streamUrl: `https://docs.google.com/uc?export=download&id=${fileId}`,
      title: `Google Drive Audio (${fileId.slice(0, 6)})`,
    };
  }

  // 6. Follow redirects & inspect HTML/OpenGraph tags
  let currentUrl = trimmed;
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Twitterbot/1.0; +https://help.twitter.com/en/rules-and-policies/twitter-crawler)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (loc) {
        currentUrl = new URL(loc, currentUrl).toString();
        continue;
      }
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (
      contentType.startsWith('audio/') ||
      contentType === 'application/ogg' ||
      contentType === 'video/mp4'
    ) {
      return { streamUrl: currentUrl, title: 'Direct Audio Stream' };
    }

    const html = await res.text();
    let title = 'Suno Track';
    const ogTitle =
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
      ) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);

    if (ogTitle && ogTitle[1]) {
      title = decodeHtmlEntities(ogTitle[1].replace(/\s*\|\s*Suno\s*$/i, ''));
    }

    const uuidMatch =
      currentUrl.match(UUID_REGEX) || html.match(UUID_REGEX);
    if (uuidMatch) {
      return {
        streamUrl: `https://cdn1.suno.ai/${uuidMatch[0].toLowerCase()}.mp4`,
        title: `${title} · Suno`,
      };
    }

    const ogAudio =
      html.match(
        /<meta[^>]+property=["']og:audio(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:audio(?::secure_url)?["']/i
      );
    if (ogAudio && ogAudio[1]) {
      return { streamUrl: ogAudio[1], title };
    }
    break;
  }

  // 7. If Cloudflare Worker IP was challenged by Suno, fall back to Microlink
  if (/(?:suno\.com|suno\.ai)\//i.test(trimmed)) {
    const microlink = await resolveViaMicrolink(trimmed);
    if (microlink) return microlink;
  }

  const fallbackUuid = currentUrl.match(UUID_REGEX);
  if (fallbackUuid) {
    return {
      streamUrl: `https://cdn1.suno.ai/${fallbackUuid[0].toLowerCase()}.mp4`,
      title: `Suno Track (${fallbackUuid[0].slice(0, 8)})`,
    };
  }

  return { streamUrl: currentUrl, title: 'Linked Audio Stream' };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // 1. /api/resolve-song?url=...
    if (url.pathname === '/api/resolve-song') {
      const target = url.searchParams.get('url');
      if (!target) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing url parameter' }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }

      try {
        const resolved = await resolveSongTarget(target);
        const proxiedUrl = `${url.origin}/api/proxy-audio?url=${encodeURIComponent(
          resolved.streamUrl
        )}`;
        return new Response(
          JSON.stringify({
            ok: true,
            streamUrl: resolved.streamUrl,
            proxiedUrl,
            title: resolved.title,
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: String(err) }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 2. /api/proxy-audio?url=...
    if (url.pathname === '/api/proxy-audio') {
      let target = url.searchParams.get('url');
      if (!target) {
        return new Response('Missing url parameter', {
          status: 400,
          headers: CORS_HEADERS,
        });
      }

      // Rewrite encrypted Suno .m4a clip URLs to unencrypted cdn1.suno.ai/<uuid>.mp4
      const sunoClipMatch = target.match(
        /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.(?:m4a|mp3)/i
      );
      if (
        sunoClipMatch &&
        (target.includes('cloudfront.net') || target.includes('suno.ai'))
      ) {
        target = `https://cdn1.suno.ai/${sunoClipMatch[1].toLowerCase()}.mp4`;
      }

      const upstreamHeaders = new Headers();
      const range = request.headers.get('Range');
      if (range) {
        upstreamHeaders.set('Range', range);
      }
      upstreamHeaders.set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      const upstreamRes = await fetch(target, {
        method: request.method,
        headers: upstreamHeaders,
        redirect: 'follow',
      });

      const responseHeaders = new Headers(CORS_HEADERS);
      const passHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control',
      ];
      for (const h of passHeaders) {
        const val = upstreamRes.headers.get(h);
        if (val) responseHeaders.set(h, val);
      }

      // Normalize video/mp4 from cdn1.suno.ai to audio/mp4 for clean browser audio decoding
      if (
        target.includes('cdn1.suno.ai') ||
        responseHeaders.get('content-type') === 'video/mp4'
      ) {
        responseHeaders.set('content-type', 'audio/mp4');
      }

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        service: 'Vortex Audio Proxy Worker',
        endpoints: ['/api/resolve-song?url=...', '/api/proxy-audio?url=...'],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  },
};
