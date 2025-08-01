// Fix User Profile Script
// This script updates the user profile with the correct name

console.log('👤 Fixing user profile...');

// Get Supabase client from the app
const supabase = window.supabase || window.supabaseClient;

if (!supabase) {
  console.error('❌ Supabase client not found');
  return;
}

async function fixUserProfile() {
  try {
    console.log('📋 Getting current user...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }

    console.log(`✅ Found user: ${user.email}`);

    // Update user profile with proper name
    const { error: profileError } = await supabase
      .from('users')
      .update({
        username: 'genthisgenthat',
        full_name: 'Gent This Gent That',
        kyc_level: 'basic',
        is_verified: true,
        reputation_score: 85,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('❌ Error updating profile:', profileError.message);
    } else {
      console.log('✅ User profile updated successfully');
      console.log('👤 Name: Gent This Gent That');
      console.log('🏆 Username: genthisgenthat');
      console.log('⭐ Reputation: 85');
    }

    // Also update user metadata in auth
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        username: 'genthisgenthat',
        full_name: 'Gent This Gent That'
      }
    });

    if (authError) {
      console.error('❌ Error updating auth metadata:', authError.message);
    } else {
      console.log('✅ Auth metadata updated');
    }

    console.log('🎉 User profile fixed!');
    console.log('🔄 Refreshing page to show updated name...');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);

  } catch (error) {
    console.error('❌ Error fixing user profile:', error);
  }
}

// Run the fix
fixUserProfile(); 