# Render Rollback Playbook

## 🚨 Emergency Render Rollback Procedure

### ⚡ Quick Rollback (3-5 minutes)

#### Step 1: Access Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Navigate to **fanclubz-backend** service
3. Click on **Deployments** tab

#### Step 2: Identify Previous Deployment
1. Look for the **last successful deployment**
2. Check deployment status:
   - ✅ **Live** (green) = Good deployment
   - ❌ **Failed** (red) = Skip this deployment
   - ⏳ **Building** (yellow) = Skip this deployment
3. Note the **Deployment ID** and **commit SHA**

#### Step 3: Rollback to Previous Deployment
1. Click on the **"Rollback to this deployment"** button next to the good deployment
2. Confirm the rollback action
3. Wait for deployment to complete (usually 2-3 minutes)

#### Step 4: Verify Rollback
1. Check deployment status shows **"Live"**
2. Test API endpoints: https://fan-club-z.onrender.com/api/health
3. Verify frontend can connect to backend
4. Check Render logs for any errors

---

## 🔍 Detailed Rollback Procedure

### Pre-Rollback Assessment

#### 1. Identify the Issue
```bash
# Check backend health
curl -I https://fan-club-z.onrender.com/api/health

# Check deployment logs in Render Dashboard
# Go to Render Dashboard → fanclubz-backend → Logs tab
```

#### 2. Determine Rollback Target
- **Target**: Last deployment with status ✅ **Live**
- **Avoid**: Failed deployments or deployments with known issues
- **Timeframe**: Usually 1-2 deployments back (within last hour)

### Render Dashboard Rollback

#### Method 1: Dashboard Rollback (Recommended)
1. **Access Render Dashboard**
   - URL: https://dashboard.render.com
   - Service: fanclubz-backend
   - Tab: Deployments

2. **Find Target Deployment**
   ```
   ✅ [COMMIT_SHA] - Live - 10 minutes ago ← TARGET
   ❌ [CURRENT_SHA] - Failed - 2 minutes ago
   ✅ [PREVIOUS_SHA] - Live - 30 minutes ago
   ```

3. **Initiate Rollback**
   - Click **"Rollback to this deployment"** next to target
   - Confirm rollback action
   - Monitor deployment progress

4. **Monitor Rollback**
   - Watch deployment status change to "Building"
   - Wait for "Live" status
   - Check logs for any issues

#### Method 2: Manual Deploy (Alternative)
1. **Get Previous Commit SHA**
   ```bash
   # Find the last good commit
   git log --oneline -10
   ```

2. **Create Rollback Branch**
   ```bash
   # Create rollback branch from good commit
   git checkout -b rollback/emergency [GOOD_COMMIT_SHA]
   git push origin rollback/emergency
   ```

3. **Trigger Manual Deploy**
   - Go to Render Dashboard
   - Click "Manual Deploy"
   - Select rollback branch
   - Confirm deployment

### Post-Rollback Verification

#### 1. Backend Health Checks
```bash
# Test API health endpoint
curl https://fan-club-z.onrender.com/api/health

# Test prediction endpoints
curl https://fan-club-z.onrender.com/api/v2/predictions

# Test user endpoints
curl https://fan-club-z.onrender.com/api/v2/users/profile
```

#### 2. Database Connectivity
```bash
# Check database connection (if accessible)
curl https://fan-club-z.onrender.com/api/v2/health/db

# Verify database migrations
curl https://fan-club-z.onrender.com/api/v2/health/migrations
```

#### 3. Frontend Integration Test
1. **Test Frontend-Backend Connection**
   ```javascript
   // Run in browser console on https://app.fanclubz.app
   fetch('/api/health')
     .then(r => r.json())
     .then(data => console.log('Backend health:', data));
   ```

2. **Test Critical API Calls**
   ```javascript
   // Test predictions API
   fetch('/api/v2/predictions')
     .then(r => r.json())
     .then(data => console.log('Predictions API:', data));

   // Test user authentication
   fetch('/api/v2/users/profile')
     .then(r => r.json())
     .then(data => console.log('User API:', data));
   ```

#### 4. Performance Verification
- [ ] **API Response Time**: < 500ms average
- [ ] **Database Queries**: < 200ms average
- [ ] **Error Rate**: < 1%
- [ ] **Memory Usage**: Stable
- [ ] **CPU Usage**: Normal levels

---

## 🚨 Emergency Contacts

### Primary Contacts
- **DevOps Lead**: [Contact Information]
- **Backend Lead**: [Contact Information]
- **Database Admin**: [Contact Information]

### Escalation Path
1. **Level 1**: Backend Engineer (0-15 minutes)
2. **Level 2**: DevOps Lead (15-30 minutes)
3. **Level 3**: Engineering Manager (30+ minutes)

### Communication Channels
- **Slack**: #backend-incidents channel
- **Phone**: Emergency hotline
- **Email**: backend-incidents@fanclubz.app

---

## 📊 Monitoring & Validation

