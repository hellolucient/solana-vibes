"use client";

import { useMemo, useEffect } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

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
  // Don't explicitly add PhantomWalletAdapter - Phantom uses Wallet Standard
  // and will be auto-detected. Adding it explicitly causes duplicate registration.
  const wallets = useMemo(() => [], []);
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletDebugger />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
