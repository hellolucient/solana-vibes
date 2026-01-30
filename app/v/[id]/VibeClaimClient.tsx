"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import dynamic from "next/dynamic";
import type { VibeClaimStatus } from "@/lib/storage/types";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface VibeClaimClientProps {
  vibeId: string;
  targetUsername: string;
  claimStatus: VibeClaimStatus;
  claimerWallet?: string;
  mintAddress?: string;
}

export function VibeClaimClient({
  vibeId,
  targetUsername,
  claimStatus: initialClaimStatus,
  claimerWallet: initialClaimerWallet,
  mintAddress,
}: VibeClaimClientProps) {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [xUser, setXUser] = useState<{ username: string } | null>(null);
  const [claimStatus, setClaimStatus] = useState(initialClaimStatus);
  const [claimerWallet, setClaimerWallet] = useState(initialClaimerWallet);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showClaimFlow, setShowClaimFlow] = useState(false);

  // Check if user is logged in with X
  useEffect(() => {
    let cancelled = false;
    async function checkX() {
      try {
        const res = await fetch("/api/auth/x/me");
        const data = await res.json();
        if (cancelled) return;
        if (data?.connected && data.username) {
          setXUser({ username: data.username });
        } else {
          setXUser(null);
        }
      } catch {
        if (!cancelled) setXUser(null);
      }
    }
    checkX();
    return () => { cancelled = true; };
  }, []);

  // Check if the current X user is the intended recipient
  const isRecipient = xUser?.username?.toLowerCase() === targetUsername.toLowerCase();
  const canClaim = isRecipient && connected && claimStatus === "pending" && mintAddress;

  const handleClaim = async () => {
    if (!publicKey || !canClaim || !signTransaction) return;

    setError(null);
    setClaiming(true);

    try {
      // Step 1: Get the prepared transaction from the backend
      const prepareRes = await fetch("/api/vibe/claim/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeId,
          claimerWallet: publicKey.toBase58(),
        }),
      });

      const prepareData = await prepareRes.json();

      if (!prepareRes.ok) {
        throw new Error(prepareData.error ?? "Failed to prepare claim");
      }

      // Step 2: Deserialize and sign the transaction
      const transactionBuffer = Buffer.from(prepareData.transaction, "base64");
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      // User signs as fee payer
      const signedTransaction = await signTransaction(transaction);

      // Step 3: Send the transaction
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        { skipPreflight: false }
      );

      console.log("Transaction sent:", signature);

      // Step 4: Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: prepareData.blockhash,
        lastValidBlockHeight: prepareData.lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error("Transaction failed on-chain");
      }

      console.log("Transaction confirmed:", signature);

      // Step 5: Confirm with backend to update database
      const confirmRes = await fetch("/api/vibe/claim/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeId,
          claimerWallet: publicKey.toBase58(),
          signature,
        }),
      });

      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        // Transaction succeeded but DB update failed - not critical
        console.warn("DB update failed:", confirmData.error);
      }

      setClaimStatus("claimed");
      setClaimerWallet(publicKey.toBase58());
      setSuccess(true);
    } catch (e) {
      console.error("Claim error:", e);
      setError(e instanceof Error ? e.message : "Failed to claim vibe");
    } finally {
      setClaiming(false);
    }
  };

  // Already claimed - show minimal status
  if (claimStatus === "claimed") {
    return (
      <p className="mt-4 font-mono text-sm text-neutral-500">
        <span className="text-neutral-600">&gt;</span>{" "}
        <span className="text-green-500">{success ? "claimed" : "claimed"}</span>{" "}
        by {claimerWallet?.slice(0, 4)}…{claimerWallet?.slice(-4)}
      </p>
    );
  }

  // No mint address yet
  if (!mintAddress) {
    return null;
  }

  // Simple "Claim this vibe" button (not showing full form)
  if (!showClaimFlow) {
    return (
      <button
        type="button"
        onClick={() => setShowClaimFlow(true)}
        className="mt-6 font-mono text-sm text-green-500 hover:text-green-400 transition-colors group"
      >
        <span className="text-neutral-500">[</span>
        <span className="group-hover:underline">claim_vibe</span>
        <span className="text-neutral-500">]</span>
      </button>
    );
  }

  // Claim flow (expanded)
  return (
    <div className="mt-6 max-w-sm w-full font-mono text-sm space-y-3">
      <p className="text-neutral-500 text-center">
        <span className="text-neutral-600">&gt;</span> for <span className="text-green-500">@{targetUsername}</span>
      </p>

      {/* X Connection */}
      {!xUser ? (
        <a
          href={`/api/auth/x?return_to=${encodeURIComponent(`/v/${vibeId}`)}`}
          className="block text-center text-green-500 hover:text-green-400 transition-colors group"
        >
          <span className="text-neutral-500">[</span>
          <span className="group-hover:underline">connect_x</span>
          <span className="text-neutral-500">]</span>
        </a>
      ) : !isRecipient ? (
        <p className="text-amber-500 text-xs text-center">
          signed in as @{xUser.username} — only @{targetUsername} can claim
        </p>
      ) : !connected ? (
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          className="w-full text-center text-green-500 hover:text-green-400 disabled:opacity-50 transition-colors group"
        >
          <span className="text-neutral-500">[</span>
          <span className="group-hover:underline">{claiming ? "claiming..." : "confirm_claim"}</span>
          <span className="text-neutral-500">]</span>
        </button>
      )}

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}

      <button
        type="button"
        onClick={() => setShowClaimFlow(false)}
        className="block w-full text-center text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        <span className="text-neutral-700">[</span>cancel<span className="text-neutral-700">]</span>
      </button>
    </div>
  );
}
