const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 teal PNG (will be resized by Android)
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Create a proper colored PNG using a simple approach
// This creates a minimal valid PNG with teal color (#14b8a6 = RGB 20, 184, 166)
function createTealPNG(size) {
  // Create a minimal PNG header + IHDR + IDAT + IEND
  // For simplicity, we'll create a 1x1 pixel PNG and let Android scale it
  // A proper implementation would create the full PNG structure, but this works for now
  return minimalPNG;
}

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

const resDir = path.join(__dirname, 'app/src/main/res');

Object.entries(sizes).forEach(([dir, size]) => {
  const dirPath = path.join(resDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const iconPath = path.join(dirPath, 'ic_launcher.png');
  // For now, copy the minimal PNG - Android will handle scaling
  fs.writeFileSync(iconPath, minimalPNG);
  console.log(`Created ${iconPath}`);
});

console.log('All launcher icons created!');

