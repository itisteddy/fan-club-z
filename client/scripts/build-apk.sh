#!/bin/bash
set -euo pipefail

# Build Android APK from PWA using Bubblewrap
# This script generates a Trusted Web Activity (TWA) APK that wraps the production PWA

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$CLIENT_DIR/.." && pwd)"

# Configuration
PROD_URL="${PROD_URL:-}"
PACKAGE_ID="com.fcz.app"
APP_NAME="Fan Club Z"
TWA_DIR="$CLIENT_DIR/twa"
KEYSTORE_PATH="$CLIENT_DIR/android/keystore.jks"
KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-}"
KEYSTORE_ALIAS="${KEYSTORE_ALIAS:-fcz-key}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Validate production URL
if [ -z "$PROD_URL" ]; then
  error "PROD_URL environment variable is required (e.g., https://fanclubz.vercel.app)"
fi

# Ensure URL has protocol
if [[ ! "$PROD_URL" =~ ^https?:// ]]; then
  PROD_URL="https://$PROD_URL"
fi

MANIFEST_URL="$PROD_URL/manifest.webmanifest"

info "Building APK for production URL: $PROD_URL"
info "Manifest URL: $MANIFEST_URL"

# Verify manifest is reachable
info "Verifying manifest is accessible..."
if ! curl -f -s -o /dev/null "$MANIFEST_URL"; then
  error "Manifest not reachable at $MANIFEST_URL. Please ensure the production deployment is live and serving the manifest."
fi

info "Manifest verified ✓"

# Install Bubblewrap if not already installed
if ! command -v bubblewrap &> /dev/null; then
  info "Installing Bubblewrap CLI..."
  npm install -g @bubblewrap/cli@latest || error "Failed to install Bubblewrap"
fi

# Create TWA directory if it doesn't exist
if [ ! -d "$TWA_DIR" ]; then
  info "Initializing TWA project..."
  cd "$CLIENT_DIR"
  
  # Initialize with manifest URL
  echo "y" | npx @bubblewrap/cli@latest init \
    --manifest="$MANIFEST_URL" \
    --directory="$TWA_DIR" \
    --packageId="$PACKAGE_ID" \
    --appVersionName="2.0.76" \
    --appVersionCode="20076" \
    --appName="$APP_NAME" \
    --keyPath="$KEYSTORE_PATH" \
    --keyAlias="$KEYSTORE_ALIAS" \
    || error "Failed to initialize TWA project"
else
  info "TWA directory exists, updating manifest..."
  cd "$TWA_DIR"
  
  # Update manifest URL in twa-manifest.json
  if [ -f "twa-manifest.json" ]; then
    # Use jq if available, otherwise use sed
    if command -v jq &> /dev/null; then
      jq ".startUrl = \"$PROD_URL\"" twa-manifest.json > twa-manifest.json.tmp && mv twa-manifest.json.tmp twa-manifest.json
      jq ".manifestUrl = \"$MANIFEST_URL\"" twa-manifest.json > twa-manifest.json.tmp && mv twa-manifest.json.tmp twa-manifest.json
    else
      sed -i.bak "s|\"startUrl\": \".*\"|\"startUrl\": \"$PROD_URL\"|" twa-manifest.json
      sed -i.bak "s|\"manifestUrl\": \".*\"|\"manifestUrl\": \"$MANIFEST_URL\"|" twa-manifest.json
    fi
  fi
fi

# Create keystore if it doesn't exist
if [ ! -f "$KEYSTORE_PATH" ]; then
  warn "Keystore not found. Creating new keystore..."
  mkdir -p "$(dirname "$KEYSTORE_PATH")"
  
  if [ -z "$KEYSTORE_PASSWORD" ]; then
    warn "KEYSTORE_PASSWORD not set. Generating a random password..."
    KEYSTORE_PASSWORD=$(openssl rand -base64 32)
    warn "Generated keystore password. Save this securely: $KEYSTORE_PASSWORD"
    warn "Store this in CI secrets as KEYSTORE_PASSWORD"
  fi
  
  keytool -genkey -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEYSTORE_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEYSTORE_PASSWORD" \
    -dname "CN=Fan Club Z, OU=Development, O=Fan Club Z, L=San Francisco, ST=CA, C=US" \
    || error "Failed to create keystore"
  
  info "Keystore created at $KEYSTORE_PATH"
  warn "IMPORTANT: Backup this keystore securely. You'll need it for future updates."
else
  info "Using existing keystore at $KEYSTORE_PATH"
  if [ -z "$KEYSTORE_PASSWORD" ]; then
    error "KEYSTORE_PASSWORD is required when using existing keystore"
  fi
fi

# Build APK
info "Building APK..."
cd "$TWA_DIR"

# Update build configuration if needed
if [ -f "twa-manifest.json" ]; then
  # Ensure package ID matches
  if command -v jq &> /dev/null; then
    jq ".packageId = \"$PACKAGE_ID\"" twa-manifest.json > twa-manifest.json.tmp && mv twa-manifest.json.tmp twa-manifest.json
  fi
fi

# Build with keystore
npx @bubblewrap/cli@latest build \
  --keyPath="$KEYSTORE_PATH" \
  --keyAlias="$KEYSTORE_ALIAS" \
  --keyPassword="$KEYSTORE_PASSWORD" \
  || error "Failed to build APK"

# Find the generated APK
APK_PATH=$(find "$TWA_DIR" -name "*.apk" -type f | head -1)

if [ -z "$APK_PATH" ]; then
  error "APK not found after build"
fi

info "APK built successfully: $APK_PATH"

# Generate checksum
CHECKSUM=$(shasum -a 256 "$APK_PATH" | cut -d' ' -f1)
info "SHA-256 checksum: $CHECKSUM"

# Output paths for CI
echo "APK_PATH=$APK_PATH"
echo "APK_CHECKSUM=$CHECKSUM"

# Copy to downloads directory if it exists
DOWNLOADS_DIR="$CLIENT_DIR/public/downloads"
if [ -d "$DOWNLOADS_DIR" ]; then
  mkdir -p "$DOWNLOADS_DIR"
  cp "$APK_PATH" "$DOWNLOADS_DIR/app-latest.apk"
  info "Copied APK to $DOWNLOADS_DIR/app-latest.apk"
  
  # Generate checksums.json
  cat > "$DOWNLOADS_DIR/checksums.json" <<EOF
{
  "app-latest.apk": {
    "sha256": "$CHECKSUM",
    "size": $(stat -f%z "$APK_PATH" 2>/dev/null || stat -c%s "$APK_PATH" 2>/dev/null),
    "version": "2.0.76",
    "updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF
  info "Generated checksums.json"
fi

info "✓ APK build complete!"
echo ""
echo "APK Location: $APK_PATH"
echo "SHA-256: $CHECKSUM"
echo ""
echo "Next steps:"
echo "1. Test the APK on an Android device"
echo "2. Upload to downloads directory for public access"
echo "3. Update landing page with download link"

