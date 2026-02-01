/**
 * Phantom TWA (Trusted Web Activity) helpers.
 * When the app runs inside the Android TWA, Phantom's HTTPS redirect opens in the
 * browser instead of the app. We use a custom scheme (solanavibes://callback) so
 * the redirect comes back to the TWA. This module builds the connect URL and
 * handles the callback.
 */

import * as nacl from "tweetnacl";
import bs58 from "bs58";

export const TWA_REDIRECT_SCHEME = "solanavibes://callback";

const STORAGE_KEYPAIR = "phantom_twa_dapp_keypair";
const STORAGE_SESSION = "phantom_twa_session";
const STORAGE_PUBLIC_KEY = "phantom_twa_public_key";
const STORAGE_PHANTOM_PUBKEY = "phantom_twa_phantom_pubkey";
const STORAGE_CALLBACK_PENDING = "phantom_twa_callback_pending";

export function isAndroidTWA(): boolean {
  if (typeof window === "undefined") return false;
  const isAndroid = /Android/i.test(navigator.userAgent);
  // Standalone display (e.g. TWA or PWA) on Android
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isAndroid && isStandalone;
}

/**
 * Check if we're in the middle of a wallet callback (to prevent autoConnect from
 * triggering another connection while we're processing the return from Phantom).
 */
export function isWalletCallbackPending(): boolean {
  if (typeof window === "undefined") return false;
  // Check URL for wallet_callback param
  const params = new URLSearchParams(window.location.search);
  if (params.get("wallet_callback") === "1") return true;
  // Check storage flag (set before redirect to Phantom)
  try {
    return sessionStorage.getItem(STORAGE_CALLBACK_PENDING) === "1";
  } catch {
    return false;
  }
}

export function setCallbackPending(pending: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (pending) {
      sessionStorage.setItem(STORAGE_CALLBACK_PENDING, "1");
    } else {
      sessionStorage.removeItem(STORAGE_CALLBACK_PENDING);
    }
  } catch {
    // ignore
  }
}

export function getStoredPhantomSession(): { publicKey: string; session: string } | null {
  if (typeof window === "undefined") return null;
  try {
    // Use localStorage for persistence across app restarts (sessionStorage clears on close)
    const pk = localStorage.getItem(STORAGE_PUBLIC_KEY);
    const session = localStorage.getItem(STORAGE_SESSION);
    if (pk && session) return { publicKey: pk, session };
  } catch {
    // ignore
  }
  return null;
}

export function clearStoredPhantomSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_PUBLIC_KEY);
    localStorage.removeItem(STORAGE_SESSION);
    localStorage.removeItem(STORAGE_PHANTOM_PUBKEY);
    localStorage.removeItem(STORAGE_KEYPAIR);
    sessionStorage.removeItem(STORAGE_CALLBACK_PENDING);
    console.log("[phantom-twa] Session cleared");
  } catch {
    // ignore
  }
}

/**
 * Generate a keypair and build Phantom connect URL with custom redirect so
 * the callback returns to the TWA. Uses phantom:// so the system opens the
 * Phantom app instead of loading the HTTPS URL inside the TWA (which would
 * show "install Phantom" in-browser).
 */
export function buildPhantomConnectUrl(params: {
  appUrl: string;
  cluster?: "mainnet-beta" | "devnet" | "testnet";
}): { url: string; keypair: nacl.BoxKeyPair } {
  const keypair = nacl.box.keyPair() as nacl.BoxKeyPair;
  const publicKeyBase58 = bs58.encode(keypair.publicKey);

  const search = new URLSearchParams({
    app_url: params.appUrl,
    dapp_encryption_public_key: publicKeyBase58,
    redirect_link: TWA_REDIRECT_SCHEME,
    cluster: params.cluster ?? "mainnet-beta",
  });

  // phantom:// opens the Phantom app; https://phantom.app/ul/... loads in the TWA and shows "install" page
  const url = `phantom://v1/connect?${search.toString()}`;

  return { url, keypair };
}

export function storeKeypairForCallback(keypair: { publicKey: Uint8Array; secretKey: Uint8Array }): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify({
      publicKey: Array.from(keypair.publicKey),
      secretKey: Array.from(keypair.secretKey),
    });
    // Use localStorage so keypair persists even if TWA process is killed while in Phantom
    localStorage.setItem(STORAGE_KEYPAIR, raw);
    console.log("[phantom-twa] Keypair stored for callback");
  } catch (err) {
    console.error("[phantom-twa] Failed to store keypair:", err);
  }
}

