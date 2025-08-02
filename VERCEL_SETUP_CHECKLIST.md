# Vercel Setup Checklist for Fan Club Z

## Pre-Setup (Do This First)

### ✅ Git Branch Setup
```bash
# Run this first to set up your branches
chmod +x setup-git-branches.sh
./setup-git-branches.sh
```

This creates:
- `development` → Your active work
- `staging` → Testing environment  
- `main` → Production (fanclubz.app)

### ✅ Domain Purchase (Optional but Recommended)
- Buy `fanclubz.app` from Namecheap, Cloudflare, or Google Domains
- Configure DNS with CNAME records (see full guide)

---

## Vercel Configuration

### Option 1: Single Project (Easier)
☐ Create one Vercel project  
☐ Connect to your repository  
☐ Set production branch to `main`  
☐ Add environment variables  
☐ Configure domains for each branch  

### Option 2: Multiple Projects (Recommended)
☐ Create 3 separate Vercel projects:
  - `fanclubz-production` (main branch)
  - `fanclubz-staging` (staging branch)  
  - `fanclubz-development` (development branch)
☐ Configure each with appropriate environment variables
☐ Add custom domains to each

---

## Environment Variables (Copy/Paste Ready)

```
VITE_API_URL=https://fan-club-z.onrender.com
VITE_WS_URL=wss://fan-club-z.onrender.com
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
```

**For Production:** Add `VITE_ENVIRONMENT=production` and `VITE_DEBUG=false`  
**For Staging/Dev:** Add `VITE_ENVIRONMENT=staging` and `VITE_DEBUG=true`

---

## Build Settings (Copy/Paste Ready)

```
Framework Preset: Other
Build Command: cd client && npm install && npm run build
Output Directory: client/dist
Install Command: npm install --prefix client
```

---

## Domain Configuration (If Using Custom Domain)

### DNS Records to Add:
```
Type: CNAME, Name: @, Value: cname.vercel-dns.com
Type: CNAME, Name: www, Value: cname.vercel-dns.com  
Type: CNAME, Name: staging, Value: cname.vercel-dns.com
Type: CNAME, Name: dev, Value: cname.vercel-dns.com
```

### Domains to Add in Vercel:
- `fanclubz.app` → Production project
- `www.fanclubz.app` → Redirect to fanclubz.app
- `staging.fanclubz.app` → Staging project
- `dev.fanclubz.app` → Development project

---

## Testing Deployment

```bash
# Test development
npm run deploy:dev

# Test staging  
npm run deploy:staging

# Test production (requires confirmation)
npm run deploy:production
```

---

## Current Status vs Future State

### Currently:
- Your app is at: `https://fan-club-z.vercel.app`
- All development affects this URL
- No stable production environment

### After Setup:
- **Production**: `https://fanclubz.app` (stable, main branch)
- **Staging**: `https://staging.fanclubz.app` (testing)
- **Development**: `https://dev.fanclubz.app` (active development)
- **Downloads**: `https://fanclubz.app/download` (landing page)

---

## Why This Setup Is Better

✅ **Professional Domain**: Users see fanclubz.app instead of Vercel subdomain  
✅ **Stable Production**: Main branch stays stable, unaffected by development  
✅ **Testing Environment**: Staging environment to test before production  
✅ **Safety**: Production deployments require confirmation and run tests  
✅ **SEO**: Better for search engines and marketing  
✅ **Trust**: Custom domain builds user trust  

---

## What You Need to Do

1. **Run Git Setup**: `./setup-git-branches.sh`
2. **Choose**: Single project or multiple projects approach
3. **Configure Vercel**: Follow the detailed guide
4. **Test**: Deploy to each environment
5. **Optional**: Purchase custom domain for professional branding

The setup takes about 30 minutes and gives you a production-ready deployment strategy that scales with your business.