/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-contained GIF89a LZW encoder + 60fps MP4/WebM MediaRecorder utility
 * for Vortex — Interactive Polar Shader Lab.
 */

// 4x4 Bayer ordered dithering matrix normalized to [-0.5, 0.5]
const BAYER_4X4 = [
  -0.46875, 0.03125, -0.34375, 0.15625,
  0.28125, -0.21875, 0.40625, -0.09375,
  -0.28125, 0.21875, -0.40625, 0.09375,
  0.46875, -0.03125, 0.34375, -0.15625,
];

/**
 * Builds a 256-color palette (6x7x6 perceptual RGB lattice = 252 colors + 4 deep void blacks/whites)
 * for instant O(1) pixel quantization with ordered dithering.
 */
function buildShaderPalette256(): Uint8Array {
  const palette = new Uint8Array(256 * 3);
  let idx = 0;

  // 6 Red levels x 7 Green levels x 6 Blue levels = 252 colors
  for (let r = 0; r < 6; r++) {
    const rv = Math.round((r * 255) / 5);
    for (let g = 0; g < 7; g++) {
      const gv = Math.round((g * 255) / 6);
      for (let b = 0; b < 6; b++) {
        const bv = Math.round((b * 255) / 5);
        palette[idx * 3] = rv;
        palette[idx * 3 + 1] = gv;
        palette[idx * 3 + 2] = bv;
        idx++;
      }
    }
  }

  // Fill remaining 4 slots (252..255) with ultra-fine dark void grays for deep shader backgrounds
  const extraGrays = [10, 22, 34, 46];
  for (let i = 0; i < 4; i++) {
    const v = extraGrays[i];
    palette[idx * 3] = v;
    palette[idx * 3 + 1] = v;
    palette[idx * 3 + 2] = v;
    idx++;
  }

  return palette;
}

const GLOBAL_PALETTE_256 = buildShaderPalette256();

/**
 * Quantizes an RGBA frame into 8-bit palette indices using 4x4 Bayer ordered dithering
 * so smooth shader gradients render without color banding.
 */
export function quantizeFrameToIndexed(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const pixelCount = width * height;
  const indexed = new Uint8Array(pixelCount);

  let p = 0;
  for (let y = 0; y < height; y++) {
    const rowBayerOffset = (y & 3) << 2;
    for (let x = 0; x < width; x++) {
      const dither = BAYER_4X4[rowBayerOffset | (x & 3)];
      const r = rgba[p * 4];
      const g = rgba[p * 4 + 1];
      const b = rgba[p * 4 + 2];

      // Dithered perceptual quantization into 6x7x6 lattice
      const rf = Math.min(5, Math.max(0, Math.floor((r / 255) * 5 + dither + 0.5)));
      const gf = Math.min(6, Math.max(0, Math.floor((g / 255) * 6 + dither + 0.5)));
      const bf = Math.min(5, Math.max(0, Math.floor((b / 255) * 5 + dither + 0.5)));

      indexed[p] = rf * 42 + gf * 6 + bf;
      p++;
    }
  }

  return indexed;
}

/**
 * Standard GIF89a LZW compressor for 8-bit indexed pixel data (minCodeSize = 8).
 */
