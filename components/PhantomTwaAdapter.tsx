"use client";

import {
  BaseWalletAdapter,
  type WalletAdapterProps,
  type WalletName,
  WalletReadyState,
  WalletError,
} from "@solana/wallet-adapter-base";
import type { Connection, PublicKey, SendOptions, TransactionSignature } from "@solana/web3.js";
import type {
  SupportedTransactionVersions,
  TransactionOrVersionedTransaction,
} from "@solana/wallet-adapter-base";
import { PublicKey as SolanaPublicKey } from "@solana/web3.js";
import {
  buildPhantomConnectUrl,
  clearStoredPhantomSession,
  getStoredPhantomSession,
  isAndroidTWA,
  isWalletCallbackPending,
  setCallbackPending,
  storeKeypairForCallback,
} from "@/lib/phantom-twa";

const PHANTOM_TWA_WALLET_NAME = "Phantom (in-app)" as WalletName<"Phantom (in-app)">;

export class PhantomTwaAdapter extends BaseWalletAdapter<"Phantom (in-app)"> {
  name = PHANTOM_TWA_WALLET_NAME;
  url = "https://phantom.app";
  icon =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHJ4PSIyNi44NCIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyKSIvPjxwYXRoIGQ9Ik0xMTAuNTg0IDY0LjkxNDJIOTkuMTQyQzk5LjE0MiA0MS43NjUxIDgwLjE3MyAyMyA1Ni43NzI0IDIzQzMzLjY2MTIgMjMgMTQuODcxNiA0MS4zMDU3IDE0LjQxMTggNjQuMDU4M0MxMy45MzYgODcuNTQ5MyAzNS44MzI3IDEwNy43MjcgNTkuNzk1MSAxMDQuOTM0QzcwLjQ4MDMgMTAzLjcwMiA4MC4zNzI2IDk4LjU4MzcgODcuNTc3NSA5MC41NzM1TDEwMy4wOTIgNzMuNjQ0N0MxMDcuNzc5IDY4LjU0MzQgMTE0LjkwMiA2NC45MTQyIDExMC41ODQgNjQuOTE0MloiIGZpbGw9InVybCgjcGFpbnQxX2xpbmVhcikiLz48Y2lyY2xlIGN4PSI0MC43OTk3IiBjeT0iNTguNDk5NyIgcj0iOC40NjY2NyIgZmlsbD0id2hpdGUiLz48Y2lyY2xlIGN4PSI2Ny41OTk3IiBjeT0iNTguNDk5NyIgcj0iOC40NjY2NyIgZmlsbD0id2hpdGUiLz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXIiIHg1PSI2NCIgeTE9IjAiIHgyPSI2NCIgeTI9IjEyOCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIHN0b3BDb2xvcj0iIzUzNEJCMSEiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3BDb2xvcj0iIzU1MUJGOSIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyIiB4MT0iNjQiIHkxPSIyMyIgeDI9IjY0IiB5Mj0iMTA1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agc3RvcENvbG9yPSJ3aGl0ZSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcENvbG9yPSJ3aGl0ZSIgc3RvcE9wYWNpdHk9IjAuODIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48L3N2Zz4=";

  private _publicKey: SolanaPublicKey | null = null;
  private _connecting = false;
  private _readyState: WalletReadyState = WalletReadyState.NotDetected;
  supportedTransactionVersions = new Set(["legacy", 0]) as SupportedTransactionVersions;

  constructor() {
    super();
    if (typeof window !== "undefined" && isAndroidTWA()) {
      this._readyState = WalletReadyState.Installed;
      console.log("[PhantomTwaAdapter] Initialized, readyState: Installed");
      // Don't restore session here - let connect() handle it so we can properly emit events
    }
  }

  get publicKey(): SolanaPublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async connect(): Promise<void> {
    // Very visible logging
    console.log("🟣 [PhantomTwaAdapter] connect() CALLED!");
    alert("Phantom connect() called - will redirect to Phantom");
    
    if (this._connecting) {
      console.log("🟣 [PhantomTwaAdapter] Already connecting, skipping");
      return;
    }
    
    if (this._publicKey) {
      console.log("🟣 [PhantomTwaAdapter] Already have publicKey, emitting connect");
      this.emit("connect", this._publicKey);
      return;
    }

    // Check if we're on a callback URL - let the callback handler process it
    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet_callback") === "1") {
      console.log("🟣 [PhantomTwaAdapter] On callback URL, letting handler process it");
      return;
    }
    
    // Clear any stale pending flag
    setCallbackPending(false);

    // Check for stored session - if we have one, restore it instead of redirecting
    const stored = getStoredPhantomSession();
    if (stored) {
      try {
        this._publicKey = new SolanaPublicKey(stored.publicKey);
        console.log("🟣 [PhantomTwaAdapter] Restored session for", stored.publicKey);
        this.emit("connect", this._publicKey);
        return;
      } catch (err) {
        console.error("🟣 [PhantomTwaAdapter] Failed to restore session:", err);
        clearStoredPhantomSession();
      }
    }

    // No stored session - redirect to Phantom to connect
    this._connecting = true;
    this.emit("readyStateChange", WalletReadyState.Installed);

    try {
      const origin = window.location.origin;
      const { url, keypair } = buildPhantomConnectUrl({
        appUrl: origin,
        cluster: "mainnet-beta",
      });
      storeKeypairForCallback(keypair);
      setCallbackPending(true);
      
      console.log("🟣 [PhantomTwaAdapter] Phantom URL:", url);
      alert("Redirecting to: " + url);
      
      // Try multiple redirect methods - TWA might block some
      // Method 1: Create and click an anchor element
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      
      // Method 2: Fallback to location.href after a small delay
      setTimeout(() => {
        window.location.href = url;
      }, 100);
      
    } catch (err) {
      console.error("🟣 [PhantomTwaAdapter] Error:", err);
      alert("Error: " + String(err));
      setCallbackPending(false);
      this.emit("error", err instanceof WalletError ? err : new WalletError(String(err), err));
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    clearStoredPhantomSession();
    this._publicKey = null;
    this.emit("disconnect");
  }

  async sendTransaction(
    transaction: TransactionOrVersionedTransaction<WalletAdapterProps["supportedTransactionVersions"]>,
    connection: Connection,
    options?: SendOptions
  ): Promise<TransactionSignature> {
    const publicKey = this.publicKey;
    if (!publicKey) throw new Error("Wallet not connected");

    // In TWA we use Phantom deep link for signing. Opening the sign URL navigates away;
    // when the user returns, the callback handler broadcasts the tx and stores the result.
    // The Promise cannot resolve after navigation, so we throw with instructions.
    // A full implementation would store pending sign state and handle the callback.
    throw new WalletError(
      "Signing in the app: after connecting with Phantom (in-app), use the in-app browser flow for transactions, or use the standard Phantom wallet when in a browser."
    );
  }
}
