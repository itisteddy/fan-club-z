# iOS Setup Instructions

## Quick Setup (Automated)

Run the setup script:

```bash
cd client
./setup-ios.sh
```

This will:
1. Install CocoaPods (you'll be prompted for your password)
2. Install all dependencies
3. Sync Capacitor
4. Open Xcode

## Manual Setup (Step-by-Step)

### Step 1: Install CocoaPods

Open Terminal and run:

```bash
sudo gem install cocoapods -v 1.15.2
```

Enter your password when prompted. This installs CocoaPods system-wide.

**Note**: If you get a Ruby version error, CocoaPods 1.15.2 works with Ruby 2.6+.

### Step 2: Verify Installation

```bash
pod --version
```

You should see: `1.15.2` (or similar)

### Step 3: Install Pods

```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0/client/ios/App"
pod install
```

This will:
- Create the `Pods` directory
- Generate the workspace file properly
- Install all Capacitor dependencies

**Expected output**: You should see "Pod installation complete!"

### Step 4: Sync Capacitor

```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0/client"
npx cap sync ios
```

### Step 5: Open in Xcode

```bash
open ios/App/App.xcworkspace
```

**IMPORTANT**: Always open `App.xcworkspace`, NOT `App.xcodeproj`

## Troubleshooting

### "pod: command not found"

If `pod` command isn't found after installation:

1. Check if it's installed:
   ```bash
   sudo gem list cocoapods
   ```

2. Add to PATH (add to `~/.zshrc` or `~/.bash_profile`):
   ```bash
   export PATH="/usr/local/bin:$PATH"
   ```

3. Restart terminal or run:
   ```bash
   source ~/.zshrc
   ```

### "Ruby version too old"

If you see Ruby version errors:

1. Install an older CocoaPods version:
   ```bash
   sudo gem install cocoapods -v 1.11.3
   ```

2. Or upgrade Ruby (requires Homebrew):
   ```bash
   brew install ruby
   ```

### Workspace appears empty in Xcode

This means `pod install` hasn't run yet. The workspace needs the `Pods` project to be visible.

**Fix**:
1. Make sure you ran `pod install` (Step 3)
2. Close Xcode completely
3. Reopen `App.xcworkspace` (not `.xcodeproj`)

### "No such module 'Capacitor'"

This means pods aren't installed. Run `pod install` in the `ios/App` directory.

## After Setup

Once Xcode opens with the project:

1. **Wait for indexing**: Xcode will index the project (status bar shows progress)
2. **Select simulator**: Click device selector → Choose "iPhone 15 Pro" (or any simulator)
3. **Build & Run**: Click Play button (▶️) or press `Cmd + R`
4. **First build**: May take 2-5 minutes

## Verification Checklist

After setup, you should see in Xcode:

- ✅ Left sidebar shows:
  - `App` (blue project icon)
  - `Pods` (folder)
  - `App.xcworkspace` (workspace)
- ✅ No red errors in Issue Navigator
- ✅ Build succeeds without errors

## Next Steps

See `docs/mobile/STORE-CHECKLIST.md` for:
- Build configuration
- Store submission checklist
- Environment variables
- Testing procedures
