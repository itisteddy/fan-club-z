# FCZ Production Deployment Guide

## 🚨 PRODUCTION FREEZE MODE

**Current Status: DEPLOYMENT FREEZE ACTIVE**
- **Branch**: `release/production-freeze` 
- **Rollback Tag**: `v2.0.77-freeze`
- **Only deployment configuration changes allowed**

## Environment Setup

### Required Environment Variables (Production)

```bash
# API Configuration
VITE_API_BASE=/api

# Feature Flags (Production Safe)
VITE_IMAGES_FEATURE_FLAG=false
VITE_IMAGES_PROVIDER=none

# Supabase (Set in hosting dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Hosting Platform Configuration

#### Vercel Deployment

1. **Project Settings**:
   - Build Command: `cd client && pnpm install --frozen-lockfile && pnpm build`
   - Output Directory: `client/dist`
   - Install Command: `pnpm install --frozen-lockfile`

2. **Environment Variables** (set in Vercel dashboard):
   ```
   VITE_API_BASE=/api
   VITE_IMAGES_FEATURE_FLAG=false
   VITE_IMAGES_PROVIDER=none
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Domain Configuration**:
   - Production: `app.fanclubz.app`
   - API Proxy: `/api/*` → `https://fan-club-z.onrender.com/*`

#### Render Deployment

1. **Static Site Service**:
   - Name: `fanclubz-frontend`
   - Build: `cd client && pnpm install --frozen-lockfile && pnpm build`
   - Publish: `./client/dist`

2. **Environment Variables** (set in Render dashboard):
   ```
   VITE_API_BASE=/api
   VITE_IMAGES_FEATURE_FLAG=false
   VITE_IMAGES_PROVIDER=none
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Supabase Configuration

### Production Domain Setup

1. **Authentication → URL Configuration**:
   ```
   Site URL: https://app.fanclubz.app
   Additional Redirect URLs:
   - https://app.fanclubz.app/auth/callback
   - https://app.fanclubz.app/
   ```

2. **Cookie Settings**:
   - sameSite: `lax`
   - secure: `true` (HTTPS only)

3. **CORS Configuration**:
   - Allow origins: `https://app.fanclubz.app`

## Release Process

### Pre-deployment Checklist

- [ ] CI pipeline passes on `release/production-freeze`
- [ ] Freeze enforcer reports no violations
- [ ] Build succeeds with production environment variables
- [ ] Manual smoke test completed:
  - [ ] Discover page loads content without login
  - [ ] Prediction details opens, comments show empty state
  - [ ] My Bets shows 3 tabs, content loads
  - [ ] Auth-gate prompts on privileged actions
  - [ ] Profile/Wallet share header structure
  - [ ] No console errors or provider warnings

### Deployment Steps

1. **Canary Deployment**:
   ```bash
   # Deploy to canary environment
   git push origin release/production-freeze:canary
   ```

2. **Monitor Canary** (30-60 minutes):
   - Error rates < 1%
   - Core Web Vitals healthy
   - No regression reports

3. **Production Promotion**:
   ```bash
   # Promote canary to production
   git push origin release/production-freeze:production
   ```

### Rollback Plan

**If any issues detected**:

1. **Immediate Rollback**:
   - Vercel: Revert to previous deployment in dashboard
   - Render: Redeploy from previous commit

2. **Emergency Rollback**:
   ```bash
   git checkout tags/v2.0.77-freeze
   git push origin --force-with-lease release/production-freeze
   ```

3. **Incident Documentation**:
   - Record error logs and screenshots
   - Document timeline and root cause
   - Plan remediation for next deployment window

## Security Headers

All deployments include:

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: public, immutable, max-age=31536000 (assets only)
```

## Monitoring

### Key Metrics to Watch

- **Error Rate**: < 1% for first hour post-deployment
- **Core Web Vitals**: 
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- **Auth Flow Success Rate**: > 95%
- **API Response Times**: < 500ms median

### Alerts Setup

- 5xx error spike (> 10 errors in 5 minutes)
- Auth failure rate > 5%
- Page load time > 5 seconds

## Troubleshooting

### Common Production Issues

1. **API Base URL**:
   - Ensure `VITE_API_BASE=/api`
   - Verify proxy configuration in `vercel.json`/`render.yaml`

2. **CORS Errors**:
   - Check Supabase allowed origins
   - Verify API server CORS configuration

3. **Auth Redirect Loops**:
   - Confirm Supabase redirect URLs match exactly
   - Check cookie settings for HTTPS

4. **Service Worker Issues**:
   - Clear cache if stale content served
   - Verify cache headers on `index.html`

### Emergency Contacts

- **Primary**: [Your primary contact]
- **Secondary**: [Your secondary contact]
- **Escalation**: [Team lead/manager]

---

**⚠️ Remember: During production freeze, NO application code changes are permitted. All fixes must be deployment configuration or environment variable changes only.**
