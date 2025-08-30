# Fan Club Z - Stable Branch & Custom Domain Deployment Guide

## Overview
This guide sets up a professional deployment strategy for Fan Club Z with stable production, testing, and development environments using custom domains.

## 🎯 What You'll Get

- **🌐 Production**: `fanclubz.app` (stable, user-facing)
- **🧪 Staging**: `staging.fanclubz.app` (testing environment)
- **🛠️ Development**: `dev.fanclubz.app` (active development)
- **📱 Download Page**: Professional landing page at `/download`

## 📋 Prerequisites

1. **Domain**: Purchase `fanclubz.app` from a domain registrar
2. **Vercel Account**: Free account at [vercel.com](https://vercel.com)
3. **GitHub Repository**: Your existing Fan Club Z repo

## 🚀 Quick Start

### Step 1: Set Up Git Branches

```bash
# Navigate to your project
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

# Make script executable and run
chmod +x setup-git-branches-safe.sh
./setup-git-branches-safe.sh
```

This creates:
- `main` → Production (stable)
- `staging` → Testing environment
- `development` → Active development

### Step 2: Set Up Deployment Scripts

```bash
# Make deployment scripts executable
chmod +x deploy-dev.sh deploy-staging.sh deploy-production.sh

# Add npm scripts to package.json
npm pkg set scripts.deploy:dev="./deploy-dev.sh"
npm pkg set scripts.deploy:staging="./deploy-staging.sh"
npm pkg set scripts.deploy:production="./deploy-production.sh"
```

### Step 3: Configure Vercel Projects

You have **2 options**:

#### Option A: Single Project (Simpler)
One Vercel project with branch-based deployments.

#### Option B: Multiple Projects (Recommended)
Separate projects for each environment.

---

## 🔧 Option A: Single Vercel Project Setup

### 1. Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Fan Club Z repository
4. **Don't deploy yet** - click "Configure Project"

### 2. Configure Build Settings

```
Framework Preset: Other
Build Command: cd client && npm install && npm run build
Output Directory: client/dist
Install Command: npm install --prefix client
```

### 3. Add Environment Variables

In Vercel project settings → Environment Variables:

```
VITE_API_URL=https://fan-club-z.onrender.com
VITE_WS_URL=wss://fan-club-z.onrender.com
VITE_ENVIRONMENT=production
VITE_DEBUG=false
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
```

### 4. Configure Branch Deployments

In Vercel project settings → Git:

```
Production Branch: main
Preview Branches: staging, development
```

### 5. Add Custom Domains

In Vercel project → Domains:

1. Add `fanclubz.app` (production - main branch)
2. Add `www.fanclubz.app` (redirect to fanclubz.app)
3. Add `staging.fanclubz.app` (staging branch)
4. Add `dev.fanclubz.app` (development branch)

---

## 🔧 Option B: Multiple Vercel Projects (Recommended)

### Project 1: Production

#### Step 1: Create Production Project
1. Go to Vercel Dashboard → New Project
2. Import your repository
3. **Project Name**: `fanclubz-production`
4. **Branch**: `main`

#### Step 2: Production Build Settings
```
Framework: Other
Build Command: cd client && npm install && npm run build
Output Directory: client/dist
Install Command: npm install --prefix client
```

#### Step 3: Production Environment Variables
```
VITE_API_URL=https://fan-club-z.onrender.com
VITE_WS_URL=wss://fan-club-z.onrender.com
VITE_ENVIRONMENT=production
VITE_DEBUG=false
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
```

#### Step 4: Production Domains
- Add `fanclubz.app`
- Add `www.fanclubz.app` (redirect)

### Project 2: Staging

#### Step 1: Create Staging Project
1. New Project → Import same repository
2. **Project Name**: `fanclubz-staging`
3. **Branch**: `staging`

#### Step 2: Staging Environment Variables
```
VITE_API_URL=https://fan-club-z.onrender.com
VITE_WS_URL=wss://fan-club-z.onrender.com
VITE_ENVIRONMENT=staging
VITE_DEBUG=true
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
```

#### Step 3: Staging Domain
- Add `staging.fanclubz.app`

### Project 3: Development

#### Step 1: Create Development Project
1. New Project → Import same repository
2. **Project Name**: `fanclubz-development`
3. **Branch**: `development`

#### Step 2: Development Environment Variables
```
VITE_API_URL=https://fan-club-z.onrender.com
VITE_WS_URL=wss://fan-club-z.onrender.com
VITE_ENVIRONMENT=development
VITE_DEBUG=true
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
```

#### Step 3: Development Domain
- Add `dev.fanclubz.app`

---

## 🌐 Domain Configuration

### Step 1: Purchase Domain
Buy `fanclubz.app` from:
- **Namecheap** (recommended - good price, easy management)
- **Cloudflare** (best performance, integrated with their CDN)
- **Google Domains** (simple interface)

### Step 2: Configure DNS
In your domain registrar, add these DNS records:

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com

Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: CNAME
Name: staging
Value: cname.vercel-dns.com

Type: CNAME
Name: dev
Value: cname.vercel-dns.com
```

**⚠️ Important**: DNS changes can take 24-48 hours to propagate globally.

---

## 🚀 Deployment Workflow

### Daily Development
```bash
# Work on development branch
git checkout development
# ... make changes ...
npm run deploy:dev

# Check: https://dev.fanclubz.app
```

### Weekly Staging
```bash
# Deploy to staging
npm run deploy:staging

# Check: https://staging.fanclubz.app
```

### Production Releases
```bash
# Deploy to production (requires confirmation)
npm run deploy:production

# Check: https://fanclubz.app
```

---

## 📱 Download Landing Page

The download page is automatically available at `/download` and includes:

- Professional design with Fan Club Z branding
- Feature highlights and statistics
- Download links for web app (and placeholders for future mobile apps)
- SEO-optimized with meta tags
- Mobile-responsive design

### Access URLs:
- **Production**: https://fanclubz.app/download
- **Staging**: https://staging.fanclubz.app/download
- **Development**: https://dev.fanclubz.app/download

---

## 🔒 Security Configuration

### Headers (automatically configured)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

---

## 📊 Monitoring & Analytics

### Vercel Analytics
1. Go to each project → Analytics
2. Enable Web Analytics
3. Enable Conversion tracking

### Performance Monitoring
- **Core Web Vitals**: Automatically tracked by Vercel
- **Error Monitoring**: Built into Vercel dashboard
- **Uptime Monitoring**: Automatic with Vercel

---

## 🛠️ Troubleshooting

### Domain Not Working
1. **Check DNS**: Use [whatsmydns.net](https://whatsmydns.net) to verify DNS propagation
2. **Wait**: DNS can take 24-48 hours to fully propagate
3. **Verify Records**: Ensure CNAME records point to `cname.vercel-dns.com`

### Build Failures
1. **Check Logs**: Vercel dashboard → Deployments → Click failed deployment
2. **Test Locally**: Run `npm run build` locally
3. **Environment Variables**: Ensure all required variables are set

### SSL Certificate Issues
1. **Automatic**: Vercel handles SSL automatically (can take a few minutes)
2. **Force Refresh**: Try removing and re-adding the domain
3. **DNS**: Ensure DNS is properly configured

---

## 💰 Cost Considerations

### Vercel Pricing
- **Hobby Plan**: Free (perfect for starting)
  - 100GB bandwidth/month
  - Unlimited deployments
  - Custom domains included

- **Pro Plan**: $20/month per user (if you need more)
  - 1TB bandwidth/month
  - Analytics included
  - Priority support

### Domain Cost
- `.app` domains: ~$12-20/year
- Renewal: Same price annually

---

## 🎯 Benefits of This Setup

✅ **Stable Production**: Main branch stays stable and unaffected by development
✅ **Custom Domain**: Professional branding with fanclubz.app
✅ **Multiple Environments**: Test before production deployment
✅ **Easy Downloads**: Clean landing page for app distribution
✅ **Automated Deployments**: Push to deploy automatically
✅ **Rollback Capability**: Easy to revert if issues arise
✅ **Professional Appearance**: Users see fanclubz.app instead of Vercel subdomain
✅ **Scalable**: Easy to add more environments or features

---

## 📞 Support

If you encounter any issues:

1. **Check Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
2. **Domain Issues**: Contact your domain registrar
3. **Build Issues**: Check the deployment logs in Vercel dashboard
4. **DNS Issues**: Use [whatsmydns.net](https://whatsmydns.net) to verify propagation

---

## 🎉 Next Steps

1. **Purchase Domain**: Buy fanclubz.app
2. **Run Setup**: Execute the setup commands above
3. **Configure Vercel**: Follow the configuration steps
4. **Test Flow**: Deploy to staging first, then production
5. **Monitor**: Keep an eye on analytics and performance

This setup gives you a professional, scalable deployment strategy that will grow with your application!