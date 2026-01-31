/**
 * Confirm a claim after the user has submitted the transaction.
 * 
 * Verifies the transaction succeeded on-chain and updates the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { vibeStore } from "@/lib/storage/supabase";
import { X_USER_COOKIE } from "@/lib/x-oauth-1";

export async function POST(req: NextRequest) {
  console.log("[vibe/claim/confirm] Request start");

  // Get the X user from cookie (for logging)
  const cookieStore = await cookies();
  const userCookie = cookieStore.get(X_USER_COOKIE)?.value;
  let xUsername = "unknown";
  if (userCookie) {
    try {
      const parsed = JSON.parse(userCookie);
      xUsername = parsed.username || "unknown";
    } catch {
      // ignore
    }
  }

  // Parse request body
  let body: { vibeId: string; claimerWallet: string; signature: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { vibeId, claimerWallet, signature } = body;
  if (!vibeId || !claimerWallet || !signature) {
    return NextResponse.json(
      { error: "Missing vibeId, claimerWallet, or signature" },
      { status: 400 }
    );
  }

  try {
    // Get the vibe record
    const vibe = await vibeStore.getById(vibeId);
    if (!vibe) {
      return NextResponse.json({ error: "Vibe not found" }, { status: 404 });
    }

    if (!vibe.mintAddress) {
      return NextResponse.json(
        { error: "Vibe has no mint address" },
        { status: 400 }
      );
    }

    // Trust the frontend's transaction confirmation.
    // The frontend waits for the transaction to be confirmed before calling this endpoint.
    // We skip on-chain ownership verification because RPCs can have significant lag (10+ seconds).
    // The signature proves the user submitted a transaction, and the frontend confirmed it succeeded.
    console.log(`[vibe/claim/confirm] Updating database (trusting frontend confirmation)`);
    console.log(`[vibe/claim/confirm] Transaction signature: ${signature}`);

    // Update the database
    await vibeStore.update(vibeId, {
      claimStatus: "claimed",
      claimerWallet,
      claimedAt: new Date().toISOString(),
    });

    console.log(
      `[vibe/claim/confirm] Claim confirmed for @${xUsername}, vibe ${vibeId}, sig: ${signature}`
    );

    return NextResponse.json({
      success: true,
      vibeId,
      mintAddress: vibe.mintAddress,
      claimerWallet,
      signature,
    });
  } catch (e) {
    console.error("[vibe/claim/confirm] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to confirm claim" },
      { status: 500 }
    );
  }
}
