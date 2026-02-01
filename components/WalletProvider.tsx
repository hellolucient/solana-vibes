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
import { isAndroidTWA } from "@/lib/phantom-twa";
import { PhantomTwaAdapter } from "@/components/PhantomTwaAdapter";
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
    const isChrome = /Chrome/i.test(navigator.userAgent) && !/Edg|OPR|Samsung/i.test(navigator.userAgent);

    if (isAndroid && isChrome) {
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
        console.log("[WalletProvider] Mobile Wallet Adapter registered (Android/Seeker)");
      } catch (err) {
        console.error("[WalletProvider] Failed to register MWA:", err);
      }
    }
  }, [origin]);

  // In Android TWA, Phantom's HTTPS redirect opens in the browser instead of the app.
  // We add PhantomTwaAdapter which uses a custom scheme (solanavibes://callback) so
  // the redirect comes back to the TWA. User should choose "Phantom (in-app)" in the modal.
  // MWA adds Seed Vault on Android/Seeker. Wallet Standard auto-detects other wallets.
  const wallets = useMemo(() => {
    if (typeof window !== "undefined" && isAndroidTWA()) {
      return [new PhantomTwaAdapter()];
    }
    return [];
  }, []);

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
