"use client";

import { useEffect } from "react";
import {
  decryptPhantomCallback,
  setCallbackPending,
  storePhantomSession,
} from "@/lib/phantom-twa";

/**
 * Handles wallet callback when returning from Phantom (or other wallets) in the TWA.
 * When the URL has wallet_callback=1 and Phantom params, we decrypt and store the session,
 * then redirect to / so the user lands on the app with the wallet connected.
 */
export function WalletCallbackHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet_callback") !== "1") return;

    console.log("[WalletCallbackHandler] Processing wallet callback...");

    const phantomPubKey = params.get("phantom_encryption_public_key");
    const nonce = params.get("nonce");
    const data = params.get("data");
    const errorCode = params.get("errorCode");
    const errorMessage = params.get("errorMessage");

    // Log what we received (without sensitive data)
    console.log("[WalletCallbackHandler] Callback params:", {
      hasPhantomPubKey: !!phantomPubKey,
      hasNonce: !!nonce,
      hasData: !!data,
      errorCode,
      errorMessage,
    });

    if (errorCode || errorMessage) {
      console.error("[WalletCallbackHandler] Phantom returned error:", errorCode, errorMessage);
      // Clear pending flag since we're done (with error)
      setCallbackPending(false);
      // Redirect to / with error indicator
      window.location.replace(window.location.origin + "/?wallet_error=1");
      return;
    }

    const result = decryptPhantomCallback({
      phantom_encryption_public_key: phantomPubKey ?? undefined,
      nonce: nonce ?? undefined,
      data: data ?? undefined,
      errorCode: errorCode ?? undefined,
      errorMessage: errorMessage ?? undefined,
    });

    if (result) {
      console.log("[WalletCallbackHandler] Successfully decrypted callback, storing session for:", result.publicKey);
      storePhantomSession(
        result.publicKey,
        result.session,
        result.phantomEncryptionPublicKey
      );
    } else {
      console.error("[WalletCallbackHandler] Failed to decrypt callback - check if keypair was stored correctly");
      // Clear pending flag since decryption failed
      setCallbackPending(false);
    }

    // Redirect to / so the app loads with a clean URL (and wallet connected if we stored session)
    console.log("[WalletCallbackHandler] Redirecting to clean URL...");
    window.location.replace(window.location.origin + "/");
  }, []);

  return null;
}
