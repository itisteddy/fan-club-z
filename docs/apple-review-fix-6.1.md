# Apple Review Fix 6.1: Edit Profile Photo Crash (iPad) + Android parity

## Root cause
- The profile photo flow relied on browser file input capture only.
- In native iOS/iPad contexts this path was not defensive enough for camera permission denial, unavailable camera, and cancellation edge cases.
- The camera launch path had no native-safe normalization and no guaranteed user-visible recovery state.

## Fix implemented
- Added `@capacitor/camera` and a unified native picker helper in `client/src/lib/profilePhotoPicker.ts`.
- Replaced Edit Profile photo action with explicit actions:
  - `Take photo`
  - `Choose photo`
- Added defensive handling for:
  - permission denied (`Open Settings` prompt)
  - camera unavailable (fallback to photo library)
  - user cancellation (silent return)
  - invalid image type/size validation
- Added DEV-only diagnostics logging in picker helper.

## Files
- `client/src/lib/profilePhotoPicker.ts`
- `client/src/pages/ProfilePageV2.tsx`
- `client/package.json`

## Validation checklist
1. iPad: Profile -> Edit -> Take photo opens camera or fallback without crash.
2. iPad: deny camera permission -> user gets actionable message and settings option.
3. iPad: cancel capture -> modal remains stable, no error toast loop.
4. iPhone: capture photo, upload succeeds, avatar updates.
5. Android app/webview: capture photo and choose-photo both return image and upload.
6. Android/iOS: invalid file type or >10MB shows validation error.
