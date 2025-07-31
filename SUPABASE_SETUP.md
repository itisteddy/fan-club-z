# 🔗 Supabase Configuration for Deployment

## ✅ Your Supabase Setup

Since you already have Supabase configured, here's what you need to verify and configure for deployment:

## 📋 Required Environment Variables

### **Frontend (Vercel)**
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://your-backend.onrender.com
```

### **Backend (Render)**
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
PORT=10000
CLIENT_URL=https://your-vercel-app.vercel.app
JWT_SECRET=your_jwt_secret_here
```

## 🔍 How to Find Your Supabase Credentials

1. **Go to [supabase.com](https://supabase.com)**
2. **Select your project**
3. **Go to Settings → API**
4. **Copy these values:**
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🗄️ Database Schema Verification

Make sure your Supabase database has the required tables:

### **Core Tables**
- ✅ `users` - User accounts and profiles
- ✅ `predictions` - Prediction scenarios
- ✅ `prediction_options` - Prediction outcomes
- ✅ `prediction_entries` - User predictions
- ✅ `clubs` - User clubs/groups
- ✅ `club_members` - Club memberships
- ✅ `comments` - User comments
- ✅ `reactions` - User reactions
- ✅ `wallet_transactions` - Financial transactions

### **Check Row Level Security (RLS)**
- ✅ RLS policies are configured
- ✅ Users can only access their own data
- ✅ Public read access for predictions and clubs

## 🔐 Security Configuration

### **Authentication**
- ✅ Email/password authentication enabled
- ✅ JWT tokens configured
- ✅ Session management set up

### **CORS Settings**
- ✅ Add your Vercel domain to allowed origins
- ✅ Add your Render domain to allowed origins

## 🚀 Deployment Steps

1. **Get Supabase Credentials** (from Settings → API)
2. **Deploy Frontend to Vercel**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. **Deploy Backend to Render**
   - Add all Supabase environment variables
4. **Update CORS in Supabase**
   - Add your deployment URLs

## 🧪 Testing Supabase Connection

### **Frontend Test**
```javascript
// Test in browser console
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('API URL:', import.meta.env.VITE_API_URL);
```

### **Backend Test**
```bash
# Test health endpoint
curl https://your-backend.onrender.com/health
```

## 🔧 Troubleshooting

### **Common Issues**

1. **CORS Errors**
   - Add deployment URLs to Supabase CORS settings
   - Check environment variables are set correctly

2. **Authentication Failures**
   - Verify JWT secret is set
   - Check Supabase service role key

3. **Database Connection**
   - Verify Supabase URL format
   - Check service role key permissions

### **Supabase Dashboard**
- **Monitor**: Real-time logs and performance
- **Database**: View tables and data
- **Auth**: User management
- **API**: Test endpoints

## 📞 Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Community**: [supabase.com/discord](https://supabase.com/discord)
- **GitHub**: [github.com/supabase/supabase](https://github.com/supabase/supabase)

---

**Your Supabase setup is ready!** 🎉
Just add the credentials to your deployment environment variables.