function lzwEncodeFrame(indexedPixels: Uint8Array, out: number[]): void {
  const minCodeSize = 8;
  out.push(minCodeSize);

  const clearCode = 1 << minCodeSize; // 256
  const eoiCode = clearCode + 1; // 257

  // Hash table mapping (prefix << 8) | suffix -> code (size 8192 prime-like power of 2)
  const TABLE_SIZE = 8192;
  const keyTable = new Int32Array(TABLE_SIZE);
  const codeTable = new Int16Array(TABLE_SIZE);
  keyTable.fill(-1);

  let nextCode = eoiCode + 1; // 258
  let codeSize = minCodeSize + 1; // 9
  let maxCode = (1 << codeSize) - 1; // 511

  // Sub-block bit packer (max 255 bytes per GIF sub-block)
  const subBlock = new Uint8Array(256);
  let subBlockLen = 0;
  let bitBuffer = 0;
  let bitCount = 0;

  const flushSubBlock = () => {
    if (subBlockLen > 0) {
      out.push(subBlockLen);
      for (let i = 0; i < subBlockLen; i++) {
        out.push(subBlock[i]);
      }
      subBlockLen = 0;
    }
  };

  const emitCode = (code: number) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      subBlock[subBlockLen++] = bitBuffer & 0xff;
      if (subBlockLen === 255) {
        flushSubBlock();
      }
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  // Start stream with Clear Code
  emitCode(clearCode);

  if (indexedPixels.length === 0) {
    emitCode(eoiCode);
    if (bitCount > 0) {
      subBlock[subBlockLen++] = bitBuffer & 0xff;
    }
    flushSubBlock();
    out.push(0); // Block terminator
    return;
  }

  let prefix = indexedPixels[0];

  for (let i = 1; i < indexedPixels.length; i++) {
    const suffix = indexedPixels[i];
    const key = (prefix << 8) | suffix;

    // Open-addressed hash probe
    let slot = ((key * 2654435761) >>> 19) & (TABLE_SIZE - 1);
    let foundCode = -1;
    while (keyTable[slot] !== -1) {
      if (keyTable[slot] === key) {
        foundCode = codeTable[slot];
        break;
      }
      slot = (slot + 1) & (TABLE_SIZE - 1);
    }

    if (foundCode !== -1) {
      prefix = foundCode;
    } else {
      emitCode(prefix);

      if (nextCode < 4096) {
        keyTable[slot] = key;
        codeTable[slot] = nextCode;
        if (nextCode > maxCode && codeSize < 12) {
          codeSize++;
          maxCode = (1 << codeSize) - 1;
        }
        nextCode++;
      } else {
        // Dictionary full — emit Clear Code and reset table
        emitCode(clearCode);
        keyTable.fill(-1);
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
        maxCode = (1 << codeSize) - 1;
      }

      prefix = suffix;
    }
  }

  emitCode(prefix);
  emitCode(eoiCode);

  if (bitCount > 0) {
    subBlock[subBlockLen++] = bitBuffer & 0xff;
  }
  flushSubBlock();
  out.push(0); // Sub-block terminator
}

function writeUint16LE(out: number[], value: number): void {
  out.push(value & 0xff, (value >> 8) & 0xff);
}

function writeAscii(out: number[], str: string): void {
  for (let i = 0; i < str.length; i++) {
    out.push(str.charCodeAt(i) & 0xff);
  }
}

/**
 * Encodes an array of quantized 8-bit frames into an infinite-looping GIF89a Blob.
 */
