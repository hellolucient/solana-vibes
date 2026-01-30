/**
 * Transaction utilities for minting vibes.
 * 
 * MVP: Backend authority pays for minting (simpler).
 * TODO: Enhance to true sender-pays with partial signing.
 */

import { create } from "@metaplex-foundation/mpl-core";
import {
  generateSigner,
  TransactionBuilderSendAndConfirmOptions,
} from "@metaplex-foundation/umi";
import { getUmi } from "./umi";

const TX_OPTIONS: TransactionBuilderSendAndConfirmOptions = {
  confirm: { commitment: "confirmed" },
};

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
    const result = await builder.sendAndConfirm(umi, TX_OPTIONS);
    const signature = Buffer.from(result.signature).toString("base64");

    console.log(`[MintVibe] Asset created: ${assetSigner.publicKey}, sig: ${signature}`);
    console.log(`[MintVibe] Transaction result:`, JSON.stringify(result, null, 2));

    return {
      mintAddress: assetSigner.publicKey.toString(),
      signature,
    };
  } catch (e) {
    console.error(`[MintVibe] Transaction failed:`, e);
    throw e;
  }
}
