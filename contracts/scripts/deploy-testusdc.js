const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TestUSDC to Base Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("❌ No ETH balance! Get Base Sepolia ETH from:");
    console.error("   https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
    process.exit(1);
  }
  
  // Deploy TestUSDC
  const TestUSDC = await hre.ethers.getContractFactory("TestUSDC");
  const testUSDC = await TestUSDC.deploy();
  
  await testUSDC.waitForDeployment();
  const address = await testUSDC.getAddress();
  
  console.log("✅ TestUSDC deployed to:", address);
  console.log("📊 Initial supply:", hre.ethers.formatUnits(await testUSDC.totalSupply(), 6), "USDC");
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    testUSDC: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };
  
  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved to deployment-info.json");
  console.log("\n🔍 Verify on BaseScan:");
  console.log(`   https://sepolia.basescan.org/address/${address}`);
  console.log("\n📋 Next steps:");
  console.log("   1. Insert this address into chain_addresses table");
  console.log("   2. Mint tokens using the faucet() function");
  console.log("   3. Send tokens to user deposit addresses");
  
  console.log("\n💡 SQL to insert address:");
  console.log(`   INSERT INTO chain_addresses (env, chain_id, kind, address)`);
  console.log(`   VALUES ('qa', 84532, 'usdc', '${address}')`);
  console.log(`   ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
