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

  // Register Mobile Wallet Adapter so Android (including Solana Seeker) can use
  // the inbuilt Seed Vault wallet. Required for dApps in Solana Seeker dApp store.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isAndroid = /Android/i.test(navigator.userAgent);
    console.log("[WalletProvider] Platform detection:", { 
      isAndroid, 
      userAgent: navigator.userAgent,
      standalone: window.matchMedia("(display-mode: standalone)").matches
    });

    // Register MWA on any Android device (TWAs run in Chrome)
    if (isAndroid) {
      try {
        registerMwa({
          appIdentity: {
            name: "Solana Vibes",
            uri: origin,
            icon: `${origin}/media/vibe_icon.png`,
          },
          authorizationCache: createDefaultAuthorizationCache(),
          chains: ["solana:mainnet", "solana:devnet"],
          chainSelector: createDefaultChainSelector(),
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        });
        console.log("[WalletProvider] Mobile Wallet Adapter registered successfully");
      } catch (err) {
        console.error("[WalletProvider] Failed to register MWA:", err);
        alert("[DEBUG] MWA registration error: " + String(err));
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

  // In TWA: Disable autoConnect - user must tap Connect Wallet button.
  // This prevents auto-redirecting to Phantom on every load.
  // The connect() method will restore any stored session when called.
  // Outside TWA: Always autoConnect (standard wallet behavior).
  const shouldAutoConnect = useMemo(() => {
    if (typeof window === "undefined") return true;
    if (isAndroidTWA()) {
      console.log("[WalletProvider] TWA detected, autoConnect disabled");
      return false;
    }
    return true;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={shouldAutoConnect}>
        <WalletModalProvider>
          <WalletCallbackHandler />
          <WalletDebugger />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
