const { databaseStorage } = require('./server/src/services/databaseStorage.js');

async function checkUser() {
  console.log('🔍 Checking for user with email: tb@fcz.app');
  
  try {
    const user = await databaseStorage.getUserByEmail('tb@fcz.app');
    
    if (user) {
      console.log('✅ User found:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Username:', user.username);
      console.log('- First Name:', user.firstName);
      console.log('- Last Name:', user.lastName);
      console.log('- Has Password:', !!user.password);
      console.log('- Password Length:', user.password ? user.password.length : 0);
      console.log('- Created At:', user.createdAt);
    } else {
      console.log('❌ User not found in database');
      
      // Check if any users exist at all
      console.log('\n🔍 Checking all users in database...');
      // This would require adding a getAllUsers method, but let's try a different approach
      console.log('Try registering the user again or check server logs');
    }
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('1. Database is not running');
    console.log('2. Database connection is misconfigured');
    console.log('3. Users table does not exist');
    console.log('\nTry:');
    console.log('- Restart the server');
    console.log('- Check database migrations');
    console.log('- Verify database connection');
  }
}

checkUser().then(() => {
  console.log('\n🏁 User check complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
