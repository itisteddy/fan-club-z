#!/bin/bash

echo "🗃️ Database Setup & Seeding Script"
echo "==================================\n"

cd server

# Check if database exists and has users
echo "1️⃣ Checking current database state..."
if [ -f "dev.db" ]; then
    echo "✅ Database file exists"
    
    # Quick check if users table has data
    echo "🔍 Checking for existing users..."
    USER_COUNT=$(sqlite3 dev.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    echo "   Found $USER_COUNT users in database"
    
    if [ "$USER_COUNT" -eq "0" ]; then
        echo "❌ Database is empty - needs seeding"
        NEEDS_SEEDING=true
    else
        echo "✅ Database has users"
        NEEDS_SEEDING=false
        
        # Show available users
        echo "\n📧 Available demo users:"
        sqlite3 dev.db "SELECT email, username FROM users LIMIT 5;" 2>/dev/null || echo "   Could not read users"
    fi
else
    echo "❌ Database file not found - needs migration and seeding"
    NEEDS_SEEDING=true
fi

if [ "$NEEDS_SEEDING" = true ]; then
    echo "\n2️⃣ Running database migrations..."
    npm run db:migrate
    
    echo "\n3️⃣ Seeding database with demo data..."
    npm run db:seed
    
    echo "\n✅ Database setup complete!"
    echo "\n📧 You can now log in with:"
    echo "   Email: demo@fanclubz.app"
    echo "   Password: demo123"
    echo "\n   Or:"
    echo "   Email: alex@example.com"
    echo "   Password: password123"
else
    echo "\n✅ Database is ready!"
    echo "\n📧 Available demo users to login with:"
    sqlite3 dev.db "SELECT '   Email: ' || email || ', Username: ' || username FROM users LIMIT 4;" 2>/dev/null
    echo "   All users have password: password123 (except demo@fanclubz.app uses: demo123)"
fi
