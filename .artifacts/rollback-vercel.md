# Vercel Rollback Playbook

## 🚨 Emergency Vercel Rollback Procedure

### ⚡ Quick Rollback (2-3 minutes)

#### Step 1: Access Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Fan Club Z** project
3. Click on **Deployments** tab

#### Step 2: Identify Previous Deployment
1. Look for the **last known good deployment** (usually 1-2 deployments back)
2. Check deployment status:
   - ✅ **Ready** (green) = Good deployment
   - ❌ **Failed** (red) = Skip this deployment
   - ⏳ **Building** (yellow) = Skip this deployment
3. Note the **Deployment ID** and **commit SHA**

#### Step 3: Promote Previous Deployment
1. Click on the **three dots** (⋯) next to the good deployment
2. Select **"Promote to Production"**
3. Confirm the promotion
4. Wait for deployment to complete (usually 30-60 seconds)

#### Step 4: Verify Rollback
1. Check deployment status shows **"Ready"**
2. Visit https://app.fanclubz.app
3. Verify the application loads correctly
4. Check browser console for errors

---

## 🔍 Detailed Rollback Procedure

### Pre-Rollback Assessment

#### 1. Identify the Issue
```bash
# Check current deployment status
curl -I https://app.fanclubz.app

# Check for error patterns in Vercel logs
# Go to Vercel Dashboard → Deployments → Current deployment → Functions tab
```

#### 2. Determine Rollback Target
- **Target**: Last deployment with status ✅ **Ready**
- **Avoid**: Failed deployments or deployments with known issues
- **Timeframe**: Usually 1-2 deployments back (within last 30 minutes)

### Vercel Dashboard Rollback

#### Method 1: Promote Previous Deployment (Recommended)
1. **Access Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Project: Fan Club Z
   - Tab: Deployments

2. **Find Target Deployment**
   ```
   ✅ [COMMIT_SHA] - Ready - 2 minutes ago
   ❌ [CURRENT_SHA] - Failed - 1 minute ago
   ✅ [PREVIOUS_SHA] - Ready - 5 minutes ago ← TARGET
   ```

3. **Promote to Production**
   - Click **⋯** next to target deployment
   - Select **"Promote to Production"**
   - Confirm action

4. **Monitor Promotion**
   - Watch deployment progress
   - Wait for "Ready" status
   - Note new deployment URL

#### Method 2: CLI Rollback (Alternative)
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to project
vercel link

# Promote specific deployment
vercel promote [DEPLOYMENT_ID] --prod

# Or promote latest from specific branch
vercel promote --prod
```

### Post-Rollback Verification

#### 1. Basic Health Checks
```bash
# Test main application
curl -I https://app.fanclubz.app

# Test API endpoints
curl -I https://app.fanclubz.app/api/health

# Check static assets
curl -I https://app.fanclubz.app/manifest.json
```

#### 2. Browser Verification
1. **Clear Browser Cache**
   ```javascript
   // Run in browser console
   if ('caches' in window) {
     caches.keys().then(names => {
       names.forEach(name => caches.delete(name));
     });
   }
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Hard Refresh**
   - **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
   - **Safari**: `Cmd+Option+R` (Mac)

3. **Version Verification**
   ```javascript
   // Check version in browser console
   fetch('/version.json')
     .then(r => r.json())
     .then(data => console.log('Current version:', data.version));
   ```

#### 3. Service Worker Cache Bust
1. **Check Service Worker Status**
   ```javascript
   // Run in browser console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => {
       console.log('SW registered:', registration.scope);
       registration.update(); // Force update
     });
   });
   ```

2. **Force Service Worker Update**
   ```javascript
   // Force immediate SW update
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.getRegistration().then(registration => {
       if (registration) {
         registration.update();
         console.log('Service Worker update triggered');
       }
     });
   }
   ```

#### 4. Functional Testing
- [ ] **Home Page**: Loads without errors
- [ ] **Authentication**: Login/logout works
- [ ] **Predictions**: Can view and create predictions
- [ ] **Comments**: Can view and post comments
- [ ] **Navigation**: All navigation works
- [ ] **Mobile**: Mobile experience is functional

