/**
 * Image and metadata upload for vibes.
 * 
 * Dev: Uses local filesystem + API routes
 * Prod: TODO - swap to Arweave/IPFS (Irys/Bundlr)
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";

// On Vercel, use /tmp; locally use public/media/vibes
const VIBES_DIR =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "vibes")
    : path.join(process.cwd(), "public", "media", "vibes");

const METADATA_DIR =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "metadata")
    : path.join(process.cwd(), "public", "media", "metadata");

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
 * Returns URIs that can be used for NFT metadata.
 */
export async function uploadVibeAssets(params: {
  vibeId: string;
  imageBuffer: Buffer;
  metadata: VibeMetadata;
  baseUrl: string;
}): Promise<UploadResult> {
  const { vibeId, imageBuffer, metadata, baseUrl } = params;

  await ensureDir(VIBES_DIR);
  await ensureDir(METADATA_DIR);

  // Write image
  const imagePath = path.join(VIBES_DIR, `${vibeId}.png`);
  await writeFile(imagePath, imageBuffer);
  console.log(`[Upload] Image saved: ${imagePath}`);

  // Determine image URI based on environment
  // On Vercel, serve via API; locally serve from static files
  const imageUri =
    process.env.VERCEL === "1"
      ? `${baseUrl}/api/vibe/image/${vibeId}`
      : `${baseUrl}/media/vibes/${vibeId}.png`;

  // Update metadata with final image URI
  const finalMetadata: VibeMetadata = {
    ...metadata,
    image: imageUri,
  };

  // Write metadata JSON
  const metadataPath = path.join(METADATA_DIR, `${vibeId}.json`);
  await writeFile(metadataPath, JSON.stringify(finalMetadata, null, 2));
  console.log(`[Upload] Metadata saved: ${metadataPath}`);

  // Metadata URI
  const metadataUri =
    process.env.VERCEL === "1"
      ? `${baseUrl}/api/vibe/${vibeId}/metadata`
      : `${baseUrl}/media/metadata/${vibeId}.json`;

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
}): VibeMetadata {
  const { vibeId, recipientHandle, senderWallet, maskedWallet, mintAddress, timestamp, baseUrl } =
    params;

  const handle = recipientHandle.startsWith("@") ? recipientHandle : `@${recipientHandle}`;

  return {
    name: `Vibe for ${handle}`,
    description: `A solana_vibe sent to ${handle}. Verified by wallet ${maskedWallet}.`,
    image: "", // Will be set during upload
    external_url: `${baseUrl}/v/${vibeId}`,
    attributes: [
      { trait_type: "Recipient", value: handle },
      { trait_type: "Sender Wallet", value: maskedWallet },
      { trait_type: "Mint", value: mintAddress },
      { trait_type: "Created", value: timestamp },
      { trait_type: "Status", value: "pending" },
    ],
  };
}