function getStoredKeypair(): nacl.BoxKeyPair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYPAIR);
    if (!raw) {
      console.log("[phantom-twa] No stored keypair found");
      return null;
    }
    const { publicKey, secretKey } = JSON.parse(raw) as {
      publicKey: number[];
      secretKey: number[];
    };
    console.log("[phantom-twa] Keypair retrieved from storage");
    return {
      publicKey: new Uint8Array(publicKey),
      secretKey: new Uint8Array(secretKey),
    };
  } catch (err) {
    console.error("[phantom-twa] Failed to retrieve keypair:", err);
    return null;
  }
}

/**
 * Parse Phantom connect callback from URL params and decrypt the payload.
 * Returns { publicKey, session, phantomEncryptionPublicKey } or null on error.
 */
export function decryptPhantomCallback(params: {
  phantom_encryption_public_key?: string;
  nonce?: string;
  data?: string;
  errorCode?: string;
  errorMessage?: string;
}): { publicKey: string; session: string; phantomEncryptionPublicKey: string } | null {
  console.log("[phantom-twa] decryptPhantomCallback called");
  
  if (params.errorCode) {
    console.error("[phantom-twa] Phantom returned error:", params.errorCode, params.errorMessage);
    return null;
  }

  const phantomPubKey = params.phantom_encryption_public_key;
  const nonceB58 = params.nonce;
  const dataB58 = params.data;
  if (!phantomPubKey || !nonceB58 || !dataB58) {
    console.error("[phantom-twa] Missing required params:", { 
      hasPhantomPubKey: !!phantomPubKey, 
      hasNonce: !!nonceB58, 
      hasData: !!dataB58 
    });
    return null;
  }

  const keypair = getStoredKeypair();
  if (!keypair) {
    console.error("[phantom-twa] No keypair found - was it lost when navigating to Phantom?");
    return null;
  }

  try {
    const phantomPub = bs58.decode(phantomPubKey);
    const nonce = bs58.decode(nonceB58);
    const ciphertext = bs58.decode(dataB58);

    const sharedSecret = nacl.scalarMult(keypair.secretKey, phantomPub);
    const decrypted = nacl.secretbox.open(ciphertext, nonce, sharedSecret);
    if (!decrypted) {
      console.error("[phantom-twa] Failed to decrypt - shared secret mismatch");
      return null;
    }

    const json = new TextDecoder().decode(decrypted);
    const payload = JSON.parse(json) as { public_key?: string; session?: string };
    const publicKey = payload.public_key;
    const session = payload.session;
    if (!publicKey || !session) {
      console.error("[phantom-twa] Missing publicKey or session in decrypted payload");
      return null;
    }

    console.log("[phantom-twa] Successfully decrypted callback for", publicKey);
    return { publicKey, session, phantomEncryptionPublicKey: phantomPubKey };
  } catch (err) {
    console.error("[phantom-twa] Decryption error:", err);
    return null;
  }
}

/**
 * Store Phantom session after successful callback so the adapter can use it.
 * Uses localStorage for persistence across app restarts.
 * Does NOT remove the dapp keypair so we can use it for signTransaction/signMessage.
 */
export function storePhantomSession(
  publicKey: string,
  session: string,
  phantomEncryptionPublicKey: string
): void {
  if (typeof window === "undefined") return;
  try {
    // Use localStorage for persistence across app restarts
    localStorage.setItem(STORAGE_PUBLIC_KEY, publicKey);
    localStorage.setItem(STORAGE_SESSION, session);
    localStorage.setItem(STORAGE_PHANTOM_PUBKEY, phantomEncryptionPublicKey);
    // Clear the pending flag since we've successfully connected
    sessionStorage.removeItem(STORAGE_CALLBACK_PENDING);
    console.log("[phantom-twa] Session stored successfully for", publicKey);
  } catch (err) {
    console.error("[phantom-twa] Failed to store session:", err);
  }
}

export function getPhantomSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_SESSION);
}

/** Full session data needed for signing (includes dapp keypair + Phantom's key). */
export function getPhantomSessionForSigning(): {
  session: string;
  dappKeypair: { publicKey: Uint8Array; secretKey: Uint8Array };
  phantomPublicKeyBase58: string;
} | null {
  if (typeof window === "undefined") return null;
  const session = localStorage.getItem(STORAGE_SESSION);
  const phantomPub = localStorage.getItem(STORAGE_PHANTOM_PUBKEY);
  const kp = getStoredKeypair();
  if (!session || !phantomPub || !kp) return null;
  return { session, dappKeypair: kp, phantomPublicKeyBase58: phantomPub };
}
