# Environment Management Guide

## Current Deployment Strategy

Fan Club Z uses **separate Render services** for each environment:

### Development Environment
- **Service**: `fanclubz-dev`
- **Branch**: `development`
- **URL**: https://dev.fanclubz.app
- **Plan**: Free
- **Purpose**: Testing new features, debugging

### Production Environment
- **Service**: `fanclubz-prod`
- **Branch**: `main`
- **URL**: https://app.fanclubz.app
- **Plan**: Starter
- **Purpose**: Live user-facing application

### Staging Environment (Optional)
- **Service**: `fanclubz-backend-staging`
- **Branch**: `development`
- **URL**: https://fanclubz-staging.vercel.app
- **Plan**: Free
- **Purpose**: Pre-production testing

## Deployment Workflow

### For Development Changes
1. Work on `development` branch
2. Push changes: `git push origin development`
3. Auto-deploys to https://dev.fanclubz.app

### For Production Releases
1. Ensure development is stable
2. Merge to main:
   ```bash
   git checkout main
   git merge development
   git push origin main
   ```
3. Auto-deploys to https://app.fanclubz.app

## Environment Configuration

### Development vs Production Differences

| Setting | Development | Production |
|---------|-------------|------------|
| Plan | Free | Starter |
| Branch | development | main |
| Frontend URL | dev.fanclubz.app | app.fanclubz.app |
| Performance | Basic | Optimized |
| Logging | Verbose | Minimal |
| Database | Test data | Live data |

### Environment Variables

Each environment should have separate:
- `SUPABASE_URL` (different projects)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLIENT_URL`
- `CORS_ORIGINS`

## Benefits of This Approach

✅ **Risk Mitigation**: Dev issues don't affect production users
✅ **Performance Optimization**: Production gets better resources
✅ **Testing Safety**: Can test breaking changes safely
✅ **Data Separation**: No risk of corrupting live data
✅ **Compliance**: Meets industry standards for deployment

## Monitoring Each Environment

### Development
- Monitor for new feature functionality
- Test edge cases and error handling
- Verify integrations work correctly

### Production
- Monitor uptime and performance
- Track user metrics and errors
- Ensure security and compliance

## Emergency Procedures

### If Development Breaks
- No impact on production users
- Fix and redeploy development branch
- Continue testing

### If Production Has Issues
- Can rollback to previous stable version
- Use development environment to test fixes
- Deploy fix after verification

## Cost Optimization

- **Development**: Free tier (sufficient for testing)
- **Production**: Starter tier (better performance, worth the cost)
- **Staging**: Optional, can use development for most testing

This separation ensures reliable, safe deployments while maintaining development velocity.
