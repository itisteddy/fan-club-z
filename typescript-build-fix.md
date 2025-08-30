# TypeScript Build Configuration Fix for Render

## Problem
Render deployment failing with TypeScript error:
```
error TS6059: File '/opt/render/project/src/shared/src/index.ts' is not under 'rootDir' '/opt/render/project/src/server/src'. 'rootDir' is expected to contain all source files.
```

## Root Cause
The server's `tsconfig.json` was including shared source files directly in the `include` pattern:
```json
{
  "include": [
    "src/**/*",
    "../shared/src/**/*"  // ← This caused the rootDir conflict
  ]
}
```

But the server already depends on `@fanclubz/shared` as a built dependency, so it doesn't need to include the source files.

## Solution Applied

### 1. Fixed server/tsconfig.json
```json
{
  "compilerOptions": {
    "rootDir": "./src",
    // ... other options
  },
  "include": [
    "src/**/*"  // Only include server source files
  ],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 2. Build Process
The correct build sequence:
1. `npm run build:shared` - Builds shared module to `shared/dist/`
2. `tsc` - Builds server using the built shared dependency

### 3. Import Resolution
Server imports work through the dependency resolution:
```typescript
import { RegisterUserSchema } from '@fanclubz/shared'; // ← Uses built package
```

## Verification Steps
1. ✅ Shared module builds successfully
2. ✅ Server module builds without rootDir errors
3. ✅ Full build process completes
4. ✅ Ready for Render deployment

## Files Modified
- `server/tsconfig.json` - Removed shared source includes
- `shared/src/types.ts` - Removed duplicate exports (previous fix)

## Build Commands
```bash
# Test builds locally
./fix-build-config.sh

# Deploy to Render
./deploy-complete-fix.sh development
```

## Expected Result
- No more TS6059 rootDir errors
- Clean TypeScript compilation on Render
- Successful deployment and WebSocket functionality