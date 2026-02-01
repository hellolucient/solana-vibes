/**
 * Confirm a claim: receive signed transaction from client, send to RPC, update database.
 * 
 * The backend handles sending to RPC to avoid client-side RPC issues on mobile.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { vibeStore } from "@/lib/storage/supabase";
import { X_USER_COOKIE } from "@/lib/x-oauth-1";
import { getRpcUrl } from "@/lib/solana/config";

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
  let body: { 
    vibeId: string; 
    claimerWallet: string; 
    signedTransaction: string;
    blockhash: string;
    lastValidBlockHeight: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { vibeId, claimerWallet, signedTransaction, blockhash, lastValidBlockHeight } = body;
  if (!vibeId || !claimerWallet || !signedTransaction) {
    return NextResponse.json(
      { error: "Missing vibeId, claimerWallet, or signedTransaction" },
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

    // Deserialize the signed transaction
    const transactionBuffer = Buffer.from(signedTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    // Send to RPC from backend (avoids mobile client RPC issues)
    const connection = new Connection(getRpcUrl(), "confirmed");
    
    console.log(`[vibe/claim/confirm] Sending transaction to RPC...`);
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    console.log(`[vibe/claim/confirm] Transaction sent: ${signature}`);

    // Wait for confirmation
    console.log(`[vibe/claim/confirm] Waiting for confirmation...`);
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, "confirmed");

    if (confirmation.value.err) {
      console.error(`[vibe/claim/confirm] Transaction failed:`, confirmation.value.err);
      return NextResponse.json(
        { error: "Transaction failed on-chain" },
        { status: 500 }
      );
    }

    console.log(`[vibe/claim/confirm] Transaction confirmed: ${signature}`);

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