export async function encodeAnimatedGif(
  indexedFrames: Uint8Array[],
  width: number,
  height: number,
  fps: number,
  onProgress?: (fraction: number) => void
): Promise<Blob> {
  const out: number[] = [];
  const delayCs = Math.max(2, Math.round(100 / fps)); // Delay in hundredths of a second

  // 1. GIF89a Header
  writeAscii(out, 'GIF89a');

  // 2. Logical Screen Descriptor (Global Color Table Flag = 1, 256 colors -> size code 7)
  writeUint16LE(out, width);
  writeUint16LE(out, height);
  out.push(0xf7); // 1 (GCT) | 111 (8-bit color res) | 0 (unsorted) | 111 (256 entries)
  out.push(0x00); // Background color index
  out.push(0x00); // Pixel aspect ratio

  // 3. Global Color Table (256 * 3 = 768 bytes)
  for (let i = 0; i < GLOBAL_PALETTE_256.length; i++) {
    out.push(GLOBAL_PALETTE_256[i]);
  }

  // 4. Netscape 2.0 Application Extension for infinite looping
  out.push(0x21, 0xff, 0x0b);
  writeAscii(out, 'NETSCAPE2.0');
  out.push(0x03, 0x01, 0x00, 0x00, 0x00); // Loop forever (0)

  // 5. Encode each frame
  for (let i = 0; i < indexedFrames.length; i++) {
    // Graphic Control Extension
    out.push(0x21, 0xf9, 0x04);
    out.push(0x04); // Disposal method 1 (Do not dispose)
    writeUint16LE(out, delayCs);
    out.push(0x00); // Transparent color index (unused)
    out.push(0x00); // Block terminator

    // Image Descriptor
    out.push(0x2c);
    writeUint16LE(out, 0); // Left
    writeUint16LE(out, 0); // Top
    writeUint16LE(out, width);
    writeUint16LE(out, height);
    out.push(0x00); // No local color table

    // LZW Image Data
    lzwEncodeFrame(indexedFrames[i], out);

    if (onProgress && (i % 6 === 0 || i === indexedFrames.length - 1)) {
      onProgress((i + 1) / indexedFrames.length);
      // Yield briefly to keep UI responsive
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  // 6. GIF Trailer
  out.push(0x3b);

  return new Blob([new Uint8Array(out)], { type: 'image/gif' });
}

/**
 * Picks the display label and preferred extension for the 15s video button.
 */
export function getPreferredVideoMimeType(): {
  mimeType: string;
  extension: 'mp4' | 'webm';
  label: 'MP4' | 'WebM';
} {
  return { mimeType: 'video/mp4', extension: 'mp4', label: 'MP4' };
}

export interface ActiveVideoCaptureController {
  stop: () => void;
}

/**
 * Starts a resilient MediaRecorder session that handles both synchronous AND asynchronous
 * encoder failures (e.g. if a browser passes `isTypeSupported` and `.start()` synchronously
 * but aborts on the media thread 10ms later before emitting any chunks).
 */
export function createAndStartVideoRecorder(
  videoTracks: MediaStreamTrack[],
  audioTracks: MediaStreamTrack[],
  timesliceMs: number,
  onData: (e: BlobEvent) => void,
  onStop: (recorderMimeType: string) => void
): ActiveVideoCaptureController | null {
  if (typeof MediaRecorder === 'undefined' || videoTracks.length === 0) {
    return null;
  }

  // Prefer WebM with H.264/VP8 + software Opus audio during capture because Chromium's
  // software Opus encoder never fails asynchronously on Web Audio streams, and /api/remux-mp4
  // remuxes H.264+Opus into universal H.264+AAC .mp4 in ~0.5s.
  const mimeCandidates = [
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
    '',
  ];

  const streamVariants: MediaStream[] =
    audioTracks.length > 0
      ? [
          new MediaStream([...videoTracks, ...audioTracks]),
          new MediaStream([...videoTracks]),
        ]
      : [new MediaStream([...videoTracks])];

  const attempts: Array<{ stream: MediaStream; mimeType: string }> = [];
  for (const stream of streamVariants) {
    for (const candidate of mimeCandidates) {
      if (!candidate || MediaRecorder.isTypeSupported(candidate)) {
        attempts.push({ stream, mimeType: candidate });
      }
    }
  }

  if (attempts.length === 0) {
    return null;
  }

  let currentRecorder: MediaRecorder | null = null;
  let userRequestedStop = false;
  let hasReceivedData = false;
  let attemptIndex = 0;

  const tryStartNext = (): boolean => {
    while (attemptIndex < attempts.length) {
      const { stream, mimeType } = attempts[attemptIndex++];
      try {
        const options: MediaRecorderOptions = {
          videoBitsPerSecond: 8_000_000,
        };
        if (mimeType) {
          options.mimeType = mimeType;
        }
        const rec = new MediaRecorder(stream, options);
        currentRecorder = rec;

        rec.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            hasReceivedData = true;
            onData(e);
          }
        };

        rec.onerror = () => {
          // If the encoder failed asynchronously before producing any video chunks,
          // automatically switch to the next fallback codec without aborting the user's recording
          if (!hasReceivedData && !userRequestedStop) {
            try {
              if (rec.state !== 'inactive') rec.stop();
            } catch {}
          }
        };

        rec.onstop = () => {
          if (
            !hasReceivedData &&
            !userRequestedStop &&
            attemptIndex < attempts.length
          ) {
            if (tryStartNext()) {
              return;
            }
          }
          onStop(rec.mimeType || mimeType || 'video/webm');
        };

        rec.start(timesliceMs);
        return true;
      } catch {
        // Try next candidate
      }
    }
    return false;
  };

  if (!tryStartNext()) {
    return null;
  }

  return {
    stop: () => {
      userRequestedStop = true;
      if (currentRecorder && currentRecorder.state !== 'inactive') {
        try {
          currentRecorder.stop();
        } catch {}
      }
    },
  };
}

/**
 * Converts a recorded MediaRecorder blob into a universal H.264 + AAC .mp4 via /api/remux-mp4
 * when the backend is available, or returns the native recorded blob on static hosts.
 */
export async function finalizeRecordedVideoBlob(
  rawBlob: Blob,
  fallbackExtension: 'mp4' | 'webm'
): Promise<{ blob: Blob; extension: 'mp4' | 'webm' }> {
  const isStaticHost =
    typeof window !== 'undefined' &&
    /\.(github\.io|pages\.dev|netlify\.app|vercel\.app)$/i.test(
      window.location.hostname
    );

  if (!isStaticHost) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/remux-mp4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: rawBlob,
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (res.ok) {
        const mp4Blob = await res.blob();
        if (mp4Blob.size > 0) {
          return { blob: mp4Blob, extension: 'mp4' };
        }
      }
    } catch {
      window.clearTimeout(timeoutId);
      // Fall back to direct browser blob
    }
  }

  const actualExt: 'mp4' | 'webm' = rawBlob.type.includes('mp4')
    ? 'mp4'
    : rawBlob.type.includes('webm')
      ? 'webm'
      : fallbackExtension;

  return { blob: rawBlob, extension: actualExt };
}



