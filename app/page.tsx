"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

// Dynamically import WalletMultiButton with SSR disabled to prevent hydration errors
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function HomePage() {
  const { publicKey, connected } = useWallet();
  const [xConnected, setXConnected] = useState<{ username: string | null; needsRefresh?: boolean } | null>(null);
  const [targetHandle, setTargetHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ vibeId: string; vibeUrl: string; mintAddress: string } | null>(null);
  const [oauthError, setOauthError] = useState(false);

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

  const sendVibe = async () => {
    setError(null);
    if (!publicKey) {
      setError("Connect wallet first.");
      return;
    }
    const handle = targetHandle.trim().replace(/^@/, "");
    if (!handle || handle.length < 1) {
      setError("Enter an X username (e.g. elonmusk).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/vibe/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: handle,
          senderWallet: publicKey.toBase58(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create vibe");

      setCreated({
        vibeId: data.vibeId,
        vibeUrl: data.vibeUrl,
        mintAddress: data.mintAddress,
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
  };

  const reset = () => {
    setCreated(null);
    setTargetHandle("");
    setError(null);
  };

  const xAuthUrl = "/api/auth/x";

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-6">Solana Vibes</h1>

      {oauthError && (
        <p className="text-amber-500 text-sm mb-4">
          X sign-in failed. Check your OAuth 1.0a settings in Twitter Developer Portal.
        </p>
      )}

      <section className="space-y-4 mb-8">
        <div className="flex items-center gap-2 flex-wrap">
          <WalletMultiButton />
          <span className="text-sm text-neutral-400">
            {connected ? `Wallet: ${publicKey?.toBase58().slice(0, 4)}…` : "Connect wallet first"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {xConnected ? (
            xConnected.username ? (
              <span className="text-sm text-green-500">X: @{xConnected.username}</span>
            ) : (
              <span className="text-sm text-green-500">X: Connected</span>
            )
          ) : (
            <a
              href={xAuthUrl}
              className="text-sm px-3 py-1.5 rounded border border-neutral-600 hover:border-neutral-500"
            >
              Connect X
            </a>
          )}
        </div>
      </section>

      {!created ? (
        <>
          <section className="mb-6">
            <label className="block text-sm text-neutral-400 mb-1">X username (type or paste handle)</label>
            <input
              type="text"
              value={targetHandle}
              onChange={(e) => {
                setTargetHandle(e.target.value);
                setError(null);
              }}
              placeholder="@elonmusk or elonmusk"
              disabled={loading}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500 disabled:opacity-50"
            />
            <p className="text-xs text-neutral-500 mt-1">
              The vibe is minted on-chain as an NFT before you tweet.
            </p>
          </section>

          <button
            type="button"
            onClick={sendVibe}
            disabled={!connected || !targetHandle.trim() || loading}
            className="w-full py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium"
          >
            {loading ? "Minting on-chain…" : "Send Vibe"}
          </button>
        </>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-green-500">Vibe minted on-chain!</p>
          
          {created.mintAddress && (
            <p className="text-xs text-neutral-500 font-mono">
              Mint: {created.mintAddress.slice(0, 8)}…{created.mintAddress.slice(-8)}
            </p>
          )}
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={created.vibeUrl}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-300"
            />
            <button
              type="button"
              onClick={copyLink}
              className="px-3 py-2 rounded border border-neutral-600 hover:border-neutral-500 text-sm"
            >
              Copy
            </button>
          </div>
          
          <button
            type="button"
            onClick={postToX}
            className="w-full py-2 rounded bg-[#1d9bf0] hover:bg-[#1a8cd8] text-sm font-medium"
          >
            Post to X
          </button>
          
          <p className="text-xs text-neutral-500">
            Opens Twitter with the vibe URL. You post from your own account.
          </p>

          <button
            type="button"
            onClick={reset}
            className="w-full py-2 rounded border border-neutral-600 hover:border-neutral-500 text-sm"
          >
            Send Another Vibe
          </button>
        </section>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </main>
  );
}
