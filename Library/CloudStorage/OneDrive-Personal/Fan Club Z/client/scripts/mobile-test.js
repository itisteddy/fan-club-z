#!/usr/bin/env node

import { execSync } from 'child_process';
import os from 'os';

console.log('🚀 Fan Club Z - Mobile Testing Setup\n');

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();
const frontendPort = 3000;
const backendPort = 5001;

console.log('📱 Mobile Testing Information:');
console.log(`Frontend URL: http://${localIP}:${frontendPort}`);
console.log(`Backend URL: http://${localIP}:${backendPort}`);
console.log('');

// Check if servers are running
function checkServer(port, name) {
  try {
    execSync(`curl -s http://localhost:${port} > /dev/null`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const frontendRunning = checkServer(frontendPort, 'Frontend');
const backendRunning = checkServer(backendPort, 'Backend');

console.log('🔍 Server Status:');
console.log(`Frontend (${frontendPort}): ${frontendRunning ? '✅ Running' : '❌ Not running'}`);
console.log(`Backend (${backendPort}): ${backendRunning ? '✅ Running' : '❌ Not running'}`);
console.log('');

if (!frontendRunning || !backendRunning) {
  console.log('⚠️  Please start both servers first:');
  console.log('1. Start backend: cd server && npm run dev');
  console.log('2. Start frontend: cd client && npm run dev');
  console.log('');
}

// Mobile testing instructions
console.log('📱 Mobile Testing Instructions:');
console.log('');
console.log('1. 📱 On your mobile device:');
console.log(`   - Open browser and go to: http://${localIP}:${frontendPort}`);
console.log('   - Or scan QR code below (if you have qrcode-terminal installed)');
console.log('');
console.log('2. 🔧 For PWA testing:');
console.log('   - Add to home screen on iOS/Android');
console.log('   - Test offline functionality');
console.log('');
console.log('3. 🧪 Test scenarios:');
console.log('   - Touch interactions (taps, swipes, long press)');
console.log('   - Form inputs and keyboard behavior');
console.log('   - Navigation and transitions');
console.log('   - Responsive design on different orientations');
console.log('   - Performance and loading times');
console.log('   - Accessibility features');
console.log('');

// Device testing checklist
console.log('📋 Device Testing Checklist:');
console.log('□ iPhone SE (375px)');
console.log('□ iPhone 14/15 (390px)');
console.log('□ iPhone Plus/Max (428px)');
console.log('□ iPad Mini (768px)');
console.log('□ iPad Pro (1024px)');
console.log('□ Android devices (various sizes)');
console.log('');

// Browser testing
console.log('🌐 Browser Testing:');
console.log('□ Safari (iOS)');
console.log('□ Chrome (Android)');
console.log('□ Firefox Mobile');
console.log('□ Edge Mobile');
console.log('');

// Feature testing
console.log('✨ Feature Testing:');
console.log('□ Pull-to-refresh');
console.log('□ Touch gestures');
console.log('□ Haptic feedback (if available)');
console.log('□ Keyboard interactions');
console.log('□ Screen reader support');
console.log('□ Dark mode toggle');
console.log('□ Font size scaling');
console.log('□ Reduced motion support');
console.log('');

// Performance testing
console.log('⚡ Performance Testing:');
console.log('□ First load time');
console.log('□ Navigation speed');
console.log('□ Animation smoothness');
console.log('□ Memory usage');
console.log('□ Battery consumption');
console.log('');

// Generate QR code if possible
try {
  const qrcode = await import('qrcode-terminal');
  console.log('📱 QR Code for mobile testing:');
  qrcode.default.generate(`http://${localIP}:${frontendPort}`, { small: true });
} catch (error) {
  console.log('💡 Install qrcode-terminal for QR code generation:');
  console.log('   npm install -g qrcode-terminal');
  console.log('');
}

// Network troubleshooting
console.log('🔧 Network Troubleshooting:');
console.log('If you can\'t access the app from mobile:');
console.log('1. Check firewall settings');
console.log('2. Ensure both devices are on same network');
console.log('3. Try using ngrok for external access:');
console.log(`   npx ngrok http ${frontendPort}`);
console.log('');

// Development tips
console.log('💡 Development Tips:');
console.log('• Use Chrome DevTools device simulation');
console.log('• Enable mobile debugging in Chrome');
console.log('• Test with different network conditions');
console.log('• Check Core Web Vitals in Lighthouse');
console.log('• Use React DevTools for mobile debugging');
console.log('');

console.log('🎉 Happy testing!'); 