/**
 * Create vibe: record + unique static image with masked wallet. Store PNG in public/media/vibes/[id].png
 * No Twitter API call — we accept the handle as-is so rate limits don't affect scaling.
 * TODO: Add rate limiting / abuse prevention (per wallet or per IP).
 * TODO: Optional wallet message signing to prove ownership before creating vibe.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { devVibeStore } from "@/lib/storage/dev-store";
import { maskWallet } from "@/lib/wallet";
import { generateVibeId } from "@/lib/id";
import { generateVibeImage } from "@/lib/image/generate-vibe-image";

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

  const id = generateVibeId();
  const maskedWallet = maskWallet(senderWallet);
  // On Vercel the app filesystem is read-only; write images to /tmp (ephemeral).
  const vibesDir =
    process.env.VERCEL === "1"
      ? path.join("/tmp", "vibes")
      : path.join(process.cwd(), "public", "media", "vibes");
  const imagePath = path.join(vibesDir, `${id}.png`);

  try {
    await devVibeStore.create({
      id,
      targetUserId: username,
      targetUsername: username,
      senderWallet,
      maskedWallet,
    });
    console.log("[vibe/create] Record saved, generating image...");
    await generateVibeImage({ maskedWallet, outputPath: imagePath });
    console.log(`[vibe/create] Done in ${Date.now() - start}ms`);
  } catch (e) {
    console.error("vibe create error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create vibe" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const vibeUrl = `${baseUrl}/v/${id}`;

  return NextResponse.json({
    vibeId: id,
    vibeUrl,
  });
}
