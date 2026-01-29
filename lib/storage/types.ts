/**
 * Storage interfaces — swap implementation for Supabase / R2 later.
 */

export interface VibeRecord {
  id: string;
  targetUserId: string;
  targetUsername: string;
  senderWallet: string; // base58
  maskedWallet: string; // first 3 + … + last 3
  createdAt: string; // ISO
}

export interface IVibeStore {
  create(vibe: Omit<VibeRecord, "createdAt">): Promise<VibeRecord>;
  getById(id: string): Promise<VibeRecord | null>;
}
