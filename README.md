# solana_vibes

Send good vibes to anyone on X. Each vibe is a unique NFT on Solana that lives in their wallet forever.

## What it does

1. **Sender** connects their wallet and X account, enters a recipient's X handle
2. A unique NFT is minted on Solana with a custom generated image
3. Sender shares the claim link with the recipient
4. **Recipient** connects their X (to verify identity) and wallet (to receive the NFT)
5. NFT transfers to their wallet - theirs forever

**Key features:**
- Each X user can only receive one vibe (scarcity)
- Sender pays all transaction fees + a small micro-fee
- Claimer pays a small claim fee
- NFTs are Metaplex Core assets with on-chain attributes

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment (see Environment section below)
cp .env.example .env.local
# Edit .env.local with your values

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env.local` with:

```env
# Solana RPC
NEXT_PUBLIC_SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Authority wallet (signs NFT operations)
VIBE_AUTHORITY_SECRET=base58_encoded_secret_key

# Treasury wallet (receives micro-fees)
TREASURY_WALLET=your_treasury_public_key

# Fees in lamports
MINT_FEE_LAMPORTS=2000000   # 0.002 SOL
CLAIM_FEE_LAMPORTS=1000000  # 0.001 SOL

# X (Twitter) OAuth 1.0a
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Vercel Blob (image/metadata storage)
BLOB_READ_WRITE_TOKEN=your_blob_token

# Public app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database

Uses Supabase with a `vibes` table:

| Column | Type | Description |
|--------|------|-------------|
| id | text | Unique vibe ID |
| target_username | text | Recipient's X handle |
| sender_wallet | text | Sender's wallet address |
| masked_wallet | text | Masked version (C5R…JVQ) |
| mint_address | text | NFT mint address |
| vibe_number | int | Sequential vibe number |
| claim_status | text | "pending" or "claimed" |
| claimer_wallet | text | Wallet that claimed |
| claimed_at | timestamp | When claimed |
| created_at | timestamp | When created |

## Solana dApp Store (Seeker / TWA)

To ship this app to the **Solana dApp Store** (Seeker device) as an Android TWA:

1. Deploy the web app to HTTPS and set `NEXT_PUBLIC_APP_URL` to that URL.
2. In **`android/twa-manifest.json`** replace `your-production-domain.com` with your real host.
3. Follow **`android/README.md`**: create keystore, get SHA-256 fingerprint, update `public/.well-known/assetlinks.json` and `android/twa-manifest.json`, run Bubblewrap `init`, build and sign APK, then submit via Solana dApp Store.

See `cursor-rules/twa-deployment-rules.md` for the full TWA/assetlinks guide.

## Scripts

```bash
# Burn unclaimed vibes (reads from database)
node scripts/burn-vibes.mjs --dry-run  # Preview
node scripts/burn-vibes.mjs            # Actually burn

# Check Irys/Arweave balance (if using Arweave)
node scripts/check-irys-balance.js

# Fund Irys account (if using Arweave)
node scripts/fund-irys.js
```

## Routes

### Pages
| Route | Description |
|-------|-------------|
| `/` | Main app - send vibes |
| `/v/[id]` | Claim page for a specific vibe |
| `/guide` | How it works guide |

### API - Minting
| Route | Method | Description |
|-------|--------|-------------|
| `/api/vibe/prepare` | POST | Build mint transaction (sender signs) |
| `/api/vibe/confirm` | POST | Submit signed tx, generate image, update NFT |

### API - Claiming
| Route | Method | Description |
|-------|--------|-------------|
| `/api/vibe/claim/prepare` | POST | Build claim transaction |
| `/api/vibe/claim/confirm` | POST | Update database after claim |

### API - Auth
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/x` | GET | Start X OAuth flow |
| `/api/auth/x/callback` | GET | OAuth callback |
| `/api/auth/x/me` | GET | Get current X user |
| `/api/auth/x/logout` | POST | Clear X session |

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Blockchain**: Solana (Metaplex Core NFTs)
- **Wallet**: Solana Wallet Adapter (Phantom, etc.)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Vercel Blob (images, metadata)
- **Auth**: X OAuth 1.0a

## Transaction Flow

### Minting (Sender Pays)
1. Frontend calls `/api/vibe/prepare` with target username
2. Backend creates pending vibe, builds transaction with:
   - Create NFT instruction
   - Micro-fee transfer to treasury
3. Backend partially signs (authority), returns to frontend
4. Frontend signs (sender as fee payer), calls `/api/vibe/confirm`
5. Backend submits tx, generates image, uploads to Blob, updates NFT metadata

### Claiming (Claimer Pays)
1. Frontend calls `/api/vibe/claim/prepare` with wallet address
2. Backend builds transaction with:
   - Transfer NFT instruction
   - Claim fee transfer to treasury
3. Backend partially signs (authority), returns to frontend
4. Frontend signs (claimer as fee payer), submits transaction
5. Frontend calls `/api/vibe/claim/confirm` to update database

## Production Reset

To start fresh:

1. **Burn existing NFTs** (unclaimed ones):
   ```bash
   node scripts/burn-vibes.mjs
   ```

2. **Wipe database** (Supabase SQL Editor):
   ```sql
   DELETE FROM vibes;
   ```

3. **Burn claimed NFTs** manually from your wallet (Phantom → Collectibles → NFT → Burn)

Numbering automatically restarts from #1.

## Troubleshooting

### `npm install` fails on `canvas`
```bash
# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
npm install
```

### X OAuth not working
- Ensure callback URL in X Developer Portal matches your `NEXT_PUBLIC_APP_URL`
- For localhost: `http://localhost:3000/api/auth/x/callback`

### NFT not showing image
- Check Vercel Blob token is set
- Check image was uploaded (logs show URL)
- NFT metadata URI must be accessible
