# Version Management System

## Overview

Fan Club Z v2.0 uses a comprehensive version synchronization system to ensure all components (frontend, backend, shared libraries, and cache busters) are always in sync.

## Current Version

**Version:** `2.0.45`  
**Last Updated:** August 20, 2025  
**Status:** ✅ All components synchronized

## Version Components

### 1. Package.json Files
- `package.json` (root) - `2.0.58`
- `client/package.json` - `2.0.58`
- `server/package.json` - `2.0.58`
- `shared/package.json` - `2.0.58`

### 2. Cache Buster
- `client/index.html` - `v2.0.58-2025-08-21-auto`

### 3. Version Management Files
- `client/src/lib/version.ts` - Dynamic version management
- `scripts/version-bump.js` - Automated version synchronization
- `scripts/verify-versions.js` - Version verification

## Available Commands

### Version Verification
```bash
npm run version:verify
```
Verifies that all versions are synchronized across the project.

### Version Bumping
```bash
# Patch version (2.0.45 -> 2.0.46)
npm run version:patch

# Minor version (2.0.45 -> 2.1.0)
npm run version:minor

# Major version (2.0.45 -> 3.0.0)
npm run version:major

# Custom version type
npm run version:bump [patch|minor|major]
```

## Version Synchronization Process

### 1. Automatic Updates
When running version bump commands, the system automatically updates:
- All `package.json` files
- Cache buster in `client/index.html`
- Version references in TypeScript files

### 2. Verification
The verification script checks:
- Package.json versions match
- Cache buster contains correct version
- All files are accessible and readable

### 3. Error Handling
If versions are out of sync:
- Script reports specific mismatches
- Provides instructions to fix
- Exits with error code 1

## Version Format

### Semantic Versioning
- **Major:** Breaking changes (2.0.58 -> 3.0.0)
- **Minor:** New features (2.0.58 -> 2.1.0)
- **Patch:** Bug fixes (2.0.58 -> 2.0.59)

### Cache Buster Format
```
v{version}-{date}-{suffix}
```
Example: `v2.0.45-20250820-clean`

## Database Version Tracking

### Supabase Schema Version
The database schema version is tracked in:
- `server/src/scripts/setup-database.sql`
- Migration files in `server/src/scripts/`

### Version Compatibility
- Frontend version must match backend version
- Database schema must be compatible with backend version
- Shared types must match both frontend and backend

## Deployment Version Checks

### Pre-Deployment Verification
Before any deployment:
1. Run `npm run version:verify`
2. Ensure all versions match
3. Check cache buster is current

### Post-Deployment Verification
After deployment:
1. Verify frontend displays correct version
2. Check backend API returns correct version
3. Confirm database migrations are applied

## Troubleshooting

### Version Mismatch Issues
If versions are out of sync:
```bash
# 1. Check current status
npm run version:verify

# 2. Fix by bumping version
npm run version:patch

# 3. Verify fix
npm run version:verify

# 4. Commit changes
git add .
git commit -m "BUMP: Version 2.0.46"
git push origin main
```

### Cache Issues
If frontend shows old version:
1. Check cache buster in `client/index.html`
2. Verify deployment completed successfully
3. Clear browser cache if needed

## Best Practices

### 1. Always Verify Before Deployment
```bash
npm run version:verify
```

### 2. Use Semantic Versioning
- Patch for bug fixes
- Minor for new features
- Major for breaking changes

### 3. Commit Version Changes
```bash
git add .
git commit -m "BUMP: Version {new-version}"
git push origin main
```

### 4. Document Version Changes
Update this file when making significant version changes.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.45 | 2025-08-20 | Repository cleanup, version sync system |
| 2.0.44 | 2025-08-19 | Previous stable version |
| ... | ... | ... |

## Support

For version-related issues:
1. Check this documentation
2. Run `npm run version:verify`
3. Review recent commits for version changes
4. Contact development team if issues persist
