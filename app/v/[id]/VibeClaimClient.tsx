"use client";

import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import type { VibeClaimStatus } from "@/lib/storage/types";
import { NoWalletConnectHelp } from "@/components/NoWalletConnectHelp";

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// X (Twitter) logo SVG component
const XLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Phantom logo SVG component
const PhantomLogo = () => (
  <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" rx="26.8387" fill="url(#paint0_linear_claim)"/>
    <path d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.5493 35.8327 107.727 59.7951 104.934C70.4803 103.702 80.3726 98.5837 87.5775 90.5735L103.092 73.6447C107.779 68.5434 114.902 64.9142 110.584 64.9142Z" fill="url(#paint1_linear_claim)"/>
    <circle cx="40.7997" cy="58.4997" r="8.46667" fill="white"/>
    <circle cx="67.5997" cy="58.4997" r="8.46667" fill="white"/>
    <defs>
      <linearGradient id="paint0_linear_claim" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#534BB1"/>
        <stop offset="1" stopColor="#551BF9"/>
      </linearGradient>
      <linearGradient id="paint1_linear_claim" x1="64" y1="23" x2="64" y2="105" gradientUnits="userSpaceOnUse">
        <stop stopColor="white"/>
        <stop offset="1" stopColor="white" stopOpacity="0.82"/>
      </linearGradient>
    </defs>
  </svg>
);

// Check icon for success state
const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// Solana-themed spinning arc icon
const SolanaArc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" style={{ animationDuration: '2s' }}>
    <defs>
      <linearGradient id="solana-arc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9945FF" />
        <stop offset="50%" stopColor="#00D4FF" />
        <stop offset="100%" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <path
      d="M12 2a10 10 0 0 1 10 10"
      fill="none"
      stroke="url(#solana-arc-gradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

// Wave pulse animation for loading states
const VibePulse = () => (
  <div className="relative w-48 h-12 overflow-hidden">
    <svg 
      className="w-full h-full"
      viewBox="0 0 200 50"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="glow-claim">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Traveling orb with color animation */}
      <circle r="5" filter="url(#glow-claim)">
        <animate
          attributeName="fill"
          values="#9945FF;#00D4FF;#14F195;#00D4FF;#9945FF"
          dur="2s"
          repeatCount="indefinite"
        />
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path="M 0,25 C 25,15 50,35 75,25 C 100,15 125,35 150,25 C 175,15 200,25 200,25"
        />
      </circle>
      
      {/* Subtle trail/afterglow */}
      <circle r="3" opacity="0.4" filter="url(#glow-claim)">
        <animate
          attributeName="fill"
          values="#9945FF;#00D4FF;#14F195;#00D4FF;#9945FF"
          dur="2s"
          repeatCount="indefinite"
        />
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          begin="-0.1s"
          path="M 0,25 C 25,15 50,35 75,25 C 100,15 125,35 150,25 C 175,15 200,25 200,25"
        />
      </circle>
    </svg>
  </div>
);

interface VibeClaimClientProps {
  vibeId: string;
  targetUsername: string;
  claimStatus: VibeClaimStatus;
  claimerWallet?: string;
  mintAddress?: string;
  senderWallet?: string; // Masked wallet of the sender
}

export function VibeClaimClient({
  vibeId,
  targetUsername,
  claimStatus: initialClaimStatus,
  claimerWallet: initialClaimerWallet,
  mintAddress,
  senderWallet,
}: VibeClaimClientProps) {
  const { publicKey, connected, signTransaction, disconnect, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const [showNoWalletHelp, setShowNoWalletHelp] = useState(false);
  const { connection } = useConnection();
  const [xUser, setXUser] = useState<{ username: string } | null>(null);
  const [claimStatus, setClaimStatus] = useState(initialClaimStatus);
  const [claimerWallet, setClaimerWallet] = useState(initialClaimerWallet);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showClaimFlow, setShowClaimFlow] = useState(false);
  const [claimFeeSol, setClaimFeeSol] = useState<number | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

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

  const handleConnectWallet = () => {
    if (connected) {
      if (confirmDisconnect) {
        disconnect();
        setConfirmDisconnect(false);
      } else {
        setConfirmDisconnect(true);
      }
    } else if (wallets.length === 0 && isMobileBrowser()) {
      setShowNoWalletHelp(true);
    } else {
      setVisible(true);
    }
  };

  // Reset "tap again" hint after 3s
  useEffect(() => {
    if (!confirmDisconnect) return;
    const t = setTimeout(() => setConfirmDisconnect(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDisconnect]);

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
        if (prepareRes.status === 400 && prepareData.error === "This vibe has already been claimed") {
          setClaimStatus("claimed");
          if (prepareData.claimerWallet) setClaimerWallet(prepareData.claimerWallet);
          setError(null);
          setClaiming(false);
          return;
        }
        throw new Error(prepareData.error ?? "Failed to prepare claim");
      }

      // Store fee info for display
      if (prepareData.feeSol) {
        setClaimFeeSol(prepareData.feeSol);
      }

      // Step 2: Deserialize and sign the transaction
      console.log("[Claim] Deserializing transaction...");
      const transactionBuffer = Buffer.from(prepareData.transaction, "base64");
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      // User signs as fee payer
      console.log("[Claim] Requesting wallet signature...");
      let signedTransaction;
      try {
        signedTransaction = await signTransaction(transaction);
        console.log("[Claim] Transaction signed successfully");
      } catch (signErr) {
        console.error("[Claim] Signing failed:", signErr);
        throw new Error("Wallet signing failed: " + (signErr instanceof Error ? signErr.message : String(signErr)));
      }

      // Step 3: Send signed transaction to backend (backend sends to RPC)
      // This avoids client-side RPC issues on mobile
      console.log("[Claim] Sending signed transaction to backend...");
      const serializedSigned = Buffer.from(signedTransaction.serialize()).toString("base64");
      
      const confirmRes = await fetch("/api/vibe/claim/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeId,
          claimerWallet: publicKey.toBase58(),
          signedTransaction: serializedSigned,
          blockhash: prepareData.blockhash,
          lastValidBlockHeight: prepareData.lastValidBlockHeight,
        }),
      });

      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        throw new Error(confirmData.error || "Failed to confirm claim");
      }
      
      console.log("[Claim] Transaction confirmed:", confirmData.signature);

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

  // Get the vibe URL for sharing
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const vibeUrl = `${baseUrl}/v/${vibeId}`;

  // Thank sender tweet text
  const thankTweetText = `Just received a vibe on @solana! 💜 Thanks to wallet ${senderWallet || "a fellow Solana user"} for spreading the good vibes! ✨`;
  const thankTweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(thankTweetText)}&url=${encodeURIComponent(vibeUrl)}`;

  // Already claimed - show success status with pay-it-forward options
  if (claimStatus === "claimed") {
    return (
      <div className="mt-6 space-y-4">
        {/* Claimed status */}
        <div className="p-4 rounded-xl bg-[#14F195]/10 border border-[#14F195]/20">
          <div className="flex items-center justify-center gap-2 text-[#14F195]">
            <CheckIcon className="w-5 h-5" />
            <span className="font-medium">Claimed</span>
          </div>
          {claimerWallet && (
            <p className="text-center text-white/40 text-sm mt-2">
              by {claimerWallet.slice(0, 4)}...{claimerWallet.slice(-4)}
            </p>
          )}
        </div>

        {/* Pay it forward section */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#9945FF]/5 via-[#00D4FF]/5 to-[#14F195]/5 border border-white/5">
          <p className="text-center text-white/60 text-sm mb-4">
            Spread the vibes! 🌊
          </p>
          
          {/* Thank the sender */}
          <a
            href={thankTweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#080808] border border-[#1a1a1a] text-white/70 hover:text-white hover:border-[#252525] hover:bg-[#0c0c0c] transition-all mb-3"
          >
            <XLogo />
            <span>Thank the sender</span>
          </a>
          
          {/* Send a vibe forward */}
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#150d1f] to-[#0a1210] border border-[rgba(153,69,255,0.3)] text-white font-medium hover:from-[#1c1128] hover:to-[#0d1815] hover:border-[rgba(20,241,149,0.4)] hover:shadow-[0_0_15px_rgba(153,69,255,0.1),0_0_15px_rgba(20,241,149,0.1)] transition-all"
          >
            <SolanaArc />
            <span>Send your own vibe</span>
          </a>
        </div>
      </div>
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
        className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-[#150d1f] to-[#0a1210] border border-[rgba(153,69,255,0.3)] text-white font-medium transition-all hover:from-[#1c1128] hover:to-[#0d1815] hover:border-[rgba(20,241,149,0.4)] hover:shadow-[0_0_15px_rgba(153,69,255,0.1),0_0_15px_rgba(20,241,149,0.1)] hover:-translate-y-0.5"
      >
        claim vibe
      </button>
    );
  }

  // Claim flow (expanded)
  return (
    <div className="mt-6 space-y-4">
      <p className="text-center text-white/50 text-sm">
        This vibe is for <span className="text-[#14F195]">@{targetUsername}</span>
      </p>

      {/* X Connection */}
      {!xUser ? (
        <a
          href={`/api/auth/x?return_to=${encodeURIComponent(`/v/${vibeId}`)}`}
          className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl bg-[#080808] border border-[#1a1a1a] text-white/60 hover:text-white/80 hover:border-[#252525] hover:bg-[#0c0c0c] transition-all"
        >
          <XLogo />
          <span>Connect X to verify</span>
        </a>
      ) : !isRecipient ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 text-sm text-center">
            Signed in as @{xUser.username}
          </p>
          <p className="text-amber-400/60 text-xs text-center mt-1">
            Only @{targetUsername} can claim this vibe
          </p>
          <a
            href={`/api/auth/x/logout?return_to=${encodeURIComponent(`/v/${vibeId}`)}`}
            className="block text-amber-400/80 text-xs text-center mt-3 underline hover:text-amber-400 transition-colors"
          >
            Not you? Sign out
          </a>
        </div>
      ) : !connected || confirmDisconnect ? (
        <>
          <button
            onClick={handleConnectWallet}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#120a1a] to-[#0a1210] border border-[rgba(153,69,255,0.3)] text-white font-medium hover:from-[#1a0f24] hover:to-[#0d1815] hover:border-[rgba(153,69,255,0.5)] hover:shadow-[0_0_10px_rgba(153,69,255,0.1)] transition-all"
          >
            <PhantomLogo />
            <span>
              {connected && confirmDisconnect
                ? "Tap again to disconnect"
                : "Connect wallet"}
            </span>
          </button>
          {showNoWalletHelp && (
            <NoWalletConnectHelp onClose={() => setShowNoWalletHelp(false)} />
          )}
        </>
      ) : claiming ? (
        <div className="py-8 flex flex-col items-center gap-6">
          {/* Green claiming indicator box */}
          <div className="px-6 py-3 rounded-xl bg-[#14F195]/10 border border-[#14F195]/30">
            <p className="text-[#14F195] font-medium">claiming</p>
          </div>
          <VibePulse />
          <p className="text-white/30 text-sm">...vibing</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleClaim}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#150d1f] to-[#0a1210] border border-[rgba(153,69,255,0.3)] text-white font-medium transition-all hover:from-[#1c1128] hover:to-[#0d1815] hover:border-[rgba(20,241,149,0.4)] hover:shadow-[0_0_15px_rgba(153,69,255,0.1),0_0_15px_rgba(20,241,149,0.1)] hover:-translate-y-0.5"
          >
            confirm claim
          </button>
          <p className="text-center text-white/30 text-xs">
            Claim fee: ~0.001 SOL
          </p>
          <button
            type="button"
            onClick={() => setConfirmDisconnect(true)}
            className="w-full py-2 text-white/40 hover:text-white/60 text-xs transition-colors"
          >
            Disconnect wallet
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowClaimFlow(false)}
        className="w-full py-3 rounded-xl text-white/30 hover:text-white/50 text-sm transition-colors"
      >
        cancel
      </button>
    </div>
  );
}
