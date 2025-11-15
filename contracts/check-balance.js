require('dotenv').config();
const { ethers } = require('ethers');

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  console.log('🔍 Checking wallet...');
  console.log('📍 Address:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  const ethBalance = ethers.formatEther(balance);
  
  console.log('💰 Balance:', ethBalance, 'ETH');
  
  if (balance === 0n) {
    console.log('\n❌ No ETH! You need Base Sepolia ETH to deploy.');
    console.log('🚰 Get it from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
    console.log('📍 Send to:', wallet.address);
    process.exit(1);
  } else {
    console.log('✅ You have ETH! Ready to deploy.');
  }
}

checkBalance().catch(console.error);
