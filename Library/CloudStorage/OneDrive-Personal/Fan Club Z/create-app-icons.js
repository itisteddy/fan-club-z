import sharp from 'sharp';
import fs from 'fs';

// Create a basic Fan Club Z icon as SVG first
const iconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#grad1)"/>
  <circle cx="256" cy="200" r="80" fill="white" opacity="0.9"/>
  <rect x="176" y="280" width="160" height="80" rx="40" fill="white" opacity="0.9"/>
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">FAN CLUB Z</text>
  <circle cx="200" cy="160" r="12" fill="#22c55e"/>
  <circle cx="256" cy="160" r="12" fill="#22c55e"/>  
  <circle cx="312" cy="160" r="12" fill="#22c55e"/>
</svg>
`;

// Write SVG file
fs.writeFileSync('client/public/icon.svg', iconSvg);

// Function to convert SVG to PNG (if sharp is available)
async function createPngIcons() {
  try {
    // Create 192x192 icon
    await sharp('client/public/icon.svg')
      .resize(192, 192)
      .png()
      .toFile('client/public/icon-192x192.png');
    
    // Create 512x512 icon  
    await sharp('client/public/icon.svg')
      .resize(512, 512)
      .png()
      .toFile('client/public/icon-512x512.png');
      
    // Create favicon
    await sharp('client/public/icon.svg')
      .resize(32, 32)
      .png()
      .toFile('client/public/favicon.png');
      
    console.log('✅ Created all PNG icons successfully!');
  } catch (error) {
    console.log('⚠️  Sharp not available, SVG icon created. You can convert manually.');
    console.log('Use: https://convertio.co/svg-png/ to convert icon.svg to PNG formats');
  }
}

// Try to create PNG icons
createPngIcons();
