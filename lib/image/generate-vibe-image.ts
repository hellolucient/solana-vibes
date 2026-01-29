/**
 * Generate vibe static image: base PNG + footer overlay (masked wallet).
 * Uses sharp (Vercel-friendly, no native deps). Base asset: public/media/Solana Pill.png
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import sharp from "sharp";

const BASE_IMAGE_PATH = path.join(process.cwd(), "public", "media", "Solana Pill.png");

const FOOTER_LINE1 = "> received solana_vibes";
const FOOTER_LINE2_PREFIX = "> verified by wallet ";
const FOOTER_FONT_SIZE = 16;
const PADDING = 12;
const LINE_HEIGHT = 20;
const FOOTER_COLOR = "#00ff00";

export interface GenerateVibeImageOptions {
  maskedWallet: string;
  outputPath: string;
}

function ensureOutputDir(outputPath: string) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
}

function escapeSvg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate vibe PNG and write to outputPath. Skip if file already exists.
 */
export async function generateVibeImage(options: GenerateVibeImageOptions): Promise<void> {
  const { maskedWallet, outputPath } = options;
  if (existsSync(outputPath)) return;

  ensureOutputDir(outputPath);
  const t0 = Date.now();

  const image = sharp(BASE_IMAGE_PATH);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("Invalid base image dimensions");

  const footerHeight = LINE_HEIGHT * 2 + PADDING * 2;
  const y1 = PADDING;
  const y2 = PADDING + LINE_HEIGHT;
  const line1Escaped = escapeSvg(FOOTER_LINE1);
  const line2Escaped = escapeSvg(FOOTER_LINE2_PREFIX + maskedWallet);

  const svg = `
<svg width="${width}" height="${footerHeight}" xmlns="http://www.w3.org/2000/svg">
  <text x="${PADDING}" y="${y1 + FOOTER_FONT_SIZE}" font-family="monospace" font-size="${FOOTER_FONT_SIZE}" fill="${FOOTER_COLOR}">${line1Escaped}</text>
  <text x="${PADDING}" y="${y2 + FOOTER_FONT_SIZE}" font-family="monospace" font-size="${FOOTER_FONT_SIZE}" fill="${FOOTER_COLOR}">${line2Escaped}</text>
</svg>`;

  const footerBuffer = Buffer.from(svg.trim());
  const outBuffer = await image
    .composite([
      {
        input: footerBuffer,
        top: height - footerHeight,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  writeFileSync(outputPath, outBuffer);
  console.log(`[vibe/image] Written in ${Date.now() - t0}ms`);
}
