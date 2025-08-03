#!/bin/bash

# Fan Club Z - PWA Icon Generator
# This script generates all required PWA icon sizes from the source SVG

echo "🎨 Generating PWA icons for Fan Club Z..."

# Check if ImageMagick or Inkscape is available
if command -v magick &> /dev/null; then
    CONVERTER="magick"
    echo "✅ Using ImageMagick for icon conversion"
elif command -v convert &> /dev/null; then
    CONVERTER="convert"
    echo "✅ Using ImageMagick (legacy) for icon conversion"
elif command -v inkscape &> /dev/null; then
    CONVERTER="inkscape"
    echo "✅ Using Inkscape for icon conversion"
else
    echo "❌ Error: No suitable image converter found."
    echo "Please install ImageMagick or Inkscape:"
    echo "  - macOS: brew install imagemagick"
    echo "  - Ubuntu: sudo apt install imagemagick"
    echo "  - Windows: Download from https://imagemagick.org/"
    exit 1
fi

# Define source and target directories
SOURCE_SVG="client/public/icons/icon.svg"
ICONS_DIR="client/public/icons"

# Check if source SVG exists
if [ ! -f "$SOURCE_SVG" ]; then
    echo "❌ Source SVG not found: $SOURCE_SVG"
    echo "Please ensure the SVG icon exists before running this script."
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p "$ICONS_DIR"

# Define required icon sizes for PWA
declare -a sizes=(
    "16:favicon"
    "32:favicon" 
    "72:android-chrome"
    "96:android-chrome"
    "128:android-chrome"
    "144:android-chrome"
    "152:apple-touch"
    "192:android-chrome"
    "384:android-chrome"
    "512:android-chrome"
)

echo "📱 Generating icons in multiple sizes..."

# Generate icons for each size
for size_info in "${sizes[@]}"; do
    IFS=':' read -r size type <<< "$size_info"
    
    if [ "$CONVERTER" = "inkscape" ]; then
        inkscape "$SOURCE_SVG" \
            --export-type=png \
            --export-filename="$ICONS_DIR/icon-${size}x${size}.png" \
            --export-width="$size" \
            --export-height="$size" \
            > /dev/null 2>&1
    else
        $CONVERTER "$SOURCE_SVG" \
            -background none \
            -size "${size}x${size}" \
            "$ICONS_DIR/icon-${size}x${size}.png" \
            > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Generated ${size}x${size} icon"
    else
        echo "  ❌ Failed to generate ${size}x${size} icon"
    fi
done

# Generate Apple Touch Icon (180x180 for iOS)
echo "🍎 Generating Apple Touch Icon..."
if [ "$CONVERTER" = "inkscape" ]; then
    inkscape "$SOURCE_SVG" \
        --export-type=png \
        --export-filename="$ICONS_DIR/apple-touch-icon.png" \
        --export-width=180 \
        --export-height=180 \
        > /dev/null 2>&1
else
    $CONVERTER "$SOURCE_SVG" \
        -background none \
        -size 180x180 \
        "$ICONS_DIR/apple-touch-icon.png" \
        > /dev/null 2>&1
fi

# Copy 192x192 icon to root as apple-touch-icon.png for root access
cp "$ICONS_DIR/icon-192x192.png" "client/public/apple-touch-icon.png" 2>/dev/null

# Generate favicon.ico (multi-size ICO file)
echo "🔖 Generating favicon.ico..."
if [ "$CONVERTER" = "magick" ] || [ "$CONVERTER" = "convert" ]; then
    $CONVERTER "$ICONS_DIR/icon-16x16.png" "$ICONS_DIR/icon-32x32.png" "client/public/favicon.ico" > /dev/null 2>&1
    echo "  ✅ Generated favicon.ico"
fi

# Generate shortcuts icons for quick actions
echo "🚀 Generating shortcut icons..."
shortcuts=("discover" "create" "wallet")

for shortcut in "${shortcuts[@]}"; do
    # For now, copy the main icon - can be customized later
    cp "$ICONS_DIR/icon-96x96.png" "$ICONS_DIR/${shortcut}-96x96.png" 2>/dev/null
    echo "  ✅ Generated ${shortcut} shortcut icon"
done

# Verify generated files
echo ""
echo "📋 Generated icon files:"
find "$ICONS_DIR" -name "*.png" | sort | while read -r file; do
    size=$(identify "$file" 2>/dev/null | cut -d' ' -f3 2>/dev/null || echo "Unknown")
    echo "  📄 $(basename "$file") - $size"
done

# Check if all required sizes exist
required_sizes=("16x16" "32x32" "72x72" "96x96" "128x128" "144x144" "152x152" "192x192" "384x384" "512x512")
missing_icons=()

for size in "${required_sizes[@]}"; do
    if [ ! -f "$ICONS_DIR/icon-${size}.png" ]; then
        missing_icons+=("$size")
    fi
done

if [ ${#missing_icons[@]} -eq 0 ]; then
    echo ""
    echo "✅ All PWA icons generated successfully!"
    echo "🎉 Your app is ready for home screen installation."
    echo ""
    echo "Next steps:"
    echo "1. Deploy your app with HTTPS"
    echo "2. Test PWA installation on different devices"
    echo "3. Verify icons appear correctly in browser dev tools"
    echo "4. Submit for app store optimization (if needed)"
else
    echo ""
    echo "⚠️  Missing icons for sizes: ${missing_icons[*]}"
    echo "Please check the conversion process and try again."
fi

echo ""
echo "📱 PWA Icon Generation Complete!"