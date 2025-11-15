require('dotenv').config();
const hre = require('hardhat');

async function main() {
  console.log('💰 Checking USDC Balance...\n');

  const TESTUSDC_ADDRESS = '0x5B966ca41aB58E50056EE1711c9766Ca3382F115';
  const [deployer] = await hre.ethers.getSigners();
  
  const TestUSDC = await hre.ethers.getContractFactory('TestUSDC');
  const usdc = TestUSDC.attach(TESTUSDC_ADDRESS);

  const balance = await usdc.balanceOf(deployer.address);
  const formattedBalance = hre.ethers.formatUnits(balance, 6);
  
  console.log('📍 Wallet:', deployer.address);
  console.log('💰 USDC Balance:', formattedBalance, 'USDC');
  console.log('\n✅ You have USDC! Ready to test deposits.\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

