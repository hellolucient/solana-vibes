"use client";

import { useEffect } from "react";
import {
  decryptPhantomCallback,
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

    const phantomPubKey = params.get("phantom_encryption_public_key");
    const nonce = params.get("nonce");
    const data = params.get("data");
    const errorCode = params.get("errorCode");
    const errorMessage = params.get("errorMessage");

    const result = decryptPhantomCallback({
      phantom_encryption_public_key: phantomPubKey ?? undefined,
      nonce: nonce ?? undefined,
      data: data ?? undefined,
      errorCode: errorCode ?? undefined,
      errorMessage: errorMessage ?? undefined,
    });

    if (result) {
      storePhantomSession(
        result.publicKey,
        result.session,
        result.phantomEncryptionPublicKey
      );
    }

    // Redirect to / so the app loads with a clean URL (and wallet connected if we stored session)
    window.location.replace(window.location.origin + "/");
  }, []);

  return null;
}
