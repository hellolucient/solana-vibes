"use client";

import { useMemo, useEffect } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from "@solana-mobile/wallet-standard-mobile";
import "@solana/wallet-adapter-react-ui/styles.css";
// PhantomTwaAdapter disabled - using MWA instead
// import { isAndroidTWA } from "@/lib/phantom-twa";
// import { PhantomTwaAdapter } from "@/components/PhantomTwaAdapter";
import { WalletCallbackHandler } from "@/components/WalletCallbackHandler";

const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

function getOrigin(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "https://solana-vibes.vercel.app";
  }
  return window.location.origin;
}

// Debug component to log wallet detection
function WalletDebugger() {
  const { wallets } = useWallet();

  useEffect(() => {
    console.log("[WalletDebugger] ===== WALLET DETAILS =====");
    wallets.forEach((w, i) => {
      console.log(`[WalletDebugger] Wallet ${i}:`, {
        name: w.adapter.name,
        readyState: w.readyState,
        icon: w.adapter.icon?.substring(0, 50) + "...",
        url: w.adapter.url,
        connected: w.adapter.connected,
      });
    });
    console.log("[WalletDebugger] ===========================");
  }, [wallets]);

  return null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const origin = getOrigin();

  // CRITICAL: Register Mobile Wallet Adapter for Android Chrome
  // This MUST be called in a non-SSR context (client-side only)
  // Matches Sudoku Clash implementation that works on Seeker
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if we're on Android Chrome (same check as Sudoku Clash)
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent) && !/Edg|OPR|Samsung/i.test(navigator.userAgent);
    
    console.log("[WalletProvider] Platform detection:", { isAndroid, isChrome });

    if (isAndroid && isChrome) {
      try {
        registerMwa({
          appIdentity: {
            name: "Solana Vibes",
            uri: origin,
            icon: "/media/vibe_icon.png",  // Must be relative URI
          },
          authorizationCache: createDefaultAuthorizationCache(),
          chains: ["solana:mainnet", "solana:devnet"],
          chainSelector: createDefaultChainSelector(),
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        });
        console.log("[WalletProvider] Mobile Wallet Adapter registered for Android Chrome");
      } catch (err) {
        console.error("[WalletProvider] Failed to register MWA:", err);
      }
    }
  }, [origin]);

  // For now, rely on MWA (Mobile Wallet Adapter) instead of custom PhantomTwaAdapter.
  // MWA should handle Phantom, Seed Vault, and other wallets on Seeker/Android.
  // TODO: Re-enable PhantomTwaAdapter if MWA doesn't work for Phantom in TWA.
  const wallets = useMemo(() => {
    console.log("[WalletProvider] Using MWA-only mode (no custom adapters)");
    return [];
  }, []);

  // Enable autoConnect like Sudoku Clash - MWA handles it properly
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletCallbackHandler />
          <WalletDebugger />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