---

## 🚨 Emergency Contacts

### Primary Contacts
- **DevOps Lead**: [Contact Information]
- **Tech Lead**: [Contact Information]
- **On-call Engineer**: [Contact Information]

### Escalation Path
1. **Level 1**: DevOps Engineer (0-15 minutes)
2. **Level 2**: Tech Lead (15-30 minutes)
3. **Level 3**: Engineering Manager (30+ minutes)

### Communication Channels
- **Slack**: #incidents channel
- **Phone**: Emergency hotline
- **Email**: incidents@fanclubz.app

---

## 📊 Monitoring & Validation

### Key Metrics to Monitor
- **Uptime**: https://app.fanclubz.app availability
- **Response Time**: < 2 seconds for main page
- **Error Rate**: < 1% error rate
- **User Reports**: Monitor user feedback channels

### Automated Checks
```bash
# Run smoke tests after rollback
npm run smoke:prod

# Check deployment status
vercel ls --prod

# Verify environment variables
vercel env ls --prod
```

### Manual Validation Checklist
- [ ] **Frontend Loads**: Main page accessible
- [ ] **API Responds**: Backend endpoints working
- [ ] **Authentication**: Login/logout functional
- [ ] **Core Features**: Predictions, comments, navigation
- [ ] **Mobile Experience**: Mobile app functional
- [ ] **Performance**: Page load times acceptable
- [ ] **No Console Errors**: Browser console clean
- [ ] **Service Worker**: SW updates properly

---

## 🔄 Rollback Timeline

### Target Response Times
- **Detection**: 0-5 minutes
- **Decision**: 5-10 minutes
- **Rollback**: 10-15 minutes
- **Verification**: 15-20 minutes
- **Communication**: 20-25 minutes

### Rollback Success Criteria
- ✅ Application accessible at https://app.fanclubz.app
- ✅ No critical errors in browser console
- ✅ Core functionality working (auth, predictions, comments)
- ✅ Performance metrics within acceptable ranges
- ✅ User feedback indicates resolution

---

## 📝 Post-Rollback Actions

### Immediate Actions (0-30 minutes)
1. **Document Incident**
   - Record rollback reason
   - Note original deployment that failed
   - Document rollback target deployment
   - Capture timeline and actions taken

2. **Communicate Status**
   - Update incident channel
   - Notify stakeholders
   - Post status update if needed

3. **Monitor Stability**
   - Watch error rates
   - Monitor user feedback
   - Check performance metrics

### Follow-up Actions (30+ minutes)
1. **Root Cause Analysis**
   - Investigate original deployment failure
   - Identify contributing factors
   - Document lessons learned

2. **Prevention Measures**
   - Update deployment procedures
   - Improve testing coverage
   - Enhance monitoring

3. **Process Improvement**
   - Review rollback procedures
   - Update documentation
   - Train team on improvements

---

## 🔧 Troubleshooting

### Common Issues

#### Rollback Fails
```bash
# Check Vercel CLI status
vercel whoami

# Verify project access
vercel projects ls

# Try alternative method
vercel promote [DEPLOYMENT_ID] --prod --yes
```

#### Service Worker Issues
```javascript
// Force unregister and re-register SW
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.unregister();
  });
  window.location.reload();
});
```

#### Cache Issues
```bash
# Clear Cloudflare cache (if applicable)
curl -X POST "https://api.cloudflare.com/client/v4/zones/[ZONE_ID]/purge_cache" \
  -H "Authorization: Bearer [API_TOKEN]" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Emergency Commands
```bash
# Quick health check
curl -s -o /dev/null -w "%{http_code}" https://app.fanclubz.app

# Check deployment history
vercel ls --prod

# Force new deployment from previous commit
git checkout [PREVIOUS_COMMIT]
vercel --prod
```

---

**Last Updated**: $(date)
**Version**: 1.0
**Next Review**: Quarterly
