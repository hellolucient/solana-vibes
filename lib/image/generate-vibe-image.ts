/**
 * Generate vibe static image: base PNG + text overlays.
 * Uses sharp (Vercel-friendly, no native deps). Base asset: public/media/vibes4b.png
 * 
 * Text elements rendered on the image:
 * - Top-left: Recipient @handle (semi-transparent)
 * - Bottom: Footer with vibe info (green terminal style)
 *   - "> received solana_vibes"
 *   - "> verified by wallet <masked_wallet>"
 *   - "> mint <masked_mint>"
 *   - Timestamp (UTC)
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import sharp from "sharp";

const BASE_IMAGE_PATH = path.join(process.cwd(), "public", "media", "vibes4b.png");

// Styling constants
const FONT_SIZE = 14;
const FONT_SIZE_HANDLE = 24;
const PADDING = 16;
const LINE_HEIGHT = 18;
const FOOTER_COLOR = "#00ff00";
const HANDLE_COLOR = "rgba(255, 255, 255, 0.15)"; // Semi-transparent white

export interface GenerateVibeImageOptions {
  maskedWallet: string;
  recipientHandle: string;
  mintAddress: string;
  timestamp: string; // ISO string
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
 * Mask a mint address for display: first 4 + … + last 4
 */
function maskMintAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * Format timestamp for display.
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

/**
 * Generate vibe PNG with all text elements and write to outputPath.
 * Force regenerate (overwrite) since content may change.
 */
export async function generateVibeImage(options: GenerateVibeImageOptions): Promise<Buffer> {
  const { maskedWallet, recipientHandle, mintAddress, timestamp, outputPath } = options;

  ensureOutputDir(outputPath);
  const t0 = Date.now();

  const image = sharp(BASE_IMAGE_PATH);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("Invalid base image dimensions");

  // Prepare text content
  const handle = recipientHandle.startsWith("@") ? recipientHandle : `@${recipientHandle}`;
  const maskedMint = maskMintAddress(mintAddress);
  const formattedTime = formatTimestamp(timestamp);

  // Footer text lines
  const footerLines = [
    "> received solana_vibes",
    `> verified by wallet ${maskedWallet}`,
    `> mint ${maskedMint}`,
    formattedTime,
  ];

  const footerHeight = LINE_HEIGHT * footerLines.length + PADDING * 2;

  // Create footer SVG overlay
  const footerSvg = `
<svg width="${width}" height="${footerHeight}" xmlns="http://www.w3.org/2000/svg">
  ${footerLines
    .map(
      (line, i) =>
        `<text x="${PADDING}" y="${PADDING + (i + 1) * LINE_HEIGHT - 4}" font-family="monospace" font-size="${FONT_SIZE}" fill="${FOOTER_COLOR}">${escapeSvg(line)}</text>`
    )
    .join("\n  ")}
</svg>`;

  // Create handle SVG overlay (top-left, semi-transparent)
  const handleHeight = FONT_SIZE_HANDLE + PADDING * 2;
  const handleSvg = `
<svg width="${width}" height="${handleHeight}" xmlns="http://www.w3.org/2000/svg">
  <text x="${PADDING}" y="${PADDING + FONT_SIZE_HANDLE}" font-family="monospace" font-size="${FONT_SIZE_HANDLE}" font-weight="bold" fill="${HANDLE_COLOR}">${escapeSvg(handle)}</text>
</svg>`;

  const footerBuffer = Buffer.from(footerSvg.trim());
  const handleBuffer = Buffer.from(handleSvg.trim());

  const outBuffer = await image
    .composite([
      // Handle overlay at top-left
      {
        input: handleBuffer,
        top: 0,
        left: 0,
      },
      // Footer overlay at bottom
      {
        input: footerBuffer,
        top: height - footerHeight,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  writeFileSync(outputPath, outBuffer);
  console.log(`[vibe/image] Written ${outputPath} in ${Date.now() - t0}ms`);

  return outBuffer;
}

/**
 * Generate vibe image and return buffer without writing to disk.
 * Useful for direct upload to storage.
 */
export async function generateVibeImageBuffer(
  options: Omit<GenerateVibeImageOptions, "outputPath">
): Promise<Buffer> {
  const { maskedWallet, recipientHandle, mintAddress, timestamp } = options;
  const t0 = Date.now();

  const image = sharp(BASE_IMAGE_PATH);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("Invalid base image dimensions");

  // Prepare text content
  const handle = recipientHandle.startsWith("@") ? recipientHandle : `@${recipientHandle}`;
  const maskedMint = maskMintAddress(mintAddress);
  const formattedTime = formatTimestamp(timestamp);

  // Footer text lines
  const footerLines = [
    "> received solana_vibes",
    `> verified by wallet ${maskedWallet}`,
    `> mint ${maskedMint}`,
    formattedTime,
  ];

  const footerHeight = LINE_HEIGHT * footerLines.length + PADDING * 2;

  // Create footer SVG overlay
  const footerSvg = `
<svg width="${width}" height="${footerHeight}" xmlns="http://www.w3.org/2000/svg">
  ${footerLines
    .map(
      (line, i) =>
        `<text x="${PADDING}" y="${PADDING + (i + 1) * LINE_HEIGHT - 4}" font-family="monospace" font-size="${FONT_SIZE}" fill="${FOOTER_COLOR}">${escapeSvg(line)}</text>`
    )
    .join("\n  ")}
</svg>`;

  // Create handle SVG overlay (top-left, semi-transparent)
  const handleHeight = FONT_SIZE_HANDLE + PADDING * 2;
  const handleSvg = `
<svg width="${width}" height="${handleHeight}" xmlns="http://www.w3.org/2000/svg">
  <text x="${PADDING}" y="${PADDING + FONT_SIZE_HANDLE}" font-family="monospace" font-size="${FONT_SIZE_HANDLE}" font-weight="bold" fill="${HANDLE_COLOR}">${escapeSvg(handle)}</text>
</svg>`;

  const footerBuffer = Buffer.from(footerSvg.trim());
  const handleBuffer = Buffer.from(handleSvg.trim());

  const outBuffer = await image
    .composite([
      {
        input: handleBuffer,
        top: 0,
        left: 0,
      },
      {
        input: footerBuffer,
        top: height - footerHeight,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  console.log(`[vibe/image] Generated buffer in ${Date.now() - t0}ms`);

  return outBuffer;
}
