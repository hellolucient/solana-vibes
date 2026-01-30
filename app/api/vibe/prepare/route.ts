/**
 * Create a vibe: mint NFT, generate image, and return URL.
 * 
 * MVP Flow (backend pays for mint):
 * 1. Create a pending vibe record
 * 2. Mint NFT to vault (authority pays)
 * 3. Generate final image with mint address
 * 4. Upload image and metadata
 * 5. Update NFT metadata
 * 6. Return vibe URL for tweeting
 * 
 * TODO: Enhance to sender-pays with wallet signing.
 */

import { NextRequest, NextResponse } from "next/server";
import { devVibeStore } from "@/lib/storage/dev-store";
import { maskWallet } from "@/lib/wallet";
import { generateVibeId } from "@/lib/id";
import { mintVibe } from "@/lib/solana/transaction";
import { generateVibeImageBuffer } from "@/lib/image/generate-vibe-image";
import { uploadVibeAssets, createVibeMetadata } from "@/lib/storage/upload";
import { updateVibeMetadata } from "@/lib/solana/mint";

export async function POST(req: NextRequest) {
  const start = Date.now();
  console.log("[vibe/create] Request start");

  let body: { targetUsername: string; senderWallet: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { targetUsername, senderWallet } = body;
  if (!targetUsername || typeof senderWallet !== "string") {
    return NextResponse.json(
      { error: "Missing targetUsername or senderWallet" },
      { status: 400 }
    );
  }

  const username = targetUsername.replace(/^@/, "").trim();
  if (!username) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const vibeId = generateVibeId();
  const maskedWallet = maskWallet(senderWallet);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const timestamp = new Date().toISOString();

  // Placeholder URI (will be updated after image generation)
  const placeholderUri = `${baseUrl}/api/vibe/${vibeId}/metadata`;

  try {
    // Step 1: Create pending vibe record
    const vibe = await devVibeStore.create({
      id: vibeId,
      targetUserId: username,
      targetUsername: username,
      senderWallet,
      maskedWallet,
    });

    console.log(`[vibe/create] Created pending vibe: ${vibeId}`);

    // Step 2: Mint NFT to vault (backend pays)
    const { mintAddress, signature } = await mintVibe({
      senderWallet,
      recipientHandle: username,
      uri: placeholderUri,
    });

    console.log(`[vibe/create] NFT minted: ${mintAddress}`);

    // Step 3: Generate final image with mint address
    const imageBuffer = await generateVibeImageBuffer({
      maskedWallet,
      recipientHandle: username,
      mintAddress,
      timestamp,
    });

    // Step 4: Create and upload metadata
    const metadata = createVibeMetadata({
      vibeId,
      recipientHandle: username,
      senderWallet,
      maskedWallet,
      mintAddress,
      timestamp,
      baseUrl,
    });

    const { metadataUri } = await uploadVibeAssets({
      vibeId,
      imageBuffer,
      metadata,
      baseUrl,
    });

    console.log(`[vibe/create] Assets uploaded, metadata: ${metadataUri}`);

    // Step 5: Update NFT metadata with final URI (optional - may fail due to RPC lag)
    try {
      await updateVibeMetadata(mintAddress, metadataUri);
      console.log(`[vibe/create] NFT metadata updated on-chain`);
    } catch (updateErr) {
      // Non-fatal: the placeholder URI still works, metadata can be updated later
      console.warn(`[vibe/create] Could not update NFT metadata (non-fatal):`, updateErr);
    }

    // Step 6: Update vibe record with mint info
    await devVibeStore.update(vibeId, {
      mintAddress,
      metadataUri,
    });

    const vibeUrl = `${baseUrl}/v/${vibeId}`;

    console.log(`[vibe/create] Complete in ${Date.now() - start}ms`);

    return NextResponse.json({
      vibeId,
      vibeUrl,
      mintAddress,
    });
  } catch (e) {
    console.error("[vibe/create] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create vibe" },
      { status: 500 }
    );
  }
}
