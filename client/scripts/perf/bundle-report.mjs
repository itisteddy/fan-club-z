#!/usr/bin/env node

/**
 * [PERF] Bundle Analysis Report Generator
 * 
 * Generates comprehensive bundle analysis reports using rollup-plugin-visualizer
 * and source-map-explorer (when sourcemaps are available).
 * 
 * Usage:
 *   pnpm perf:bundle
 * 
 * Outputs:
 *   - dist/stats.html (treemap visualization)
 *   - Console output with bundle sizes
 */

import { execSync } from 'child_process';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, '../../dist');
const assetsPath = join(distPath, 'assets');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileSizes(dir, ext = '.js') {
  const files = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isFile() && extname(entry) === ext) {
        files.push({
          name: entry,
          size: stat.size,
          path: fullPath,
        });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return files.sort((a, b) => b.size - a.size);
}

function printSection(title) {
  console.log('\n' + colors.cyan + colors.bright + '═'.repeat(60) + colors.reset);
  console.log(colors.cyan + colors.bright + ` ${title}` + colors.reset);
  console.log(colors.cyan + colors.bright + '═'.repeat(60) + colors.reset);
}

function printBundleReport() {
  printSection('📦 BUNDLE SIZE REPORT');
  
  // Get JS files
  const jsFiles = getFileSizes(assetsPath, '.js');
  const cssFiles = getFileSizes(assetsPath, '.css');
  
  if (jsFiles.length === 0) {
    console.log(colors.yellow + '\n⚠️  No JS files found in dist/assets/' + colors.reset);
    console.log('   Run "pnpm build" first to generate the bundle.');
    return;
  }
  
  // Calculate totals
  const totalJS = jsFiles.reduce((sum, f) => sum + f.size, 0);
  const totalCSS = cssFiles.reduce((sum, f) => sum + f.size, 0);
  
  // Print JS bundles
  console.log('\n' + colors.bright + 'JavaScript Bundles:' + colors.reset);
  console.log('─'.repeat(55));
  
  for (const file of jsFiles) {
    const sizeStr = formatBytes(file.size).padStart(10);
    const isLarge = file.size > 200 * 1024; // 200KB threshold
    const color = isLarge ? colors.yellow : colors.green;
    const indicator = isLarge ? '⚠️ ' : '✓ ';
    console.log(`${indicator}${color}${sizeStr}${colors.reset}  ${file.name}`);
  }
  
  console.log('─'.repeat(55));
  console.log(colors.bright + `   Total JS: ${formatBytes(totalJS)}` + colors.reset);
  
  // Print CSS bundles
  if (cssFiles.length > 0) {
    console.log('\n' + colors.bright + 'CSS Bundles:' + colors.reset);
    console.log('─'.repeat(55));
    
    for (const file of cssFiles) {
      const sizeStr = formatBytes(file.size).padStart(10);
      console.log(`✓ ${colors.green}${sizeStr}${colors.reset}  ${file.name}`);
    }
    
    console.log('─'.repeat(55));
    console.log(colors.bright + `  Total CSS: ${formatBytes(totalCSS)}` + colors.reset);
  }
  
  // Print grand total
  console.log('\n' + colors.bright + colors.cyan + `📊 TOTAL BUNDLE SIZE: ${formatBytes(totalJS + totalCSS)}` + colors.reset);
  
  // Identify chunks
  printSection('📁 CHUNK BREAKDOWN');
  
  const vendorChunks = jsFiles.filter(f => f.name.includes('vendor'));
  const wagmiChunks = jsFiles.filter(f => f.name.includes('wagmi'));
  const uiChunks = jsFiles.filter(f => f.name.includes('ui'));
  const mainChunk = jsFiles.find(f => f.name.startsWith('index'));
  
  if (vendorChunks.length > 0) {
    const vendorTotal = vendorChunks.reduce((s, f) => s + f.size, 0);
    console.log(`\n${colors.bright}Vendor (react/react-dom):${colors.reset} ${formatBytes(vendorTotal)}`);
  }
  
  if (wagmiChunks.length > 0) {
    const wagmiTotal = wagmiChunks.reduce((s, f) => s + f.size, 0);
    console.log(`${colors.bright}Wagmi (wagmi/viem):${colors.reset} ${formatBytes(wagmiTotal)}`);
  }
  
  if (uiChunks.length > 0) {
    const uiTotal = uiChunks.reduce((s, f) => s + f.size, 0);
    console.log(`${colors.bright}UI (radix/framer-motion):${colors.reset} ${formatBytes(uiTotal)}`);
  }
  
  if (mainChunk) {
    console.log(`${colors.bright}Main App Bundle:${colors.reset} ${formatBytes(mainChunk.size)}`);
  }
  
  // Performance recommendations
  printSection('💡 RECOMMENDATIONS');
  
  const recommendations = [];
  
  if (totalJS > 500 * 1024) {
    recommendations.push('⚠️  Total JS exceeds 500KB. Consider code splitting or lazy loading.');
  }
  
  const largeChunks = jsFiles.filter(f => f.size > 200 * 1024);
  if (largeChunks.length > 0) {
    recommendations.push(`⚠️  ${largeChunks.length} chunk(s) exceed 200KB. Consider splitting further.`);
  }
  
  if (recommendations.length === 0) {
    console.log(colors.green + '\n✅ Bundle sizes look good!' + colors.reset);
  } else {
    recommendations.forEach(r => console.log('\n' + colors.yellow + r + colors.reset));
  }
  
  // Check for visualizer output
  const statsPath = join(distPath, 'stats.html');
  if (existsSync(statsPath)) {
    console.log('\n' + colors.cyan + `📈 Visual report available: ${statsPath}` + colors.reset);
  }
}

// Run the report
console.log(colors.bright + '\n🔍 Analyzing bundle...\n' + colors.reset);
printBundleReport();
console.log('\n');
