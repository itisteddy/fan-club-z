"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestUsers = createTestUsers;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const supabase = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.serviceKey);
const testUsers = [
    {
        email: 'admin@fanclubz.com',
        password: 'TestPassword123!',
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        full_name: 'Admin User',
    },
    {
        email: 'john.doe@fanclubz.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'john_doe',
        full_name: 'John Doe',
    },
    {
        email: 'jane.smith@fanclubz.com',
        password: 'TestPassword123!',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'jane_smith',
        full_name: 'Jane Smith',
    },
    {
        email: 'mike.wilson@fanclubz.com',
        password: 'TestPassword123!',
        firstName: 'Mike',
        lastName: 'Wilson',
        username: 'mike_wilson',
        full_name: 'Mike Wilson',
    },
    {
        email: 'sarah.jones@fanclubz.com',
        password: 'TestPassword123!',
        firstName: 'Sarah',
        lastName: 'Jones',
        username: 'sarah_jones',
        full_name: 'Sarah Jones',
    },
];
async function createTestUsers() {
    console.log('🔐 Creating test users in Supabase Auth...');
    for (const userData of testUsers) {
        try {
            console.log(`Creating user: ${userData.email}`);
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: {
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    full_name: userData.full_name,
                },
            });
            if (authError) {
                console.error(`❌ Error creating user ${userData.email}:`, authError.message);
                continue;
            }
            if (authData.user) {
                console.log(`✅ Created user: ${userData.email} (ID: ${authData.user.id})`);
                const { error: profileError } = await supabase
                    .from('users')
                    .insert({
                    id: authData.user.id,
                    email: userData.email,
                    username: userData.username,
                    full_name: userData.full_name,
                    kyc_level: 'basic',
                    is_verified: true,
                    reputation_score: Math.floor(Math.random() * 50) + 50,
                });
                if (profileError) {
                    console.error(`❌ Error creating profile for ${userData.email}:`, profileError.message);
                }
                else {
                    console.log(`✅ Created profile for: ${userData.email}`);
                }
            }
        }
        catch (error) {
            console.error(`❌ Unexpected error creating user ${userData.email}:`, error);
        }
    }
    console.log('🎉 Test user creation completed!');
    console.log('\n📋 Test User Credentials:');
    console.log('========================');
    testUsers.forEach(user => {
        console.log(`Email: ${user.email}`);
        console.log(`Password: ${user.password}`);
        console.log('---');
    });
}
if (require.main === module) {
    createTestUsers()
        .then(() => {
        console.log('✅ Test user creation completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Test user creation failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=create-test-users.js.map