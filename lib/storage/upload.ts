/**
 * Image and metadata upload for vibes.
 * 
 * Uses Vercel Blob for persistent storage in production.
 * Falls back to local filesystem for local development.
 */

import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Check if we should use Vercel Blob (when BLOB_READ_WRITE_TOKEN is set)
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// Local directories for dev
const VIBES_DIR = path.join(process.cwd(), "public", "media", "vibes");
const METADATA_DIR = path.join(process.cwd(), "public", "media", "metadata");

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export interface VibeMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface UploadResult {
  imageUri: string;
  metadataUri: string;
}

/**
 * Upload vibe image and metadata.
 * Uses Vercel Blob in production, local filesystem in dev.
 */
export async function uploadVibeAssets(params: {
  vibeId: string;
  imageBuffer: Buffer;
  metadata: VibeMetadata;
  baseUrl: string;
}): Promise<UploadResult> {
  const { vibeId, imageBuffer, metadata, baseUrl } = params;

  if (USE_BLOB) {
    return uploadToBlobStorage(params);
  } else {
    return uploadToLocalFilesystem(params);
  }
}

/**
 * Upload to Vercel Blob (production)
 */
async function uploadToBlobStorage(params: {
  vibeId: string;
  imageBuffer: Buffer;
  metadata: VibeMetadata;
  baseUrl: string;
}): Promise<UploadResult> {
  const { vibeId, imageBuffer, metadata } = params;

  console.log(`[Upload] Using Vercel Blob for ${vibeId}`);

  // Upload image to Blob
  const imageBlob = await put(`vibes/${vibeId}.png`, imageBuffer, {
    access: "public",
    contentType: "image/png",
  });
  console.log(`[Upload] Image uploaded to Blob: ${imageBlob.url}`);

  // Update metadata with blob image URL
  const finalMetadata: VibeMetadata = {
    ...metadata,
    image: imageBlob.url,
  };

  // Upload metadata JSON to Blob
  const metadataBlob = await put(
    `metadata/${vibeId}.json`,
    JSON.stringify(finalMetadata, null, 2),
    {
      access: "public",
      contentType: "application/json",
    }
  );
  console.log(`[Upload] Metadata uploaded to Blob: ${metadataBlob.url}`);

  return {
    imageUri: imageBlob.url,
    metadataUri: metadataBlob.url,
  };
}

/**
 * Upload to local filesystem (development)
 */
async function uploadToLocalFilesystem(params: {
  vibeId: string;
  imageBuffer: Buffer;
  metadata: VibeMetadata;
  baseUrl: string;
}): Promise<UploadResult> {
  const { vibeId, imageBuffer, metadata, baseUrl } = params;

  console.log(`[Upload] Using local filesystem for ${vibeId}`);

  await ensureDir(VIBES_DIR);
  await ensureDir(METADATA_DIR);

  // Write image
  const imagePath = path.join(VIBES_DIR, `${vibeId}.png`);
  await writeFile(imagePath, imageBuffer);
  console.log(`[Upload] Image saved: ${imagePath}`);

  const imageUri = `${baseUrl}/media/vibes/${vibeId}.png`;

  // Update metadata with final image URI
  const finalMetadata: VibeMetadata = {
    ...metadata,
    image: imageUri,
  };

  // Write metadata JSON
  const metadataPath = path.join(METADATA_DIR, `${vibeId}.json`);
  await writeFile(metadataPath, JSON.stringify(finalMetadata, null, 2));
  console.log(`[Upload] Metadata saved: ${metadataPath}`);

  const metadataUri = `${baseUrl}/media/metadata/${vibeId}.json`;

  return {
    imageUri,
    metadataUri,
  };
}

/**
 * Generate NFT metadata for a vibe.
 */
export function createVibeMetadata(params: {
  vibeId: string;
  recipientHandle: string;
  senderWallet: string;
  maskedWallet: string;
  mintAddress: string;
  timestamp: string;
  baseUrl: string;
  vibeNumber?: number;
}): VibeMetadata {
  const { vibeId, recipientHandle, maskedWallet, mintAddress, timestamp, baseUrl, vibeNumber } =
    params;

  const handle = recipientHandle.startsWith("@") ? recipientHandle : `@${recipientHandle}`;
  const nameWithNumber = vibeNumber ? `Vibe #${vibeNumber} for ${handle}` : `Vibe for ${handle}`;
  const descWithNumber = vibeNumber
    ? `solana_vibes #${vibeNumber} sent to ${handle}. Verified by wallet ${maskedWallet}.`
    : `A solana_vibe sent to ${handle}. Verified by wallet ${maskedWallet}.`;

  const attributes = [
    { trait_type: "Recipient", value: handle },
    { trait_type: "Sender Wallet", value: maskedWallet },
    { trait_type: "Mint", value: mintAddress },
    { trait_type: "Created", value: timestamp },
    { trait_type: "Status", value: "pending" },
  ];

  // Add vibe number if available
  if (vibeNumber) {
    attributes.unshift({ trait_type: "Vibe Number", value: `#${vibeNumber}` });
  }

  return {
    name: nameWithNumber,
    description: descWithNumber,
    image: "", // Will be set during upload
    external_url: `${baseUrl}/v/${vibeId}`,
    attributes,
  };
}
