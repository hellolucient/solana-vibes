/**
 * Transaction utilities for minting vibes.
 * 
 * MVP: Backend authority pays for minting (simpler).
 * TODO: Enhance to true sender-pays with partial signing.
 * 
 * Note: Uses polling-based confirmation instead of WebSocket subscriptions
 * for compatibility with Vercel's serverless environment.
 */

import { create } from "@metaplex-foundation/mpl-core";
import {
  generateSigner,
  Umi,
  TransactionBuilder,
  RpcConfirmTransactionResult,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { getUmi } from "./umi";

/**
 * Send a transaction and confirm it using polling (not WebSockets).
 * This is required for Vercel/serverless environments where WebSocket
 * subscriptions don't work properly.
 */
async function sendAndConfirmWithPolling(
  umi: Umi,
  builder: TransactionBuilder,
  maxRetries = 30,
  retryDelayMs = 1000
): Promise<{ signature: Uint8Array; result: RpcConfirmTransactionResult }> {
  // Build, sign, and send the transaction
  const signedTx = await builder.buildAndSign(umi);
  const signature = await umi.rpc.sendTransaction(signedTx);
  
  const signatureStr = base58.deserialize(signature)[0];
  console.log(`[TX] Sent transaction: ${signatureStr}`);
  
  // Poll for confirmation
  for (let i = 0; i < maxRetries; i++) {
    const result = await umi.rpc.confirmTransaction(signature, {
      strategy: { type: "blockhash", ...(await umi.rpc.getLatestBlockhash()) },
    });
    
    if (result.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
    }
    
    if (result.value.confirmationStatus === "confirmed" || result.value.confirmationStatus === "finalized") {
      console.log(`[TX] Confirmed with status: ${result.value.confirmationStatus}`);
      return { signature, result };
    }
    
    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  
  throw new Error(`Transaction confirmation timed out after ${maxRetries * retryDelayMs}ms`);
}

/**
 * Mint a vibe NFT directly (backend pays).
 * Returns the mint address and signature.
 */
export async function mintVibe(params: {
  senderWallet: string;
  recipientHandle: string;
  uri: string;
}): Promise<{
  mintAddress: string;
  signature: string;
}> {
  const { umi, authority } = getUmi();

  // Generate a new keypair for the asset
  const assetSigner = generateSigner(umi);

  console.log(`[MintVibe] Creating asset ${assetSigner.publicKey} for @${params.recipientHandle}`);

  // Build and send the create instruction
  const builder = create(umi, {
    asset: assetSigner,
    name: `Vibe for @${params.recipientHandle}`,
    uri: params.uri,
    owner: authority.publicKey, // Authority owns until claimed
    plugins: [
      {
        type: "Attributes",
        attributeList: [
          { key: "recipient_handle", value: params.recipientHandle },
          { key: "sender_wallet", value: params.senderWallet },
          { key: "status", value: "pending" },
        ],
      },
    ],
  });

  try {
    const result = await sendAndConfirmWithPolling(umi, builder);
    const signature = Buffer.from(result.signature).toString("base64");

    console.log(`[MintVibe] Asset created: ${assetSigner.publicKey}, sig: ${signature}`);
    console.log(`[MintVibe] Transaction result:`, JSON.stringify(result.result, null, 2));

    return {
      mintAddress: assetSigner.publicKey.toString(),
      signature,
    };
  } catch (e) {
    console.error(`[MintVibe] Transaction failed:`, e);
    throw e;
  }
}
