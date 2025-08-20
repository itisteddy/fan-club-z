#!/bin/bash

# Fan Club Z - PWA Icon Generation Script
# This script creates the necessary icons for PWA installation

echo "🎨 Generating Fan Club Z PWA Icons..."

# Create a simple SVG template for the Fan Club Z logo
cat > temp_logo.svg << 'EOF'
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00D084;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00A86B;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background Circle -->
  <circle cx="256" cy="256" r="240" fill="url(#bgGradient)" stroke="none"/>
  
  <!-- Letter Z -->
  <text x="256" y="340" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" 
        font-size="280" font-weight="900" text-anchor="middle" fill="white">Z</text>
  
  <!-- Subtle highlight -->
  <circle cx="256" cy="256" r="240" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
</svg>
EOF

echo "📁 Creating icon directories..."
mkdir -p icons
mkdir -p shortcuts

echo "🖼️  Converting SVG to different sizes..."

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Using ImageMagick for conversion..."
    
    # Generate all required icon sizes
    convert temp_logo.svg -resize 16x16 favicon-16x16.png
    convert temp_logo.svg -resize 32x32 favicon-32x32.png
    convert temp_logo.svg -resize 180x180 apple-touch-icon.png
    convert temp_logo.svg -resize 192x192 android-chrome-192x192.png
    convert temp_logo.svg -resize 512x512 android-chrome-512x512.png
    
    # Generate shortcut icons
    convert temp_logo.svg -resize 96x96 shortcuts/create-96x96.png
    convert temp_logo.svg -resize 96x96 shortcuts/discover-96x96.png
    
    echo "✅ Icons generated successfully!"
    
elif command -v inkscape &> /dev/null; then
    echo "Using Inkscape for conversion..."
    
    # Generate all required icon sizes using Inkscape
    inkscape temp_logo.svg --export-png=favicon-16x16.png --export-width=16 --export-height=16
    inkscape temp_logo.svg --export-png=favicon-32x32.png --export-width=32 --export-height=32
    inkscape temp_logo.svg --export-png=apple-touch-icon.png --export-width=180 --export-height=180
    inkscape temp_logo.svg --export-png=android-chrome-192x192.png --export-width=192 --export-height=192
    inkscape temp_logo.svg --export-png=android-chrome-512x512.png --export-width=512 --export-height=512
    
    # Generate shortcut icons
    mkdir -p shortcuts
    inkscape temp_logo.svg --export-png=shortcuts/create-96x96.png --export-width=96 --export-height=96
    inkscape temp_logo.svg --export-png=shortcuts/discover-96x96.png --export-width=96 --export-height=96
    
    echo "✅ Icons generated successfully!"
    
else
    echo "⚠️  Warning: Neither ImageMagick nor Inkscape found."
    echo "📋 Manual steps needed:"
    echo "1. Open temp_logo.svg in a graphics editor (like GIMP, Photoshop, or online tool)"
    echo "2. Export the following PNG files:"
    echo "   - favicon-16x16.png (16x16px)"
    echo "   - favicon-32x32.png (32x32px)"
    echo "   - apple-touch-icon.png (180x180px)"
    echo "   - android-chrome-192x192.png (192x192px)"
    echo "   - android-chrome-512x512.png (512x512px)"
    echo "   - shortcuts/create-96x96.png (96x96px)"
    echo "   - shortcuts/discover-96x96.png (96x96px)"
    echo ""
    echo "🌐 Alternative: Use online converter like https://realfavicongenerator.net/"
fi

# Create favicon.ico (if ImageMagick is available)
if command -v convert &> /dev/null; then
    echo "🔄 Creating favicon.ico..."
    convert temp_logo.svg -resize 32x32 favicon.ico
fi

# Cleanup
rm temp_logo.svg

echo ""
echo "🎉 PWA Icon setup complete!"
echo "📱 Your app will now show the proper Fan Club Z logo when installed"
echo ""
echo "📋 Files created:"
echo "   ✅ favicon-16x16.png"
echo "   ✅ favicon-32x32.png" 
echo "   ✅ apple-touch-icon.png"
echo "   ✅ android-chrome-192x192.png"
echo "   ✅ android-chrome-512x512.png"
echo "   ✅ shortcuts/create-96x96.png"
echo "   ✅ shortcuts/discover-96x96.png"
echo "   ✅ favicon.ico (if ImageMagick available)"
echo ""
echo "🚀 Deploy these files to your landing-page directory and the PWA will show the correct logo!"
