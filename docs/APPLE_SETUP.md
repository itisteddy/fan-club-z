# Apple Developer + App Store Connect Setup

**Last Updated:** 2026-01-23  
**Phase 7D:** Apple-side setup and Xcode signing alignment

---

## Prerequisites

### 1. Apple Developer Program Enrollment

**Required:** You must be enrolled in the Apple Developer Program ($99/year USD).

**Steps:**
1. Go to [Apple Developer Program](https://developer.apple.com/programs/)
2. Click "Enroll"
3. Choose Individual or Organization
4. Complete enrollment process
5. Wait for approval (usually 24-48 hours)

### 2. Sign Latest Agreements

**Critical:** App Store Connect blocks app creation until agreements are signed.

**Steps:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Agreements, Tax, and Banking**
3. **Account Holder** must sign:
   - Paid Applications Agreement
   - Apple Developer Program License Agreement
4. Complete tax and banking information

**Status Check:**
- All agreements show "Active" status
- No pending signatures or warnings

---

## Bundle Identifier

### Recommended Bundle ID

```
app.fanclubz.mobile
```

**Alternative:** `app.fanclubz.ios`

**Rules:**
- Must be unique across the App Store
- Cannot conflict with existing bundle IDs
- Use reverse domain notation
- Cannot contain spaces or special characters (except dots, hyphens)

---

## App Store Connect: Create App Record

### Steps

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Click **My Apps** → **+ (Add)** → **New App**
3. Fill in required fields:

**Platform:** iOS

**Name:** Fan Club Z

**Primary Language:** English (US)

**Bundle ID:** Select `app.fanclubz.mobile` (or create new one)
   - If not in dropdown, register it first in Certificates, Identifiers & Profiles

**SKU:** `fanclubz-mobile` (or any unique identifier for internal use)

4. Click **Create**

### Post-Creation

- **App Information:** Add description, keywords, category
- **Pricing and Availability:** Set to Free (or your pricing model)
- **App Privacy:** Complete privacy questionnaire
- **Age Rating:** Complete age rating questionnaire

**Note:** You cannot upload builds until the app record exists.

---

## Certificates, Identifiers & Profiles

### Create App ID

1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+ (Add)** → **App IDs**
3. Select **App** → Continue
4. Fill in:
   - **Description:** Fan Club Z iOS
   - **Bundle ID:** Explicit → `app.fanclubz.mobile`
   - **Capabilities:** Enable only what you need:
     - ✅ Associated Domains (if using deep links)
     - ✅ Push Notifications (if using)
     - ❌ In-App Purchase (not needed for demo-only)
     - ❌ Apple Pay (not needed)
5. Click **Continue** → **Register**

### Signing Strategy: Automatic (Recommended)

**Automatic Signing** lets Xcode manage provisioning profiles automatically.

**Pros:**
- No manual profile management
- Xcode handles cert/profile generation
- Automatic renewal

**Cons:**
- Requires Xcode to be signed in with your Apple ID
- Less control over provisioning

**When to use Manual:**
- Enterprise distribution
- CI/CD without Xcode access
- Multiple team members

For most cases, **use Automatic**.

---

## Xcode Configuration

### 1. Add Apple ID to Xcode

1. Open Xcode
2. **Xcode → Settings** (or **Preferences** in older Xcode)
3. Go to **Accounts** tab
4. Click **+** → **Add Apple ID**
5. Sign in with your Apple Developer account
6. Verify your team appears under your account

### 2. Configure Signing & Capabilities

1. Open `client/ios/App/App.xcworkspace` in Xcode
2. Select the **App** target (left panel, under TARGETS)
3. Go to **Signing & Capabilities** tab
4. Configure:

**Automatically manage signing:** ✅ Checked

**Team:** Select your team (Individual or Organization)

**Bundle Identifier:** `app.fanclubz.mobile`

**Signing Certificate:** Automatically selected by Xcode

**Provisioning Profile:** Automatically selected by Xcode

### 3. Verify Signing Works

1. Select a simulator or device from the scheme selector
2. Click **Product → Build** (or Cmd+B)
3. Build should succeed without signing errors

**Common Errors:**
- "No signing certificate" → Add Apple ID to Xcode Accounts
- "No provisioning profile" → Enable automatic signing and select team
- "Bundle identifier mismatch" → Check Bundle ID matches App Store Connect

---

## Versioning Strategy

### Version (Marketing Version)

- Format: `1.0.0` (semantic versioning)
- Shown to users in App Store
- Increment for major releases

### Build Number

- Format: `1`, `2`, `3`, etc. (incrementing integers)
- Internal tracking only
- **Must increment** for every upload to App Store Connect

**Rule:** Each upload must have a **unique build number higher than previous uploads**.

### How to Update

1. In Xcode, select App target
2. Go to **General** tab
3. Update:
   - **Version:** `1.0.0` (or current version)
   - **Build:** Increment by 1

---

## URL Schemes (Deep Links)

For OAuth callback to work, ensure URL scheme is registered:

1. In Xcode, App target → **Info** tab
2. Expand **URL Types**
3. Verify entry exists:
   - **Identifier:** `fanclubz-auth`
   - **URL Schemes:** `fanclubz`
   - **Role:** Editor

If missing, click **+** to add.

---

## TestFlight Setup

### Create Internal Testing Group

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app → **TestFlight** tab
3. Under **Internal Testing**, click **+** (Add Group)
4. Name: "Internal Testers" (or preferred name)
5. Click **Create**

### Add Internal Testers

1. Click on your Internal Testing group
2. Click **Testers** → **+** (Add Testers)
3. Add team members by Apple ID email
4. Testers will receive email invite to download TestFlight app

**Note:** Internal testers must:
- Have iOS device (iPhone or iPad)
- Install **TestFlight** app from App Store
- Accept the invitation email

---

## Archive Readiness Checklist

Before running **Product → Archive**:

- [ ] Apple ID added to Xcode Accounts
- [ ] Team selected in Signing & Capabilities
- [ ] Automatic signing enabled
- [ ] Bundle Identifier matches App Store Connect (`app.fanclubz.mobile`)
- [ ] Version and Build number set
- [ ] URL scheme registered (`fanclubz://`)
- [ ] PrivacyInfo.xcprivacy in target and Copy Bundle Resources
- [ ] Build succeeds on simulator/device without errors

---

## Common Issues & Fixes

### "No Team Available"
- **Fix:** Add Apple ID to Xcode Accounts
- **Fix:** Ensure Developer Program enrollment is complete

### "Bundle Identifier Not Available"
- **Fix:** Register App ID in Certificates, Identifiers & Profiles first
- **Fix:** Ensure Bundle ID doesn't conflict with existing apps

### "Signing Certificate Expired"
- **Fix:** Xcode will prompt to renew automatically if using automatic signing
- **Fix:** Manually renew in developer portal if using manual signing

### "Provisioning Profile Doesn't Include Signing Certificate"
- **Fix:** Enable automatic signing (recommended)
- **Fix:** Regenerate provisioning profile in developer portal

### "Archive Disabled (Grayed Out)"
- **Fix:** Select "Any iOS Device" (not simulator) from scheme selector
- **Fix:** Connect a real device if needed

---

## Next Steps

After completing Apple setup:
1. Verify archive builds successfully
2. Proceed to Phase 7E (Upload and TestFlight)
3. Test internally before submitting for review
