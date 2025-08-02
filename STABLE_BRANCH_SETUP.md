# Fan Club Z - Stable Branch & Custom Domain Setup

## Quick Start Guide

### 1. Set Up Your Branch Structure

```bash
# Set up deployment permissions first
chmod +x setup-deployment.sh
./setup-deployment.sh

# Create branch structure
npm run setup:branches
```

This creates:
- `main` branch → Production (fanclubz.app)
- `staging` branch → Staging (staging.fanclubz.app)
- `development` branch → Development (dev environment)

### 2. Purchase and Configure Domain

#### Step 1: Buy the Domain
Purchase `fanclubz.app` from a domain registrar like:
- Namecheap
- Cloudflare Registrar
- Google Domains

#### Step 2: Configure DNS
In your domain registrar, set up these DNS records:

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

### 3. Configure Vercel

#### Step 1: Set Up Multiple Projects (Recommended)
Create separate Vercel projects for each environment:

1. **Production Project**: 
   - Connect to `main` branch
   - Add domain: `fanclubz.app` and `www.fanclubz.app`

2. **Staging Project**:
   - Connect to `staging` branch  
   - Add domain: `staging.fanclubz.app`

3. **Development Project**:
   - Connect to `development` branch
   - Add domain: `dev.fanclubz.app`

#### Step 2: Environment Variables
Set these in each Vercel project:

**Production:**
```
VITE_ENVIRONMENT=production
VITE_DEBUG=false
VITE_API_URL=https://fan-club-z.onrender.com
VITE_WS_URL=wss://fan-club-z.onrender.com
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
```

**Staging:**
```
VITE_ENVIRONMENT=staging
VITE_DEBUG=true
VITE_API_URL=https://fan-club-z.onrender.com
VITE_WS_URL=wss://fan-club-z.onrender.com
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
```

**Development:**
```
VITE_ENVIRONMENT=development
VITE_DEBUG=true
VITE_API_URL=https://fan-club-z.onrender.com
VITE_WS_URL=wss://fan-club-z.onrender.com
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
```

### 4. Deployment Workflow

#### Daily Development:
```bash
# Work on development branch
git checkout development

# Make your changes
# ... code changes ...

# Quick deploy to dev environment
npm run deploy:dev
```

#### Deploy to Staging:
```bash
# Deploy latest development to staging for testing
npm run deploy:staging
# This will be available at staging.fanclubz.app
```

#### Deploy to Production:
```bash
# Deploy staging to production (requires confirmation)
npm run deploy:production
# This will be available at fanclubz.app
```

### 5. Access Your Apps

Once set up, you'll have:

- **🌐 Production**: `https://fanclubz.app` (stable, main branch)
- **🧪 Staging**: `https://staging.fanclubz.app` (testing, staging branch)
- **🛠️ Development**: `https://dev.fanclubz.app` (active development)
- **📥 Downloads**: `https://fanclubz.app/download` (landing page)

### 6. Benefits of This Setup

✅ **Stable Production**: Main branch stays stable and unaffected by development  
✅ **Custom Domain**: Professional branding with fanclubz.app  
✅ **Multiple Environments**: Test before production deployment  
✅ **Easy Downloads**: Clean landing page for app distribution  
✅ **Automated Deployments**: Push to deploy automatically  
✅ **Rollback Capability**: Easy to revert if issues arise  

### 7. Emergency Procedures

#### Hotfix for Production:
```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/urgent-fix

# Make fix and test
# ... fix code ...

# Deploy directly to production
git checkout main
git merge hotfix/urgent-fix
npm run deploy:production

# Backport to other branches
git checkout staging
git merge main
git checkout development  
git merge main
```

#### Rollback Production:
```bash
# Find the last good commit
git checkout main
git log --oneline

# Reset to previous version
git reset --hard <previous-commit-hash>
git push --force origin main
```

### 8. Monitoring & Maintenance

- **Vercel Dashboard**: Monitor deployments and performance
- **Domain Health**: Check DNS propagation with tools like whatsmydns.net
- **SSL Certificates**: Vercel handles automatically
- **Analytics**: Set up Vercel Analytics for performance monitoring

### 9. Why fanclubz.app vs fan-club-z.vercel.app?

**Custom Domain Benefits:**
- **Professional Branding**: Users see fanclubz.app, not a Vercel subdomain
- **SEO Benefits**: Better for search engine optimization
- **Trust**: Custom domains appear more trustworthy to users
- **Control**: You own the domain and can move providers if needed
- **Email**: Can set up professional email (hello@fanclubz.app)

**Technical Benefits:**
- **SSL Certificate**: Automatic HTTPS with custom SSL
- **Performance**: Vercel's global CDN with your domain
- **Analytics**: Better tracking with your own domain
- **Redirects**: Control www vs non-www preferences

### 10. Troubleshooting

#### Domain Not Working:
1. Check DNS propagation (can take 24-48 hours)
2. Verify CNAME records are correct
3. Check Vercel domain configuration
4. Ensure SSL certificate is active

#### Deployment Fails:
1. Check build logs in Vercel dashboard
2. Verify environment variables are set
3. Test build locally: `npm run build`
4. Check for TypeScript/lint errors

#### Branch Issues:
```bash
# Reset branch setup
git branch -D main staging
npm run setup:branches
```

### 11. Next Steps

1. **Set up monitoring**: Add error tracking (Sentry) and analytics
2. **Performance optimization**: Enable Vercel Analytics and Speed Insights
3. **Security headers**: Add security headers in vercel.json
4. **Backup strategy**: Regular database backups and code repository backups
5. **Documentation**: Keep deployment logs and update procedures documented

---

## Quick Commands Reference

```bash
# Setup
npm run setup:branches        # Create git branches
chmod +x *.sh                # Make scripts executable

# Daily Development
npm run deploy:dev           # Deploy development changes
npm run deploy:staging       # Deploy to staging for testing  
npm run deploy:production    # Deploy to production (with confirmation)

# Maintenance
git status && git branch     # Check current status
npm run quick-status         # Quick git status check
npm run save-work           # Quick commit current work
```

This setup gives you a professional, scalable deployment strategy that separates stable production code from active development while providing a custom domain for your users.