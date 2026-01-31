/**
 * Script to burn vibes using mint addresses from the database.
 * 
 * Usage:
 *   node scripts/burn-vibes.mjs --dry-run    # List NFTs without burning
 *   node scripts/burn-vibes.mjs              # Actually burn the NFTs
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore, fetchAssetV1, burnV1 } from "@metaplex-foundation/mpl-core";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import pkg from "bs58";
const { decode: bs58Decode } = pkg;
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  
  console.log(dryRun ? "\n🔍 DRY RUN - Listing NFTs (not burning)\n" : "\n🔥 BURNING NFTs\n");

  // Get secrets
  const authoritySecret = process.env.VIBE_AUTHORITY_SECRET;
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!authoritySecret || !rpcUrl || !supabaseUrl || !supabaseKey) {
    console.error("❌ Missing required env vars");
    process.exit(1);
  }

  // Initialize Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all mint addresses from database
  const { data: vibes, error: dbError } = await supabase
    .from("vibes")
    .select("id, target_username, mint_address, claim_status")
    .not("mint_address", "is", null);

  if (dbError) {
    console.error("❌ Database error:", dbError);
    process.exit(1);
  }

  if (!vibes || vibes.length === 0) {
    console.log("✅ No vibes in database. Nothing to burn.");
    return;
  }

  console.log(`Found ${vibes.length} vibe(s) in database:\n`);

  // Initialize Umi
  const umi = createUmi(rpcUrl).use(mplCore());
  const secretKey = bs58Decode(authoritySecret);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  console.log(`Authority: ${keypair.publicKey}\n`);

  let burned = 0;
  let skipped = 0;

  for (const vibe of vibes) {
    console.log(`  📦 Vibe #${vibe.id} for @${vibe.target_username}`);
    console.log(`     Mint: ${vibe.mint_address}`);
    console.log(`     Status: ${vibe.claim_status}`);

    if (vibe.claim_status === "claimed") {
      console.log(`     ⏭️  Skipped (already claimed - not owned by authority)\n`);
      skipped++;
      continue;
    }

    if (!dryRun) {
      try {
        // Fetch the asset to verify it exists and we own it
        const asset = await fetchAssetV1(umi, publicKey(vibe.mint_address));
        
        if (asset.owner.toString() !== keypair.publicKey.toString()) {
          console.log(`     ⏭️  Skipped (owned by ${asset.owner})\n`);
          skipped++;
          continue;
        }

        console.log(`     🔥 Burning...`);
        await burnV1(umi, {
          asset: publicKey(vibe.mint_address),
        }).sendAndConfirm(umi);
        console.log(`     ✅ Burned successfully\n`);
        burned++;
      } catch (err) {
        console.log(`     ❌ Failed: ${err.message}\n`);
        skipped++;
      }
    } else {
      console.log(`     (would be burned)\n`);
      burned++;
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`   ${burned} asset(s) ${dryRun ? "would be " : ""}burned`);
  console.log(`   ${skipped} asset(s) skipped`);
  
  if (dryRun) {
    console.log(`\n   Run without --dry-run to actually burn them.`);
  }
}

main();
