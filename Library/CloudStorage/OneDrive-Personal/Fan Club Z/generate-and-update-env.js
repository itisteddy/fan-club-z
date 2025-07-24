// Auto-generate secure secrets and update .env.production
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

console.log('🔐 Generating secure JWT secrets...');

const jwtSecret = randomBytes(64).toString('hex');
const jwtRefreshSecret = randomBytes(64).toString('hex');

console.log('✅ Generated secure secrets!');

// Read the current .env.production file
let envContent = readFileSync('.env.production', 'utf8');

// Replace the placeholder secrets
envContent = envContent.replace(
  'JWT_SECRET=your-super-secure-production-jwt-secret-min-32-chars',
  `JWT_SECRET=${jwtSecret}`
);

envContent = envContent.replace(
  'JWT_REFRESH_SECRET=your-super-secure-refresh-secret-min-32-chars', 
  `JWT_REFRESH_SECRET=${jwtRefreshSecret}`
);

// Write back to file
writeFileSync('.env.production', envContent);

console.log('✅ Updated .env.production with secure secrets!');
console.log('🔐 Your JWT secrets are now configured for production.');
