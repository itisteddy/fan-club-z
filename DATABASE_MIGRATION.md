# 🗄️ Database Migration Guide

Since your Supabase connection is working but the database tables don't exist yet, we need to set up the database schema. Here are **two options** to choose from:

## 🎯 **Option 1: Quick Setup (Recommended)**

This is the fastest way to get started:

### 1. Run the Database Setup Script

From the **server directory**:

```bash
cd server
npm run db:setup
```

This will:
- ✅ Check if tables exist
- ✅ Create sample data if tables are available
- ✅ Give you instructions if tables need to be created first

### 2. If Tables Don't Exist

If you see an error about tables not existing, you'll need to create them first using the Supabase dashboard:

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun
   - Click on "SQL Editor" in the left sidebar

2. **Copy the Schema SQL**
   - Open the file: `server/src/scripts/setup-database.sql`
   - Copy ALL the contents (it's a long file with all table definitions)

3. **Run the SQL**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" to execute the schema
   - Wait for it to complete (should take 30-60 seconds)

4. **Run Setup Again**
   ```bash
   npm run db:setup
   ```

## 🚀 **Option 2: Automatic Migration (Advanced)**

From the **server directory**:

```bash
cd server
npm run db:migrate
```

This runs a more comprehensive migration that tries to execute the SQL automatically.

## ✅ **Verification**

After running either option, verify everything worked:

```bash
# Test the Supabase connection and tables
npm run test:supabase
```

You should see:
- ✅ All environment variables configured
- ✅ Database tables accessible
- ✅ Sample data created
- ✅ Helper functions working

## 📊 **What Gets Created**

The database setup creates:

### **Core Tables**
- `users` - User profiles and authentication
- `wallets` - Multi-currency wallet balances  
- `wallet_transactions` - Financial transaction history
- `predictions` - User-created prediction scenarios
- `prediction_options` - Available outcomes for predictions
- `prediction_entries` - Individual user predictions
- `clubs` - Community groups
- `club_members` - Club membership records
- `comments` - Social comments on predictions
- `reactions` - Likes, cheers, etc.

### **Sample Data**
- 🧑‍💼 **5 sample users** (including admin)
- 💰 **Sample wallets** with NGN balances
- 🏟️ **5 sample clubs** (sports, crypto, reality TV, etc.)
- 📊 **Sample predictions** (sports, crypto, entertainment)
- 💬 **Sample comments and reactions**

### **Key Features Enabled**
- ✅ User authentication and profiles
- ✅ Multi-currency wallet system
- ✅ Prediction creation and participation
- ✅ Club communities and memberships
- ✅ Social engagement (comments, reactions)
- ✅ Transaction tracking
- ✅ Real-time updates

## 🎯 **Next Steps After Migration**

Once the database is set up:

1. **Start the application**:
   ```bash
   # From project root
   npm run dev
   ```

2. **Test the application**:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3001

3. **Test sample data**:
   - Browse sample predictions
   - Join sample clubs  
   - Test wallet functionality
   - Try social features

## 🔍 **Troubleshooting**

### Error: "relation does not exist"
- The database tables haven't been created yet
- Follow **Option 1** above to create them via Supabase dashboard

### Error: "permission denied"
- Check your `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Make sure you're using the service role key, not the anon key

### Error: "connection timeout"
- Check your internet connection
- Verify your Supabase project is active
- Confirm your `VITE_SUPABASE_URL` is correct

### Tables exist but no data
- Run: `npm run db:setup` to create sample data
- Or run: `npm run db:seed` if that script is available

## 🆘 **Need Help?**

If you encounter issues:

1. **Check the setup script output** - it will tell you exactly what to do
2. **Verify your Supabase configuration** with: `npm run verify:supabase`
3. **Check Supabase dashboard** - look for any error messages
4. **Review the SQL script** - make sure it ran completely in the SQL Editor

## 📱 **Mobile Testing**

Once everything is set up, you can test on mobile using the network IP addresses that were shown earlier:
- **Frontend**: http://172.20.2.239:5173/
- **Backend**: http://172.20.2.239:3001/

The database will work the same across all devices since it's hosted on Supabase!

---

**Ready to proceed?** Choose **Option 1** for the quickest setup! 🚀
