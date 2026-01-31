/**
 * Fund Irys account for Arweave uploads.
 * 
 * Usage: node scripts/fund-irys.js [amount-in-lamports]
 * Default: 100000000 lamports (0.1 SOL)
 */

const Irys = require("@irys/sdk").default;
const bs58 = require("bs58");
const fs = require("fs");
const path = require("path");

async function main() {
  // Amount to fund (default 0.1 SOL = 100000000 lamports)
  const amountLamports = parseInt(process.argv[2]) || 100000000;
  const amountSOL = amountLamports / 1_000_000_000;

  console.log(`\n💰 Funding Irys account with ${amountSOL} SOL (${amountLamports} lamports)\n`);

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

  // Check current balance
  const balanceBefore = await irys.getLoadedBalance();
  console.log(`📊 Current Irys balance: ${irys.utils.fromAtomic(balanceBefore)} SOL`);

  // Check wallet SOL balance
  console.log(`\n⏳ Funding Irys account...`);

  try {
    const fundTx = await irys.fund(amountLamports);
    console.log(`✅ Funded successfully!`);
    console.log(`   Transaction ID: ${fundTx.id}`);
    console.log(`   Amount: ${irys.utils.fromAtomic(fundTx.quantity)} SOL`);

    // Check new balance
    const balanceAfter = await irys.getLoadedBalance();
    console.log(`\n📊 New Irys balance: ${irys.utils.fromAtomic(balanceAfter)} SOL`);
  } catch (error) {
    console.error(`\n❌ Error funding Irys:`, error.message);
    
    if (error.message.includes("insufficient")) {
      console.log(`\n💡 Make sure your wallet has enough SOL:`);
      console.log(`   Address: ${address}`);
      console.log(`   Needed: ${amountSOL} SOL + gas fees`);
    }
    process.exit(1);
  }
}

main().catch(console.error);
