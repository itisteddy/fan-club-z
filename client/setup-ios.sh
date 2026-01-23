#!/bin/bash
# Setup script for iOS development
# This installs CocoaPods and sets up the iOS project

set -e

echo "🔧 Setting up iOS development environment..."

# Step 1: Install dependencies for Ruby 2.6 (requires sudo)
echo ""
echo "📦 Installing dependencies compatible with Ruby 2.6..."
echo "   (You may be prompted for your password)"
echo "   Your Ruby version: $(ruby -v)"
echo ""
echo "   Step 1/2: Installing ffi 1.14.2 (works with Ruby 2.6)..."
sudo gem install ffi -v 1.14.2

echo ""
echo "   Step 2/2: Installing CocoaPods 1.9.3 (works with ffi 1.14.2 and Ruby 2.6)..."
sudo gem install cocoapods -v 1.9.3

# Step 2: Verify installation
echo ""
echo "✅ Verifying CocoaPods installation..."
pod --version

# Step 3: Install pods
echo ""
echo "📥 Installing CocoaPods dependencies..."
cd ios/App
pod install
cd ../..

# Step 4: Sync Capacitor
echo ""
echo "🔄 Syncing Capacitor..."
npx cap sync ios

# Step 5: Open in Xcode
echo ""
echo "🚀 Opening Xcode workspace..."
open ios/App/App.xcworkspace

echo ""
echo "✅ Setup complete! Xcode should now open with the project."
echo ""
echo "Next steps:"
echo "1. Wait for Xcode to finish indexing"
echo "2. Select an iOS Simulator (e.g., iPhone 15 Pro)"
echo "3. Click the Play button (or press Cmd+R) to build and run"
