/**
 * Build a claim transaction that transfers the NFT and updates its status.
 * 
 * The transaction includes:
 * 1. Transfer instruction (vault -> claimer)
 * 2. Update attributes instruction (status: "pending" -> "claimed")
 * 
 * The authority signs to authorize both operations.
 * The claimer will sign as fee payer when submitting.
 */

import {
  fetchAssetV1,
  transfer,
  updatePlugin,
} from "@metaplex-foundation/mpl-core";
import {
  publicKey,
  transactionBuilder,
  createNoopSigner,
} from "@metaplex-foundation/umi";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { getUmi } from "./umi";

interface BuildClaimTransactionParams {
  mintAddress: string;
  claimerWallet: string;
}

interface BuildClaimTransactionResult {
  serializedTransaction: string; // base64 encoded
  blockhash: string;
  lastValidBlockHeight: number;
}

export async function buildClaimTransaction({
  mintAddress,
  claimerWallet,
}: BuildClaimTransactionParams): Promise<BuildClaimTransactionResult> {
  const { umi, authority } = getUmi();

  // Fetch the asset
  const assetPubkey = publicKey(mintAddress);
  const asset = await fetchAssetV1(umi, assetPubkey);
  const newOwner = publicKey(claimerWallet);

  // Build transfer instruction
  const transferBuilder = transfer(umi, {
    asset,
    newOwner,
  });

  // Build update attributes instruction (change status to "claimed")
  const updateBuilder = updatePlugin(umi, {
    asset: assetPubkey,
    plugin: {
      type: "Attributes",
      attributeList: [
        { key: "recipient_handle", value: asset.attributes?.attributeList.find(a => a.key === "recipient_handle")?.value || "" },
        { key: "sender_wallet", value: asset.attributes?.attributeList.find(a => a.key === "sender_wallet")?.value || "" },
        { key: "status", value: "claimed" },
        { key: "claimer_wallet", value: claimerWallet },
        { key: "claimed_at", value: new Date().toISOString() },
      ],
    },
  });

  // Combine both instructions into one transaction
  const builder = transactionBuilder()
    .add(transferBuilder)
    .add(updateBuilder);

  // Create a noop signer for the claimer (they'll sign later on the frontend)
  const claimerSigner = createNoopSigner(publicKey(claimerWallet));
  
  // Get a recent blockhash
  const { blockhash, lastValidBlockHeight } = await umi.rpc.getLatestBlockhash();

  // Build the transaction with claimer as fee payer
  const transaction = await builder.setFeePayer(claimerSigner).setBlockhash(blockhash).build(umi);

  // Authority signs the transaction (for transfer/update permissions)
  const signedTransaction = await authority.signTransaction(transaction);

  // Convert to web3.js transaction and serialize
  const web3Transaction = toWeb3JsTransaction(signedTransaction);
  const serialized = web3Transaction.serialize();
  const serializedTransaction = Buffer.from(serialized).toString("base64");

  return {
    serializedTransaction,
    blockhash,
    lastValidBlockHeight: Number(lastValidBlockHeight),
  };
}
