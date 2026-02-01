"use client";

/**
 * Shown when user taps "Connect wallet" on mobile but no wallet is detected
 * (e.g. iOS Safari — Phantom only injects in its in-app browser).
 * Offers "Open in Phantom" (deep link) and "Get Phantom" (store links).
 */
export function NoWalletConnectHelp({ onClose }: { onClose?: () => void }) {
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const phantomBrowseUrl =
    currentUrl && origin
      ? `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(origin)}`
      : "https://phantom.app/ul/browse/";

  const phantomAppStore = "https://apps.apple.com/app/phantom-solana-wallet/id1598432977";
  const phantomPlayStore = "https://play.google.com/store/apps/details?id=app.phantom";

  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-4 space-y-3">
      <p className="text-white/80 text-sm text-center">
        To connect on this device, open this app inside a wallet browser or install a Solana wallet.
      </p>
      <div className="flex flex-col gap-2">
        <a
          href={phantomBrowseUrl}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#534BB1] hover:bg-[#634BC2] text-white font-medium text-sm transition-colors"
        >
          <PhantomIcon />
          Open in Phantom
        </a>
        <a
          href={isIOS ? phantomAppStore : isAndroid ? phantomPlayStore : phantomAppStore}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors border border-white/20"
        >
          Get Phantom
        </a>
        <p className="text-white/40 text-xs text-center pt-1">
          Using Solana Seeker? Open this dApp from the Seeker app to use the built-in wallet.
        </p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-white/50 hover:text-white/70 text-sm"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

function PhantomIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="26.8387" fill="url(#phantom-a)" />
      <path
        d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.5493 35.8327 107.727 59.7951 104.934C70.4803 103.702 80.3726 98.5837 87.5775 90.5735L103.092 73.6447C107.779 68.5434 114.902 64.9142 110.584 64.9142Z"
        fill="url(#phantom-b)"
      />
      <circle cx="40.7997" cy="58.4997" r="8.46667" fill="white" />
      <circle cx="67.5997" cy="58.4997" r="8.46667" fill="white" />
      <defs>
        <linearGradient id="phantom-a" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="#534BB1" />
          <stop offset="1" stopColor="#551BF9" />
        </linearGradient>
        <linearGradient id="phantom-b" x1="64" y1="23" x2="64" y2="105" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0.82" />
        </linearGradient>
      </defs>
    </svg>
  );
}
