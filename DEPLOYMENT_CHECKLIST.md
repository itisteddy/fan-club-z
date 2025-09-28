# FCZ Application Deployment Checklist

## Pre-Deployment Validation

### ✅ Environment Variables Audit
```bash
# Run environment audit
npm run audit:env

# Verify required variables are set
- [ ] VITE_API_BASE (production API URL)
- [ ] VITE_SUPABASE_URL (production Supabase instance)
- [ ] VITE_SUPABASE_ANON_KEY (production Supabase key)
- [ ] VITE_FRONTEND_URL (production domain)
- [ ] VITE_SENTRY_DSN (error monitoring - optional but recommended)
```

### ✅ Feature Flags Configuration
```bash
# Verify feature flags are set correctly for production
- [ ] VITE_FCZ_UNIFIED_HEADER=1 (new header design)
- [ ] VITE_FCZ_UNIFIED_CARDS=1 (consistent card system)  
- [ ] VITE_FCZ_AUTH_GATE=1 (unified authentication)
- [ ] VITE_FCZ_COMMENTS_V2=1 (enhanced comments)
- [ ] VITE_DEBUG=false (disable debug mode in production)
```

### ✅ Security Verification
- [ ] No hardcoded secrets in code
- [ ] All sensitive values masked in logs
- [ ] HTTPS enforced for all external services
- [ ] Content Security Policy configured
- [ ] Rate limiting enabled on backend

### ✅ Performance Validation
```bash
# Run performance audit
npm run test:performance

# Verify benchmarks
- [ ] Bundle size < 500KB gzipped
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1
```

### ✅ Testing Validation
```bash
# Run full test suite
npm run test:all

# Verify test results
- [ ] Unit tests passing (80%+ coverage)
- [ ] Integration tests passing
- [ ] Smoke tests passing
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness tested
```

### ✅ Code Quality
- [ ] No linting errors or warnings
- [ ] TypeScript compilation successful
- [ ] Dependencies updated to latest stable versions
- [ ] Unused code removed
- [ ] Console.log statements removed from production code

## Deployment Steps

### 1. Pre-Deploy Environment Setup

```bash
# Ensure you're on the main branch
git checkout main
git pull origin main

# Verify environment configuration
npm run audit:env

# Run complete test suite
npm run test:all

# Build production bundle
npm run build

# Verify build output
ls -la dist/
```

### 2. Frontend Deployment (Vercel)

```bash
# Deploy to Vercel
vercel --prod

# Or if using GitHub integration
git push origin main
# (Vercel will auto-deploy via webhook)
```

**Vercel Configuration Checklist:**
- [ ] Environment variables configured in dashboard
- [ ] Custom domain configured (if applicable)
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Node.js version: `18.x`

### 3. Backend Deployment (Render)

```bash
# Ensure backend environment variables are set
# Deploy via Render dashboard or CLI
```

**Render Configuration Checklist:**
- [ ] Environment variables configured
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Auto-deploy enabled from main branch
- [ ] Health check endpoint configured

### 4. Database Migration (Supabase)

```bash
# Run any pending database migrations
npm run db:migrate

# Verify database schema is up to date
npm run db:status
```

**Database Checklist:**
- [ ] All migrations applied successfully
- [ ] Row Level Security policies updated
- [ ] Database backups scheduled
- [ ] Connection pooling configured

## Post-Deployment Verification

### ✅ Smoke Tests
```bash
# Run automated smoke tests against production
npm run test:smoke -- --env=production

# Manual verification
- [ ] Homepage loads successfully
- [ ] User authentication works
- [ ] Core features functional
- [ ] API endpoints responding
- [ ] Database connectivity confirmed
```

### ✅ Performance Monitoring
- [ ] Sentry error monitoring active
- [ ] Performance metrics collecting
- [ ] Uptime monitoring configured
- [ ] Alert thresholds set

### ✅ User Experience Verification
- [ ] Mobile app install prompt working (PWA)
- [ ] Push notifications functional (if enabled)
- [ ] Social login working (Google OAuth)
- [ ] Prediction creation and betting flows
- [ ] Comments and social interactions
- [ ] Wallet transactions

### ✅ Security Post-Deploy
- [ ] SSL certificate valid and auto-renewing
- [ ] Security headers present
- [ ] No sensitive data in client bundle
- [ ] Rate limiting effective
- [ ] CORS policy restrictive

## Rollback Plan

### If Issues Are Detected

1. **Immediate Rollback:**
```bash
# Vercel rollback
vercel rollback

# Or redeploy previous version
git checkout [PREVIOUS_COMMIT]
vercel --prod
```

2. **Database Rollback (if needed):**
```bash
# Restore from backup if database changes were made
# Contact Supabase support or use backup restore
```

3. **Communication:**
- [ ] Notify users of temporary issues
- [ ] Update status page
- [ ] Document incident for post-mortem

## Monitoring & Alerting

### Key Metrics to Monitor
- [ ] Error rate < 1%
- [ ] Response time < 500ms
- [ ] Uptime > 99.9%
- [ ] Core Web Vitals within thresholds
- [ ] Database connection health

### Alert Configurations
- [ ] High error rate alerts
- [ ] Performance degradation alerts
- [ ] Service downtime alerts
- [ ] Database connectivity alerts
- [ ] SSL certificate expiration alerts

## Post-Deploy Tasks

### Immediate (0-24 hours)
- [ ] Monitor error rates and performance
- [ ] Check user feedback and support channels
- [ ] Verify all feature flags working correctly
- [ ] Review deployment logs for any issues

### Short Term (1-7 days)
- [ ] Analyze user adoption of new features
- [ ] Review performance metrics trends
- [ ] Collect user feedback on UI/UX changes
- [ ] Plan any hotfixes if needed

### Long Term (1-4 weeks)
- [ ] Conduct post-deployment review
- [ ] Update documentation based on learnings
- [ ] Plan next feature releases
- [ ] Optimize based on performance data

## Emergency Contacts

- **DevOps Lead:** [Contact Information]
- **Backend Lead:** [Contact Information]  
- **Frontend Lead:** [Contact Information]
- **Product Owner:** [Contact Information]

## Deployment Sign-Off

**Pre-Deployment Validation:**
- [ ] Technical Lead Approval: _________________ Date: _______
- [ ] QA Lead Approval: _________________ Date: _______
- [ ] Product Owner Approval: _________________ Date: _______

**Post-Deployment Verification:**
- [ ] Production Deployment Successful: _________________ Date: _______
- [ ] Smoke Tests Passed: _________________ Date: _______
- [ ] Monitoring Active: _________________ Date: _______

---

## Version Information

**Release Version:** [TO BE FILLED]
**Deployment Date:** [TO BE FILLED]  
**Git Commit:** [TO BE FILLED]
**Deployed By:** [TO BE FILLED]

**Feature Flags State:**
- VITE_FCZ_UNIFIED_HEADER: [STATE]
- VITE_FCZ_UNIFIED_CARDS: [STATE]
- VITE_FCZ_AUTH_GATE: [STATE]
- VITE_FCZ_COMMENTS_V2: [STATE]

**Environment URLs:**
- Production Frontend: [URL]
- Production Backend: [URL]
- Supabase Dashboard: [URL]
- Monitoring Dashboard: [URL]
