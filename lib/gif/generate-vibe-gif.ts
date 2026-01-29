/**
 * Generate vibe GIF: base GIF + footer overlay (masked wallet) on every frame.
 * Uses gifuct-js to decode, node canvas + gif-encoder-2 to encode.
 * Base asset: public/media/base_pill.gif (or solana_pill_multi_jolt_ultra_clean_tilted.gif)
 * canvas is optional; if missing, we throw a clear error with install instructions.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { parseGIF, decompressFrames } from "gifuct-js";
import GIFEncoder from "gif-encoder-2";

const BASE_GIF_PATH = path.join(process.cwd(), "public", "media", "base_pill.gif");
const VIBES_DIR = path.join(process.cwd(), "public", "media", "vibes");

const FOOTER_LINE1 = "> received solana_vibes";
const FOOTER_LINE2_PREFIX = "> verified by wallet ";
const FOOTER_FONT = "16px monospace";
const FOOTER_COLOR = "#00ff00"; // green
const BG_COLOR = "#000000";

export interface GenerateOptions {
  maskedWallet: string;
  outputPath: string;
}

function ensureVibesDir() {
  mkdirSync(VIBES_DIR, { recursive: true });
}

/**
 * Draw footer text on canvas (monospace, green chevrons, same size/weight both lines).
 */
function drawFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  maskedWallet: string
) {
  const padding = 12;
  const lineHeight = 20;
  const y = height - lineHeight * 2 - padding;

  ctx.font = FOOTER_FONT;
  ctx.fillStyle = FOOTER_COLOR;
  ctx.textBaseline = "top";
  ctx.fillText(FOOTER_LINE1, padding, y);
  ctx.fillText(FOOTER_LINE2_PREFIX + maskedWallet, padding, y + lineHeight);
}

/**
 * Decode base GIF and return full-frame ImageData for each frame (handling disposal).
 */
function decodeFrames(baseGifBuffer: Buffer): { imageData: ImageData; delay: number }[] {
  const gif = parseGIF(baseGifBuffer);
  const frames = decompressFrames(gif, true);
  const width = gif.lsd?.width ?? 0;
  const height = gif.lsd?.height ?? 0;
  if (!width || !height) throw new Error("Invalid base GIF dimensions");

  const result: { imageData: ImageData; delay: number }[] = [];
  let previousImage: Uint8ClampedArray | null = null;

  for (const frame of frames) {
    const patch = frame.patch as Uint8ClampedArray | undefined;
    const dims = frame.dims;
    const delay = frame.delay ?? 50;

    const fullPixels = previousImage
      ? new Uint8ClampedArray(previousImage)
      : new Uint8ClampedArray(width * height * 4);

    // Fill with black first if no previous (or disposal cleared)
    if (!previousImage) {
      for (let i = 0; i < fullPixels.length; i += 4) {
        fullPixels[i] = 0;
        fullPixels[i + 1] = 0;
        fullPixels[i + 2] = 0;
        fullPixels[i + 3] = 255;
      }
    }

    if (patch && dims) {
      const { left, top, width: w, height: h } = dims;
      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          const src = (row * w + col) * 4;
          const r = patch[src];
          const g = patch[src + 1];
          const b = patch[src + 2];
          const a = patch[src + 3];
          if (a === 0) continue;
          const dy = top + row;
          const dx = left + col;
          const dst = (dy * width + dx) * 4;
          fullPixels[dst] = r;
          fullPixels[dst + 1] = g;
          fullPixels[dst + 2] = b;
          fullPixels[dst + 3] = a;
        }
      }
    }

    previousImage = fullPixels;
    if (frame.disposalType === 2) {
      // Restore to background
      previousImage = null;
    }

    result.push({
      imageData: { data: fullPixels, width, height },
      delay,
    });
  }

  return result;
}

/**
 * Generate vibe GIF and write to outputPath. Skip if file already exists (cache).
 */
export function generateVibeGif(options: GenerateOptions): void {
  const { maskedWallet, outputPath } = options;
  if (existsSync(outputPath)) return;

  let createCanvas: (w: number, h: number) => { getContext: (id: string) => CanvasRenderingContext2D | null };
  let ImageDataClass: new (data: Uint8ClampedArray, width: number, height: number) => ImageData;
  try {
    const canvasModule = require("canvas");
    createCanvas = canvasModule.createCanvas;
    ImageDataClass = canvasModule.ImageData;
  } catch {
    throw new Error(
      "GIF generation requires the 'canvas' package (native deps). " +
        "On macOS run: brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman " +
        "then: npm install"
    );
  }

  ensureVibesDir();
  const t0 = Date.now();
  const baseBuffer = readFileSync(BASE_GIF_PATH);
  const frames = decodeFrames(baseBuffer);
  if (frames.length === 0) throw new Error("No frames in base GIF");
  console.log(`[vibe/gif] Decoded ${frames.length} frames in ${Date.now() - t0}ms`);

  const { width, height } = frames[0].imageData;
  // Optimizer on = faster encode. Quality 15 = faster. Min delay 50ms so animation isn't 0.
  const encoder = new GIFEncoder(width, height, "neuquant", true, frames.length);
  encoder.start();
  encoder.setRepeat(0); // 0 = infinite loop
  encoder.setQuality(15);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas 2d context");

  const t1 = Date.now();
  for (let i = 0; i < frames.length; i++) {
    const { imageData, delay } = frames[i];
    const imgData = new ImageDataClass(imageData.data, imageData.width, imageData.height);
    ctx.putImageData(imgData, 0, 0);
    drawFooter(ctx, width, height, maskedWallet);
    const frameDelayMs = Math.max(typeof delay === "number" ? delay : 50, 50);
    encoder.setDelay(frameDelayMs);
    encoder.addFrame(ctx as unknown as CanvasRenderingContext2D);
    if ((i + 1) % 10 === 0) console.log(`[vibe/gif] Encoded ${i + 1}/${frames.length} frames`);
  }
  console.log(`[vibe/gif] All ${frames.length} frames encoded in ${Date.now() - t1}ms`);

  encoder.finish();
  const out = (encoder as unknown as { out: { getData: () => Buffer } }).out.getData();
  writeFileSync(outputPath, out);
  console.log(`[vibe/gif] Written in ${Date.now() - t0}ms total`);
}
