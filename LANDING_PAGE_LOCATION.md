# Landing Page Project Location

## Current Status

**Found:** The landing page project is located at `client/client/`

**Vercel Project:** "landing-page" (projectId: `prj_ksSZhiJjGoOD9PxbursfWNZ9zZ2U`)

**Current State:** 
- Only contains `.vercel/` config and `package.json`
- No source files found
- This is confusing because it's nested inside the main client directory

## Recommendation: Reorganize Structure

To make this less confusing, the landing page should be moved to a clearer location:

### Option 1: Move to root level (Recommended)
```
FanClubZ-version2.0/
├── client/              # Main app
├── landing-page/        # Separate landing page project
├── server/
└── ...
```

### Option 2: Keep nested but document clearly
```
FanClubZ-version2.0/
├── client/
│   ├── src/            # Main app source
│   └── landing-page/   # Landing page (rename from client/client)
└── ...
```

## APK Download Setup

The APK is available at:
- **Location:** `client/public/downloads/app-latest.apk`
- **Version:** 2.0.78
- **Size:** 5,095,184 bytes (4.9 MB)
- **SHA-256:** `69c0cbffb196057cda2c6d82ba9c83c8f298fd1466128eaa69ebd30ce400a87d`
- **Checksums:** `client/public/downloads/checksums.json`

The landing page should reference: `/downloads/app-latest.apk` (when deployed from the main client project) or use a full URL to the main app's downloads directory.

## Next Steps

1. **Locate or create landing page source files**
2. **Update landing page to reference new APK version (2.0.78)**
3. **Reorganize directory structure for clarity**
4. **Document the relationship between projects**

