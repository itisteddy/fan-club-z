# Fix Code Signing Errors for App Store Archive

## Problem
You're getting these errors when trying to archive:
1. "Communication with Apple failed: Your team has no devices..."
2. "No profiles for 'app.fanclubz.app' were found"
3. Capacitor-Capacitor and CapacitorCordova targets require development team

## Root Causes
1. **Capacitor framework targets** need team selection (they're separate targets)
2. **Bundle ID** may not be registered in Apple Developer portal
3. **Provisioning profiles** need to be generated/refreshed
4. For **App Store**, you need **Distribution** profiles, not Development

## Step-by-Step Fix

### Step 1: Fix Podfile and Reinstall Pods

The Podfile has been fixed to use standard paths. Now reinstall:

```bash
cd client/ios/App
pod install
```

### Step 2: Verify Apple Developer Account in Xcode

1. **Xcode → Settings (Preferences) → Accounts**
2. Ensure your Apple ID is added (the one with team "Umoeete Onojegnuo")
3. If not added:
   - Click **"+"** → Add Apple ID
   - Sign in with your Apple Developer account
4. Select your team → Click **"Download Manual Profiles"**
5. Wait for profiles to download

### Step 3: Register Bundle ID (if not already done)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **"+"** (if `app.fanclubz.app` doesn't exist)
4. Select **App IDs** → Continue
5. Select **App** → Continue
6. **Description**: "Fan Club Z"
7. **Bundle ID**: Select **Explicit** → Enter `app.fanclubz.app`
8. **Capabilities**: Enable any you need (Push Notifications, etc.)
9. Click **Continue** → **Register**

### Step 4: Fix Signing for ALL Targets in Xcode

**CRITICAL**: You must set the team for **ALL targets**, not just "App":

1. Open **`client/ios/App/App.xcworkspace`** in Xcode
2. In the **Project Navigator** (left sidebar), click the **blue "App" project icon** (top)
3. In the **TARGETS** list, you'll see:
   - **App** (main target)
   - **Capacitor-Capacitor** (framework target)
   - **CapacitorCordova-CapacitorCordova** (framework target)
   - Possibly others

4. **For EACH target** (one at a time):
   - Select the target (e.g., "Capacitor-Capacitor")
   - Go to **"Signing & Capabilities"** tab
   - Check **"Automatically manage signing"**
   - Select your **Team**: "Umoeete Onojegnuo" (or your team name)
   - If you see errors, click **"Try Again"** or **"Download Manual Profiles"**

5. **Repeat for ALL targets**:
   - ✅ App
   - ✅ Capacitor-Capacitor
   - ✅ CapacitorCordova-CapacitorCordova
   - ✅ Any other targets shown

### Step 5: Set Build Configuration to Release

1. **Product → Scheme → Edit Scheme...**
2. Under **"Archive"** → **Build Configuration** → Select **"Release"**
3. Click **"Close"**

### Step 6: Clean and Try Archive Again

1. **Product → Clean Build Folder** (Shift+Cmd+K)
2. **Product → Archive**

### Step 7: If "No Devices" Error Persists

This error is **normal for App Store distribution**. It's trying to create a Development profile, but for App Store you need Distribution.

**Fix:**
1. In Xcode, go to **App** target → **Signing & Capabilities**
2. Under **"Provisioning Profile"**, you should see it trying to use "iOS App Development"
3. For **Archive builds**, Xcode should automatically switch to **"iOS App Store"** profile
4. If it doesn't:
   - Go to [Apple Developer Portal](https://developer.apple.com/account/)
   - **Profiles** → **"+"** → **App Store** → Continue
   - Select **App ID**: `app.fanclubz.app`
   - Select **Certificate**: Your Distribution certificate (or create one)
   - **Profile Name**: "Fan Club Z App Store"
   - Click **Generate** → **Download**
   - In Xcode: **Signing & Capabilities** → Uncheck "Automatically manage signing" → Select the downloaded profile

### Step 8: Verify Archive Works

After fixing all targets:
1. **Product → Archive**
2. If successful, **Organizer** opens
3. Click **"Validate App"** → Follow prompts
4. If validation passes → **"Distribute App"**

## Quick Checklist

- [ ] Podfile fixed (standard paths)
- [ ] `pod install` completed
- [ ] Apple ID added in Xcode Settings → Accounts
- [ ] Bundle ID `app.fanclubz.app` registered in Developer Portal
- [ ] **ALL targets** have team selected (App, Capacitor-Capacitor, CapacitorCordova)
- [ ] Build Configuration set to **Release** for Archive
- [ ] Clean Build Folder completed
- [ ] Archive succeeds

## Common Issues

### "Team has no devices"
- **For App Store**: This is OK. You need Distribution profiles, not Development.
- Ensure you have an **active Apple Developer Program membership** ($99/year)

### "Bundle ID already exists"
- The bundle ID is already registered to another team/account
- Either:
  - Use a different bundle ID (e.g., `app.fanclubz.ios`)
  - Transfer the bundle ID to your team
  - Use the existing team that owns it

### Capacitor targets still show errors
- These are framework targets managed by CocoaPods
- They need the same team as your main app
- After `pod install`, they should appear in Xcode targets list
- Set team for each one manually

## Still Stuck?

If errors persist after following all steps:
1. Share the **exact error message** from Xcode
2. Verify your **Apple Developer Program** membership is active
3. Check that your **team ID** matches in Xcode and Developer Portal
