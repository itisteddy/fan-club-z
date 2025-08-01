#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Checking for build errors...\n');

// Change to client directory and run type check
process.chdir(path.join(__dirname, 'client'));

const typeCheck = spawn('npm', ['run', 'type-check'], {
  stdio: 'inherit',
  shell: true
});

typeCheck.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ No TypeScript errors found!');
    console.log('\n🔧 If changes still aren\'t rendering, try:');
    console.log('1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('2. Clear browser cache');
    console.log('3. Restart dev server: npm run dev');
    console.log('4. Check browser console for errors');
  } else {
    console.log('\n❌ TypeScript errors found - this might prevent hot reloading');
  }
});

typeCheck.on('error', (err) => {
  console.error('Error running type check:', err.message);
});
