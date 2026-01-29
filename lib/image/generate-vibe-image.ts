/**
 * Generate vibe static image: base PNG + footer overlay (masked wallet).
 * Uses node canvas to load "Solana Pill.png", draw footer, and write PNG.
 * Fast (no frame decode/encode). Base asset: public/media/Solana Pill.png
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const BASE_IMAGE_PATH = path.join(process.cwd(), "public", "media", "Solana Pill.png");

const FOOTER_LINE1 = "> received solana_vibes";
const FOOTER_LINE2_PREFIX = "> verified by wallet ";
const FOOTER_FONT = "16px monospace";
const FOOTER_COLOR = "#00ff00";

export interface GenerateVibeImageOptions {
  maskedWallet: string;
  outputPath: string;
}

function ensureOutputDir(outputPath: string) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
}

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
 * Generate vibe PNG and write to outputPath. Skip if file already exists.
 */
export async function generateVibeImage(options: GenerateVibeImageOptions): Promise<void> {
  const { maskedWallet, outputPath } = options;
  if (existsSync(outputPath)) return;

  let createCanvas: (w: number, h: number) => { getContext: (id: string) => CanvasRenderingContext2D | null; toBuffer: (mime: string) => Buffer };
  let loadImage: (src: string) => Promise<{ width: number; height: number } & CanvasImageSource>;
  try {
    const canvasModule = require("canvas");
    createCanvas = canvasModule.createCanvas;
    loadImage = canvasModule.loadImage;
  } catch {
    throw new Error(
      "Image generation requires the 'canvas' package (native deps). " +
        "On macOS run: brew install pkg-config cairo pango libpng jpeg librsvg pixman " +
        "then: npm install"
    );
  }

  ensureOutputDir(outputPath);
  const t0 = Date.now();

  const img = await loadImage(BASE_IMAGE_PATH);
  const width = img.width as number;
  const height = img.height as number;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas 2d context");

  ctx.drawImage(img, 0, 0);
  drawFooter(ctx, width, height, maskedWallet);

  const buf = canvas.toBuffer("image/png");
  writeFileSync(outputPath, buf);
  console.log(`[vibe/image] Written in ${Date.now() - t0}ms`);
}
