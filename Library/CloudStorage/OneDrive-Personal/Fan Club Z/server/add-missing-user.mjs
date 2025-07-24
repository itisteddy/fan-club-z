// Quick fix: Add the missing user that frontend is trying to login with
import { databaseStorage } from '../src/services/databaseStorage.js';
import bcrypt from 'bcrypt';

async function addMissingUser() {
  console.log('🔧 Adding missing user for frontend login...\n');
  
  try {
    // Check if user already exists
    const existingUser = await databaseStorage.getUserByEmail('fausty@fcz.app');
    
    if (existingUser) {
      console.log('✅ User fausty@fcz.app already exists');
      console.log('   ID:', existingUser.id);
      console.log('   Username:', existingUser.username);
      console.log('   Has password:', !!existingUser.password);
      return;
    }
    
    // Create the missing user
    console.log('👤 Creating user fausty@fcz.app...');
    const hashedPassword = await bcrypt.hash('demo123', 10); // Same password as demo user
    
    const newUser = await databaseStorage.createUser({
      email: 'fausty@fcz.app',
      username: 'fausty',
      password: hashedPassword,
      firstName: 'Fausty',
      lastName: 'User',
      phone: '+1234567899',
      dateOfBirth: '1990-01-01',
      walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
      kycLevel: 'basic',
      walletBalance: 1000 // Give them $1000 starting balance
    });
    
    console.log('✅ User created successfully!');
    console.log('   ID:', newUser.id);
    console.log('   Email:', newUser.email);
    console.log('   Username:', newUser.username);
    console.log('   Balance:', newUser.walletBalance);
    console.log('\n🎉 Frontend login should now work with:');
    console.log('   Email: fausty@fcz.app');
    console.log('   Password: demo123');
    
  } catch (error) {
    console.error('❌ Error adding user:', error.message);
    console.error('Full error:', error);
  }
}

// Run the fix
addMissingUser().then(() => {
  console.log('\n✅ User addition complete');
  process.exit(0);
}).catch(error => {
  console.error('\n🔥 Failed to add user:', error);
  process.exit(1);
});
