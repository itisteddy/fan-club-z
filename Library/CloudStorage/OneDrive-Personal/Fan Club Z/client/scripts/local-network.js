#!/usr/bin/env node

import os from 'os';

console.log('🌐 Fan Club Z - Local Network Access\n');

// Get all network interfaces
function getAllNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        results.push({
          name: name,
          address: iface.address,
          type: name.toLowerCase().includes('wifi') || name.toLowerCase().includes('wlan') ? 'WiFi' : 'Ethernet'
        });
      }
    }
  }
  
  return results;
}

const networkInterfaces = getAllNetworkInterfaces();
const frontendPort = 3000;
const backendPort = 5001;

console.log('📱 Available Network Addresses:');
console.log('');

if (networkInterfaces.length === 0) {
  console.log('❌ No network interfaces found');
  console.log('');
  console.log('Troubleshooting:');
  console.log('1. Make sure you\'re connected to WiFi');
  console.log('2. Check your network settings');
  console.log('3. Try restarting your network connection');
} else {
  networkInterfaces.forEach((iface, index) => {
    console.log(`${index + 1}. ${iface.type} (${iface.name}):`);
    console.log(`   Frontend: http://${iface.address}:${frontendPort}`);
    console.log(`   Backend:  http://${iface.address}:${backendPort}`);
    console.log('');
  });
}

console.log('📱 Mobile Testing Instructions:');
console.log('');
console.log('1. Make sure your mobile device is on the SAME WiFi network');
console.log('2. On your mobile device, open a browser');
console.log('3. Enter one of the Frontend URLs above');
console.log('4. If one doesn\'t work, try the next one');
console.log('');

console.log('🔧 If you can\'t connect:');
console.log('');
console.log('• Check firewall settings on your computer');
console.log('• Make sure both devices are on the same network');
console.log('• Try disabling any VPN connections');
console.log('• On macOS: System Preferences > Security & Privacy > Firewall');
console.log('• On Windows: Windows Defender Firewall settings');
console.log('');

console.log('💡 Alternative solutions:');
console.log('');
console.log('• Use Chrome DevTools device simulation for initial testing');
console.log('• Connect your phone via USB and use Chrome remote debugging');
console.log('• Set up ngrok with a free account: https://dashboard.ngrok.com/signup');
console.log('');

// Check if we can detect the current primary interface
const primaryInterface = networkInterfaces.find(iface => 
  iface.type === 'WiFi' || iface.name.toLowerCase().includes('wlan')
) || networkInterfaces[0];

if (primaryInterface) {
  console.log('🎯 Recommended URL for mobile testing:');
  console.log(`   http://${primaryInterface.address}:${frontendPort}`);
  console.log('');
} 