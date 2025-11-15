require('dotenv').config();
const hre = require('hardhat');

async function main() {
  console.log('🚀 Sending Test USDC Deposit...\n');

  const TESTUSDC_ADDRESS = '0x5B966ca41aB58E50056EE1711c9766Ca3382F115';
  
  // This is the deposit address from your crypto_addresses table
  const DEPOSIT_ADDRESS = '0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c';
  
  // Amount to send (10 USDC for testing)
  const AMOUNT = '10';
  
  const [sender] = await hre.ethers.getSigners();
  console.log('📤 Sending from:', sender.address);
  console.log('📥 Sending to:', DEPOSIT_ADDRESS);
  console.log('💵 Amount:', AMOUNT, 'USDC\n');

  const TestUSDC = await hre.ethers.getContractFactory('TestUSDC');
  const usdc = TestUSDC.attach(TESTUSDC_ADDRESS);

  // Convert to 6 decimals (USDC uses 6 decimals)
  const amount = hre.ethers.parseUnits(AMOUNT, 6);

  // Send the USDC
  console.log('⏳ Sending transaction...');
  const tx = await usdc.transfer(DEPOSIT_ADDRESS, amount);
  
  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();
  
  console.log('\n✅ Deposit sent!');
  console.log('📍 Transaction hash:', receipt.hash);
  console.log('🔗 View on BaseScan:', `https://sepolia.basescan.org/tx/${receipt.hash}`);
  
  // Check new balance
  const balance = await usdc.balanceOf(DEPOSIT_ADDRESS);
  const formattedBalance = hre.ethers.formatUnits(balance, 6);
  console.log(`\n💰 Deposit address balance: ${formattedBalance} USDC`);
  
  console.log('\n🎯 Now check your server logs for the deposit detection!');
  console.log('   The watcher should pick this up within ~10 seconds.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

