const { execSync } = require('child_process');

try {
  console.log('🧪 Running bet cards validation...\n');
  const output = execSync('node validate-bet-cards.js', { 
    encoding: 'utf8',
    cwd: '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client'
  });
  console.log(output);
} catch (error) {
  console.error('❌ Validation failed:', error.message);
}