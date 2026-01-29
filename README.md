# Solana Vibes

Send an anonymous, wallet-verified “Solana vibe” to someone on X (Twitter). Trigger deploy. The sender’s identity is anonymous except for a masked Solana wallet address embedded in an animated GIF that unfurls when the link is posted on X.

## Run locally

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Base GIF**

   Place your base animation at:

   ```
   public/media/base_pill.gif
   ```

   (e.g. use `solana_pill_multi_jolt_ultra_clean_tilted.gif` renamed or copied to `base_pill.gif`.) The GIF should have a black background, 4 sharp jolts then settle, clean edges. Generated vibe GIFs overlay footer text on every frame.

3. **Environment**

   Create `.env.local`:

   ```env
   # Solana RPC (optional; defaults to devnet)
   NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com

   # X (Twitter) OAuth 2.0 – create app at https://developer.twitter.com/
   X_CLIENT_ID=your_client_id
   X_CLIENT_SECRET=your_client_secret
   X_REDIRECT_URI=http://localhost:3000/api/auth/x/callback

   # Public app URL (required for X card unfurl and “Post to X” link)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   For production, set `NEXT_PUBLIC_APP_URL` to your deployed URL (e.g. `https://your-domain.com`).

4. **Dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Troubleshooting: `npm install` fails on `canvas`

GIF generation uses the `canvas` package (native deps). If install fails with `pkg-config: command not found` or canvas build errors:

**macOS (Homebrew):**

```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
```

Then run `npm install` again. If you skip this, the app still installs and runs (canvas is optional); “Send Vibe” will fail with a clear error until canvas is installed.

**Node version:** Some deps prefer Node `>= 20.19.0`. If you see engine warnings, upgrading Node (e.g. `nvm install 20` then `nvm use 20`) is optional but can clear them.

## Flow

1. User opens app → connects Solana wallet (Phantom) → connects X (OAuth).
2. User searches for an X account (type username; X API v2 does exact lookup).
3. User selects target → clicks “Send Vibe”.
4. App creates a vibe record, generates a unique animated GIF with masked wallet footer, and returns a public URL `/v/[id]`.
5. User clicks “Post to X” → opens Twitter Web Intent with only the vibe URL; they post from their own account.
6. When the tweet is posted, the X card unfurls the animated GIF.

## Tech

- **Next.js 14+** (App Router, TypeScript), **Tailwind CSS**
- **Solana**: wallet adapter (Phantom)
- **X**: OAuth 2.0 PKCE; user lookup only (no API tweet posting)
- **GIF**: base GIF + footer overlay per frame (gifuct-js, node canvas, gif-encoder-2)
- **Storage**: dev = JSON file under `data/`; interfaces allow swapping to Supabase later

## TODO markers in codebase

- **Storage**: Replace `lib/storage/dev-store.ts` and `IVibeStore` usage with Supabase (and/or R2 for GIFs) when moving off dev storage.
- **Abuse / rate limiting**: Add rate limits and abuse prevention (e.g. per wallet / per IP) before production.
- **Wallet message signing**: Optional: require a wallet signature when creating a vibe to prove ownership of the wallet.
- **X OAuth fallback**: Optional: allow manual X handle entry when OAuth is not configured or user skips connect (e.g. type target handle instead of search).

## Routes

| Route | Purpose |
|-------|--------|
| `GET /` | Main app: wallet, X connect, search, send vibe, post to X |
| `GET /v/[id]` | Public vibe page: same animated GIF + footer + timestamp |
| `GET /api/auth/x` | Start X OAuth (redirect to X) |
| `GET /api/auth/x/callback` | X OAuth callback; set cookie, redirect to `/` |
| `GET /api/auth/x/me` | Current X user (or 401) |
| `GET /api/x/search-users?q=` | X user lookup (requires X cookie) |
| `POST /api/vibe/create` | Create vibe + GIF; body: `targetUserId`, `targetUsername`, `senderWallet` |
| `GET /api/vibe/[id]` | Get vibe JSON (debug) |

## X card unfurl

`/v/[id]` sets `twitter:card=summary_large_image` and `twitter:image` / `og:image` to the vibe GIF URL. Set `NEXT_PUBLIC_APP_URL` so the image URL is absolute (e.g. `https://your-domain.com/media/vibes/[id].gif`).
