#!/bin/bash
set -euo pipefail

# Build Android APK using Capacitor
# This script builds an APK with the latest app version

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$CLIENT_DIR/.." && pwd)"
ANDROID_DIR="$CLIENT_DIR/android"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

error() {
  echo -e "${RED}ERROR: $1${NC}" >&2
  exit 1
}

info() {
  echo -e "${GREEN}INFO: $1${NC}"
}

warn() {
  echo -e "${YELLOW}WARN: $1${NC}"
}

step() {
  echo -e "${BLUE}→ $1${NC}"
}

# Get version from package.json
APP_VERSION=$(node -p "require('$ROOT_DIR/package.json').version" 2>/dev/null || echo "2.0.78")
info "Building APK for version: $APP_VERSION"

# Step 1: Build web client
step "Building web client..."
cd "$CLIENT_DIR"
if ! npm run build > /dev/null 2>&1; then
  error "Web client build failed. Run 'npm run build' manually to see errors."
fi
info "✓ Web client built successfully"

# Step 2: Sync Capacitor
step "Syncing Capacitor Android project..."
if ! npx cap sync android > /dev/null 2>&1; then
  error "Capacitor sync failed. Check the output above for errors."
fi
info "✓ Capacitor synced successfully"

# Step 3: Check for build tools
step "Checking build prerequisites..."

# Check for Java
if ! command -v java &> /dev/null; then
  warn "Java JDK not found in PATH"
  warn "You need Java JDK 17 or higher to build Android APKs"
  echo ""
  echo "To install Java:"
  echo "  macOS: brew install openjdk@17"
  echo "  Or download from: https://adoptium.net/"
  echo ""
fi

# Check for Android SDK
if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  warn "ANDROID_HOME or ANDROID_SDK_ROOT not set"
  warn "Android SDK is required to build APKs"
  echo ""
  echo "To set up Android SDK:"
  echo "  1. Install Android Studio from https://developer.android.com/studio"
  echo "  2. Open Android Studio and install Android SDK"
  echo "  3. Set ANDROID_HOME environment variable:"
  echo "     export ANDROID_HOME=\$HOME/Library/Android/sdk"
  echo "     export PATH=\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools"
  echo ""
fi

# Check for Gradle
if ! command -v gradle &> /dev/null; then
  # Check for Gradle wrapper
  if [ ! -f "$ANDROID_DIR/gradlew" ]; then
    warn "Gradle not found and no Gradle wrapper present"
    warn "You need Gradle to build Android APKs"
    echo ""
    echo "Options:"
    echo "  1. Install Gradle: brew install gradle (macOS)"
    echo "  2. Use Android Studio (recommended):"
    echo "     - Open $ANDROID_DIR in Android Studio"
    echo "     - Build > Build Bundle(s) / APK(s) > Build APK(s)"
    echo ""
  else
    info "✓ Gradle wrapper found"
    GRADLE_CMD="$ANDROID_DIR/gradlew"
  fi
else
  info "✓ Gradle found"
  GRADLE_CMD="gradle"
fi

# Step 4: Build APK
if command -v java &> /dev/null && ([ -n "${ANDROID_HOME:-}" ] || [ -n "${ANDROID_SDK_ROOT:-}" ]) && ([ -f "$ANDROID_DIR/gradlew" ] || command -v gradle &> /dev/null); then
  step "Building APK..."
  cd "$ANDROID_DIR"
  
  if [ -f "$ANDROID_DIR/gradlew" ]; then
    chmod +x "$ANDROID_DIR/gradlew"
    ./gradlew assembleDebug
  else
    gradle assembleDebug
  fi
  
  APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
  
  if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    info "✓ APK built successfully!"
    echo ""
    echo "APK Location: $APK_PATH"
    echo "APK Size: $APK_SIZE"
    echo "Version: $APP_VERSION"
    echo ""
    
    # Copy to a convenient location
    OUTPUT_DIR="$CLIENT_DIR/dist/downloads"
    mkdir -p "$OUTPUT_DIR"
    cp "$APK_PATH" "$OUTPUT_DIR/FanClubZ-v${APP_VERSION}.apk"
    info "✓ Copied APK to $OUTPUT_DIR/FanClubZ-v${APP_VERSION}.apk"
  else
    error "APK build completed but APK file not found at expected location"
  fi
else
  warn "Cannot build APK automatically - missing prerequisites"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "  BUILD APK USING ANDROID STUDIO (RECOMMENDED)"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "1. Install Android Studio: https://developer.android.com/studio"
  echo ""
  echo "2. Open the Android project:"
  echo "   Open Android Studio → Open → Select: $ANDROID_DIR"
  echo ""
  echo "3. Wait for Gradle sync to complete"
  echo ""
  echo "4. Build the APK:"
  echo "   Build → Build Bundle(s) / APK(s) → Build APK(s)"
  echo ""
  echo "5. The APK will be located at:"
  echo "   $ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "Web build and Capacitor sync are complete."
  echo "The Android project is ready for building in Android Studio."
  echo ""
fi

