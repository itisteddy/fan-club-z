#!/usr/bin/env node
import { globby } from 'globby';
import path from 'node:path';

const families = [
  { name: 'Discover', patterns: ['**/Discover*.tsx'] },
  { name: 'PredictionDetails', patterns: ['**/PredictionDetails*.tsx'] },
  { name: 'MyBets', patterns: ['**/{PredictionsPage,MyBets}*.tsx'] },
  { name: 'Wallet', patterns: ['**/Wallet*.tsx'] },
  { name: 'Profile', patterns: ['**/Profile*.tsx'] },
  { name: 'Leaderboard', patterns: ['**/Leader*Page*.tsx'] },
  { name: 'AuthGate', patterns: ['**/AuthGate*.*'] },
  { name: 'Icons', patterns: ['**/icons/**', '**/Icons/**'] },
];

const root = process.cwd();
let hasDupes = false;

for (const fam of families) {
  const files = (await Promise.all(fam.patterns.map(p => globby(p, { gitignore: true }))))
    .flat()
    .filter(f => !f.includes('node_modules'))
    .map(f => path.posix.normalize(f));

  // Group by baseName (case-insensitive)
  const groups = files.reduce((acc, f) => {
    const base = path.basename(f).toLowerCase();
    acc[base] ||= [];
    acc[base].push(f);
    return acc;
  }, {});

  for (const [base, list] of Object.entries(groups)) {
    if (list.length > 1) {
      hasDupes = true;
      console.error(`[DUPLICATE][${fam.name}] ${base}\n - ${list.join('\n - ')}\n`);
    }
  }
}

if (hasDupes) {
  console.error('❌ Duplicate/conflicting files detected. Consolidate before merging.');
  process.exit(1);
} else {
  console.log('✅ No duplicates detected.');
}
