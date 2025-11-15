// Run this to create a new test wallet for Base Sepolia
// Usage: node create-test-wallet.js

const { Wallet } = require('ethers');

console.log('🔐 Creating new test wallet for Base Sepolia...\n');

// Create a random wallet
const wallet = Wallet.createRandom();

console.log('✅ Wallet created!\n');
console.log('📋 SAVE THESE DETAILS:\n');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
console.log('\n⚠️  IMPORTANT:');
console.log('1. Save the private key in contracts/.env');
console.log('2. NEVER commit .env to git');
console.log('3. Get Base Sepolia ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
console.log('\n📝 Add to contracts/.env:');
console.log(`DEPLOYER_PRIVATE_KEY=${wallet.privateKey}`);

