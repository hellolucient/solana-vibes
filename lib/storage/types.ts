/**
 * Storage interfaces — swap implementation for Supabase / R2 later.
 */

export type VibeClaimStatus = "pending" | "claimed";

export interface VibeRecord {
  id: string;
  targetUserId: string;
  targetUsername: string;
  senderWallet: string; // base58
  maskedWallet: string; // first 3 + … + last 3
  createdAt: string; // ISO timestamp

  // On-chain data (populated after mint)
  mintAddress?: string; // Metaplex Core asset address
  metadataUri?: string; // Arweave/IPFS URI for metadata JSON

  // Claim state
  claimStatus: VibeClaimStatus;
  claimerWallet?: string; // base58, set when claimed
  claimedAt?: string; // ISO timestamp
}

export interface IVibeStore {
  create(vibe: Omit<VibeRecord, "createdAt" | "claimStatus">): Promise<VibeRecord>;
  getById(id: string): Promise<VibeRecord | null>;
  update(id: string, updates: Partial<VibeRecord>): Promise<VibeRecord | null>;
}