### Key Metrics to Monitor
- **API Availability**: https://fan-club-z.onrender.com/api/health
- **Response Time**: < 500ms average
- **Error Rate**: < 1% 5xx errors
- **Database Performance**: Query response times
- **Memory Usage**: Stable memory consumption

### Automated Health Checks
```bash
# Run backend smoke tests
curl -f https://fan-club-z.onrender.com/api/health || echo "Backend down"

# Check API endpoints
curl -f https://fan-club-z.onrender.com/api/v2/predictions || echo "Predictions API down"

# Test database connectivity
curl -f https://fan-club-z.onrender.com/api/v2/health/db || echo "Database down"
```

### Manual Validation Checklist
- [ ] **API Health**: Health endpoint returns 200
- [ ] **Predictions API**: Can fetch predictions
- [ ] **User API**: Authentication endpoints working
- [ ] **Database**: Database queries executing
- [ ] **WebSocket**: Real-time connections working
- [ ] **File Uploads**: Image upload functionality
- [ ] **Error Handling**: Proper error responses
- [ ] **Logging**: Application logs being generated

---

## 🔄 Rollback Timeline

### Target Response Times
- **Detection**: 0-5 minutes
- **Assessment**: 5-10 minutes
- **Rollback Decision**: 10-15 minutes
- **Rollback Execution**: 15-20 minutes
- **Verification**: 20-25 minutes
- **Communication**: 25-30 minutes

### Rollback Success Criteria
- ✅ API endpoints responding correctly
- ✅ Database connectivity stable
- ✅ Frontend can communicate with backend
- ✅ No critical errors in application logs
- ✅ Performance metrics within acceptable ranges

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
   - Notify frontend team
   - Post status update if needed

3. **Monitor Backend Stability**
   - Watch API response times
   - Monitor error rates
   - Check database performance

### Follow-up Actions (30+ minutes)
1. **Root Cause Analysis**
   - Investigate original deployment failure
   - Review application logs
   - Check database migration status
   - Identify contributing factors

2. **Prevention Measures**
   - Update deployment procedures
   - Improve backend testing
   - Enhance database monitoring
   - Add more health checks

3. **Process Improvement**
   - Review rollback procedures
   - Update documentation
   - Train team on improvements

---

## 🔧 Troubleshooting

### Common Issues

#### Rollback Fails
```bash
# Check Render service status
# Go to Render Dashboard → fanclubz-backend → Settings → Service Info

# Verify environment variables
# Go to Render Dashboard → fanclubz-backend → Environment

# Check build logs
# Go to Render Dashboard → fanclubz-backend → Logs
```

#### Database Connection Issues
```bash
# Check database status in Render Dashboard
# Go to Render Dashboard → fanclubz-backend → Logs
# Look for database connection errors

# Verify environment variables
# Check SUPABASE_URL, SUPABASE_ANON_KEY, etc.
```

#### API Endpoint Issues
```bash
# Test specific endpoints
curl -v https://fan-club-z.onrender.com/api/health
curl -v https://fan-club-z.onrender.com/api/v2/predictions

# Check CORS settings
curl -H "Origin: https://app.fanclubz.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://fan-club-z.onrender.com/api/health
```

### Emergency Commands
```bash
# Quick health check
curl -s -o /dev/null -w "%{http_code}" https://fan-club-z.onrender.com/api/health

# Check deployment status
curl -s https://api.render.com/v1/services/[SERVICE_ID]/deploys \
  -H "Authorization: Bearer [API_TOKEN]"

# Force restart service
curl -X POST https://api.render.com/v1/services/[SERVICE_ID]/deploys \
  -H "Authorization: Bearer [API_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"clearBuildCache": true}'
```

---

## 🗄️ Database Considerations

### Database Rollback
- **Supabase**: Automatic backups, no manual rollback needed
- **Migrations**: Check if database migrations need to be reverted
- **Data Integrity**: Verify data consistency after rollback

### Database Health Checks
```bash
# Check database connectivity
curl https://fan-club-z.onrender.com/api/v2/health/db

# Verify migration status
curl https://fan-club-z.onrender.com/api/v2/health/migrations

# Test database queries
curl https://fan-club-z.onrender.com/api/v2/predictions?limit=1
```

---

## 🔐 Security Considerations

### Environment Variables
- Verify all environment variables are set correctly
- Check JWT secrets and API keys
- Ensure database credentials are valid

### API Security
- Verify CORS settings are correct
- Check authentication endpoints
- Ensure rate limiting is working

---

## 📈 Performance Monitoring

### Key Performance Indicators
- **API Response Time**: Target < 500ms
- **Database Query Time**: Target < 200ms
- **Memory Usage**: Monitor for memory leaks
- **CPU Usage**: Ensure stable CPU consumption

### Monitoring Tools
- **Render Dashboard**: Built-in metrics
- **Application Logs**: Custom logging
- **Health Endpoints**: Automated monitoring
- **External Monitoring**: Uptime monitoring services

---

**Last Updated**: $(date)
**Version**: 1.0
**Next Review**: Quarterly
