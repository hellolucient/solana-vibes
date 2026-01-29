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
  const [xConnected, setXConnected] = useState<{ username: string } | null>(null);
  const [targetHandle, setTargetHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ vibeId: string; vibeUrl: string } | null>(null);

  const checkX = useCallback(async () => {
    const res = await fetch("/api/auth/x/me");
    const data = await res.json();
    if (data?.connected && data.username) {
      setXConnected({ username: data.username });
    } else {
      setXConnected(null);
    }
  }, []);

  useEffect(() => {
    checkX();
  }, [checkX]);

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
      const res = await fetch("/api/vibe/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: handle,
          senderWallet: publicKey.toBase58(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create vibe");
      setCreated({ vibeId: data.vibeId, vibeUrl: data.vibeUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const postToX = () => {
    if (!created) return;
    // Use the same @ handle from the input used to generate the vibe (no hardcoded text)
    const handle = targetHandle.trim().startsWith("@") ? targetHandle.trim() : `@${targetHandle.trim()}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(handle)}&url=${encodeURIComponent(created.vibeUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.vibeUrl);
  };

  // Use relative URL so server and client render the same (avoids hydration mismatch)
  const xAuthUrl = "/api/auth/x";
  const hasQueryError =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("error") === "x_oauth";

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-6">Solana Vibes</h1>

      {hasQueryError && (
        <p className="text-amber-500 text-sm mb-4">
          X sign-in failed. Try again or check env (X_CLIENT_ID, X_REDIRECT_URI).
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
            <span className="text-sm text-green-500">X: @{xConnected.username}</span>
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
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
            />
            <p className="text-xs text-neutral-500 mt-1">
              No API lookup — just type the handle. Scales to any number of users.
            </p>
          </section>

          <button
            type="button"
            onClick={sendVibe}
            disabled={!connected || !targetHandle.trim() || loading}
            className="w-full py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium"
          >
            {loading ? "Creating…" : "Send Vibe"}
          </button>
        </>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-green-500">Vibe created.</p>
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
        </section>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </main>
  );
}
