"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import { NoWalletConnectHelp } from "@/components/NoWalletConnectHelp";

// Phantom logo SVG component
const PhantomLogo = () => (
  <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" rx="26.8387" fill="url(#paint0_linear)"/>
    <path d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.5493 35.8327 107.727 59.7951 104.934C70.4803 103.702 80.3726 98.5837 87.5775 90.5735L103.092 73.6447C107.779 68.5434 114.902 64.9142 110.584 64.9142Z" fill="url(#paint1_linear)"/>
    <circle cx="40.7997" cy="58.4997" r="8.46667" fill="white"/>
    <circle cx="67.5997" cy="58.4997" r="8.46667" fill="white"/>
    <defs>
      <linearGradient id="paint0_linear" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#534BB1"/>
        <stop offset="1" stopColor="#551BF9"/>
      </linearGradient>
      <linearGradient id="paint1_linear" x1="64" y1="23" x2="64" y2="105" gradientUnits="userSpaceOnUse">
        <stop stopColor="white"/>
        <stop offset="1" stopColor="white" stopOpacity="0.82"/>
      </linearGradient>
    </defs>
  </svg>
);

// X (Twitter) logo SVG component
const XLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Static vibe image component
const VibeImage = () => (
  <div className="my-8 flex justify-center">
    <img 
      src="/media/vibes4b.png" 
      alt="Solana Vibes" 
      className="w-full max-w-sm h-auto opacity-90"
    />
  </div>
);

// Check icon for connected state
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// Floating orb with smooth wave motion and color transition
const VibePulse = () => (
  <div className="relative w-48 h-12 overflow-hidden">
    <svg 
      className="w-full h-full"
      viewBox="0 0 200 50"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Traveling orb with color animation */}
      <circle r="5" filter="url(#glow)">
        {/* Color transition animation */}
        <animate
          attributeName="fill"
          values="#9945FF;#00D4FF;#14F195;#00D4FF;#9945FF"
          dur="2s"
          repeatCount="indefinite"
        />
        {/* Follow smooth wave path */}
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path="M 0,25 C 25,15 50,35 75,25 C 100,15 125,35 150,25 C 175,15 200,25 200,25"
        />
      </circle>
      
      {/* Subtle trail/afterglow */}
      <circle r="3" opacity="0.4" filter="url(#glow)">
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

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function HomePage() {
  const { publicKey, connected, disconnect, signTransaction, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const [showNoWalletHelp, setShowNoWalletHelp] = useState(false);
  const { connection } = useConnection();
  const [xConnected, setXConnected] = useState<{ username: string | null; needsRefresh?: boolean } | null>(null);
  const [targetHandle, setTargetHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyVibed, setAlreadyVibed] = useState<{ username: string; senderWallet: string } | null>(null);
  const [created, setCreated] = useState<{ vibeId: string; vibeUrl: string; mintAddress: string } | null>(null);
  const [oauthError, setOauthError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tapAgainFor, setTapAgainFor] = useState<"wallet" | "twitter" | null>(null);
  const [vibeStatus, setVibeStatus] = useState<
    | null
    | { status: "pending"; vibeId: string; vibeUrl: string; senderWallet: string }
    | { status: "claimed"; vibeId: string; vibeUrl: string; mintAddress: string; solscanUrl: string }
    | { status: "none" }
  >(null);

  // Check X connection status and URL errors once on mount
  useEffect(() => {
    let cancelled = false;
    
    // Check for OAuth error in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "x_oauth") {
      setOauthError(true);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    
    async function checkX() {
      const res = await fetch("/api/auth/x/me");
      const data = await res.json();
      if (cancelled) return;
      
      if (data?.connected) {
        setXConnected({ 
          username: data.username,
          needsRefresh: data.needsRefresh || false
        });
      } else {
        setXConnected(null);
      }
    }
    
    checkX();
    
    return () => { cancelled = true; };
  }, []);

  // When X is connected, check if user has a vibe (pending to claim or already claimed)
  useEffect(() => {
    if (!xConnected?.username) {
      setVibeStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/vibe/pending");
      const data = await res.json();
      if (cancelled) return;
      if (data.hasPending) {
        setVibeStatus({
          status: "pending",
          vibeId: data.vibeId,
          vibeUrl: data.vibeUrl,
          senderWallet: data.senderWallet,
        });
      } else if (data.hasClaimed && data.mintAddress && data.solscanUrl) {
        setVibeStatus({
          status: "claimed",
          vibeId: data.vibeId,
          vibeUrl: data.vibeUrl,
          mintAddress: data.mintAddress,
          solscanUrl: data.solscanUrl,
        });
      } else {
        setVibeStatus({ status: "none" });
      }
    })();
    return () => { cancelled = true; };
  }, [xConnected?.username]);

  // Tap-again to disconnect: first tap shows hint, second tap within window performs action
  useEffect(() => {
    if (tapAgainFor === null) return;
    const t = setTimeout(() => setTapAgainFor(null), 3000);
    return () => clearTimeout(t);
  }, [tapAgainFor]);

  const handleConnectWallet = () => {
    if (connected) {
      if (tapAgainFor === "wallet") {
        disconnect();
        setTapAgainFor(null);
      } else {
        setTapAgainFor("wallet");
      }
    } else if (wallets.length === 0 && isMobileBrowser()) {
      setShowNoWalletHelp(true);
    } else {
      setVisible(true);
    }
  };

  const handleXClick = () => {
    if (!xConnected) return;
    if (tapAgainFor === "twitter") {
      setTapAgainFor(null);
      window.location.href = "/api/auth/x/logout";
    } else {
      setTapAgainFor("twitter");
    }
  };

  const sendVibe = async () => {
    setError(null);
    if (!publicKey || !signTransaction) {
      setError("Connect wallet first.");
      return;
    }
    const handle = targetHandle.trim().replace(/^@/, "");
    if (!handle || handle.length < 1) {
      setError("Enter an X username (e.g. elonmusk).");
      return;
    }

    setLoading(true);
    setAlreadyVibed(null);

    try {
      // Step 1: Prepare the transaction (backend builds and partially signs)
      const prepareRes = await fetch("/api/vibe/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: handle,
          senderWallet: publicKey.toBase58(),
        }),
      });
      const prepareData = await prepareRes.json();
      
      // Check if user was already vibed
      if (prepareData.error === "already_vibed") {
        setAlreadyVibed({
          username: handle.startsWith("@") ? handle : `@${handle}`,
          senderWallet: prepareData.senderWallet,
        });
        setLoading(false);
        return;
      }
      
      if (!prepareRes.ok) throw new Error(prepareData.error ?? "Failed to prepare vibe");

      console.log(`[sendVibe] Prepared vibe ${prepareData.vibeId}, fee: ${prepareData.feeSol} SOL`);

      // Step 2: Deserialize and sign the transaction with user's wallet
      const transactionBuffer = Buffer.from(prepareData.transaction, "base64");
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      // User signs as fee payer
      const signedTransaction = await signTransaction(transaction);
      const serializedSigned = Buffer.from(signedTransaction.serialize()).toString("base64");

      console.log("[sendVibe] Transaction signed, submitting...");

      // Step 3: Submit the signed transaction to the backend for confirmation
      const confirmRes = await fetch("/api/vibe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeId: prepareData.vibeId,
          signedTransaction: serializedSigned,
          blockhash: prepareData.blockhash,
          lastValidBlockHeight: prepareData.lastValidBlockHeight,
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error ?? "Failed to confirm vibe");

      console.log(`[sendVibe] Vibe confirmed: ${confirmData.vibeUrl}`);

      setCreated({
        vibeId: confirmData.vibeId,
        vibeUrl: confirmData.vibeUrl,
        mintAddress: confirmData.mintAddress,
      });
    } catch (e) {
      console.error("sendVibe error:", e);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const postToX = () => {
    if (!created) return;
    const handle = targetHandle.trim().startsWith("@") ? targetHandle.trim() : `@${targetHandle.trim()}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(handle)}&url=${encodeURIComponent(created.vibeUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.vibeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setCreated(null);
    setTargetHandle("");
    setError(null);
    setAlreadyVibed(null);
    setCopied(false);
  };

  const xAuthUrl = "/api/auth/x";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Title */}
        <Link href="/" className="block text-center mb-2">
          <h1 className="text-2xl font-light tracking-wide text-white/90 hover:text-white transition-colors">
            solana_vibes
          </h1>
        </Link>

        {/* Vibe Image */}
        <VibeImage />

        {oauthError && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 text-sm text-center">
              X sign-in failed. Please try again.
            </p>
          </div>
        )}

        {!created ? (
          <div className="space-y-4">
            {/* Hide form elements while minting */}
            {!loading ? (
              <>
                {/* Connect Wallet Button */}
                <button
                  onClick={handleConnectWallet}
                  className="btn-connect-wallet w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-white font-medium"
                >
                  <PhantomLogo />
                  <span>
                    {connected
                      ? tapAgainFor === "wallet"
                        ? "Tap again to disconnect"
                        : `${publicKey?.toBase58().slice(0, 4)}...${publicKey?.toBase58().slice(-4)}`
                      : "Connect wallet"}
                  </span>
                  {connected && tapAgainFor !== "wallet" && (
                    <span className="ml-auto text-vibe-teal">
                      <CheckIcon />
                    </span>
                  )}
                </button>

                {/* No wallet on mobile (e.g. iOS Safari) — show Open in Phantom / Get Phantom */}
                {showNoWalletHelp && (
                  <NoWalletConnectHelp onClose={() => setShowNoWalletHelp(false)} />
                )}

                {/* Connect X Button */}
                {xConnected ? (
                  <button
                    type="button"
                    onClick={handleXClick}
                    className="btn-connect-x w-full flex items-center gap-3 py-4 px-6 rounded-xl text-white/80 hover:text-white cursor-pointer"
                  >
                    <XLogo />
                    <span>
                      {tapAgainFor === "twitter" ? "Tap again to logout" : `@${xConnected.username}`}
                    </span>
                    {tapAgainFor !== "twitter" && (
                      <span className="ml-auto text-vibe-teal">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                ) : (
                  <a
                    href={xAuthUrl}
                    className="btn-connect-x w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-white/60 hover:text-white/80"
                  >
                    <XLogo />
                    <span>Connect X</span>
                  </a>
                )}

                {/* Vibe status (after X connected): pending, already claimed, or none */}
                {xConnected && (
                  <div
                    className={
                      vibeStatus === null
                        ? "p-4 rounded-xl bg-white/5 border border-white/10"
                        : vibeStatus.status === "pending"
                          ? "p-4 rounded-xl bg-vibe-teal/10 border border-vibe-teal/30"
                          : vibeStatus.status === "claimed"
                            ? "p-4 rounded-xl bg-vibe-blue/10 border border-vibe-blue/30"
                            : "p-4 rounded-xl bg-white/5 border border-white/10"
                    }
                  >
                    {vibeStatus === null ? (
                      <p className="text-white/40 text-sm text-center">Checking for vibes...</p>
                    ) : vibeStatus.status === "pending" ? (
                      <>
                        <p className="text-vibe-teal text-sm font-medium text-center mb-1">
                          You have a vibe waiting for you from {vibeStatus.senderWallet}
                        </p>
                        <a
                          href={vibeStatus.vibeUrl}
                          className="block text-center text-vibe-teal/90 text-xs underline hover:no-underline mt-2"
                        >
                          Claim it →
                        </a>
                      </>
                    ) : vibeStatus.status === "claimed" ? (
                      <>
                        <p className="text-[#00D4FF] text-sm font-medium text-center mb-1">
                          You&apos;ve already been vibed
                        </p>
                        <a
                          href={vibeStatus.solscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-vibe-blue/90 text-xs underline hover:no-underline mt-2"
                        >
                          View on Solscan →
                        </a>
                      </>
                    ) : (
                      <p className="text-white/50 text-sm text-center">
                        Sorry, no vibe for you...yet
                      </p>
                    )}
                  </div>
                )}

                {/* Send Vibe Section */}
                <div className="pt-4">
                  <label className="block text-sm text-white/50 mb-2">
                    Send a vibe to
                  </label>
                  <input
                    type="text"
                    value={targetHandle}
                    onChange={(e) => {
                      setTargetHandle(e.target.value);
                      setError(null);
                      setAlreadyVibed(null);
                    }}
                    placeholder="@username"
                    className="input-vibe w-full px-4 py-4 rounded-xl text-white text-base"
                  />
                </div>

                {/* Send Vibe Button */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={sendVibe}
                    disabled={!connected || !targetHandle.trim()}
                    className="btn-send-vibe w-full py-4 rounded-xl text-white font-medium text-base"
                  >
                    send vibe
                  </button>
                  
                  {/* Tooltip for disabled state */}
                  {(!connected || !targetHandle.trim()) && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {!connected 
                        ? "Connect wallet first" 
                        : "Enter a username"}
                    </div>
                  )}
                </div>

                {/* Cost Indicator */}
              </>
            ) : (
              /* Minting state - green indicator box with spinner */
              <div className="py-8 flex flex-col items-center gap-6">
                {/* Green minting indicator box */}
                <div className="px-6 py-3 rounded-xl bg-vibe-teal/10 border border-vibe-teal/30">
                  <p className="text-vibe-teal font-medium">minting</p>
                </div>
                <VibePulse />
                <p className="text-white/30 text-sm">...vibing</p>
              </div>
            )}

            {/* Cost Indicator - only show when not loading */}
            {!loading && (
              <p className="text-center text-white/30 text-sm">
                ~0.006 SOL
              </p>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {alreadyVibed && (
              <div className="p-4 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/30">
                <p className="text-[#00D4FF] text-sm text-center font-medium mb-1">
                  {alreadyVibed.username} already vibed
                </p>
                <p className="text-white/40 text-xs text-center">
                  by {alreadyVibed.senderWallet}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Success State */
          <div className="space-y-4">
            <div className="success-card rounded-xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-vibe-teal/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-vibe-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-white mb-2">vibe ready...</h2>
              <p className="text-white/50 text-sm mb-4">
                Your vibe has been minted on Solana
              </p>
              
              {created.mintAddress && (
                <p className="text-xs text-white/30 font-mono mb-4">
                  {created.mintAddress.slice(0, 12)}...{created.mintAddress.slice(-12)}
                </p>
              )}
            </div>

            {/* Vibe URL */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={created.vibeUrl}
                className="input-vibe flex-1 px-4 py-3 rounded-xl text-white/70 text-sm"
              />
              <button
                type="button"
                onClick={copyLink}
                className="btn-connect-x px-4 py-3 rounded-xl text-white/60 hover:text-white text-sm"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            
            {/* Post to X Button */}
            <button
              type="button"
              onClick={postToX}
              className="btn-post-x w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-medium"
            >
              <XLogo />
              <span>Post to X</span>
            </button>

            {/* Send Another */}
            <button
              type="button"
              onClick={reset}
              className="w-full py-3 rounded-xl text-white/40 hover:text-white/60 text-sm transition-colors"
            >
              Send another vibe
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
