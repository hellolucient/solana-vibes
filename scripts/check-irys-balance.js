/**
 * Check Irys account balance.
 * 
 * Usage: node scripts/check-irys-balance.js
 */

const Irys = require("@irys/sdk").default;
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`\n📊 Checking Irys balance...\n`);

  // Load keypair
  const keypairPath = path.join(__dirname, "..", "mainnet-authority.json");
  if (!fs.existsSync(keypairPath)) {
    console.error("❌ mainnet-authority.json not found");
    process.exit(1);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const secretKey = Uint8Array.from(keypairData);

  // Connect to Irys mainnet
  const irys = new Irys({
    url: "https://node1.irys.xyz",
    token: "solana",
    key: secretKey,
    config: {
      providerUrl: "https://api.mainnet-beta.solana.com",
    },
  });

  // Get wallet address
  const address = irys.address;
  console.log(`📍 Wallet address: ${address}`);

  // Check balance
  const balance = await irys.getLoadedBalance();
  const balanceSOL = irys.utils.fromAtomic(balance);
  console.log(`💰 Irys balance: ${balanceSOL} SOL`);

  // Estimate uploads
  const avgImageSize = 100 * 1024; // 100KB
  const pricePerUpload = await irys.getPrice(avgImageSize);
  const uploadsRemaining = Math.floor(Number(balance) / Number(pricePerUpload));
  
  console.log(`📦 Estimated uploads remaining: ~${uploadsRemaining} images (at 100KB each)`);
}

main().catch(console.error);
