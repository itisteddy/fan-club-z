require('dotenv').config();
const hre = require('hardhat');

async function main() {
  console.log('🪙 Minting Test USDC...\n');

  // Get the deployed contract address
  const TESTUSDC_ADDRESS = '0x5B966ca41aB58E50056EE1711c9766Ca3382F115';
  
  // Get the deployer wallet
  const [deployer] = await hre.ethers.getSigners();
  console.log('📍 Minting to:', deployer.address);

  // Attach to the deployed contract
  const TestUSDC = await hre.ethers.getContractFactory('TestUSDC');
  const usdc = TestUSDC.attach(TESTUSDC_ADDRESS);

  // Mint 100 USDC (100 * 10^6 because USDC has 6 decimals)
  console.log('⏳ Calling faucet() to mint 100 USDC...');
  const tx = await usdc.faucet();
  
  console.log('⏳ Waiting for transaction confirmation...');
  const receipt = await tx.wait();
  
  console.log('✅ Minted 100 USDC!');
  console.log('📍 Transaction hash:', receipt.hash);
  console.log('🔗 View on BaseScan:', `https://sepolia.basescan.org/tx/${receipt.hash}`);
  
  // Check balance
  const balance = await usdc.balanceOf(deployer.address);
  const formattedBalance = hre.ethers.formatUnits(balance, 6);
  console.log(`\n💰 Your USDC balance: ${formattedBalance} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

