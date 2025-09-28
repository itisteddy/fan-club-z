#!/usr/bin/env node

/**
 * Production Freeze Enforcer
 * Blocks PRs that modify disallowed paths during deployment freeze
 * 
 * Usage: node scripts/enforce-freeze.mjs
 * Exit codes: 0 = freeze respected, 1 = freeze violation detected
 */

import { execSync } from "node:child_process";

// ALLOWED FILES DURING PRODUCTION FREEZE
const allowed = [
  ".vercel/",
  "vercel.json", 
  "render.yaml",
  "netlify.toml",
  "Dockerfile",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  "src/config/env.schema.ts",
  "src/config/env.ts", 
  "public/_headers",
  "public/_redirects",
  "README.md",
  "docs/",
  "scripts/check-duplicates.mjs",
  "scripts/enforce-freeze.mjs",
];

// FORBIDDEN - DO NOT MODIFY DURING FREEZE
const criticalPaths = [
  "src/pages/",
  "src/components/", 
  "src/stores/",
  "src/auth/",
  "src/features/",
  "src/icons/",
  "src/providers/",
  "package.json",  // No dependency changes
  "tsconfig.json", // No compiler changes
];

console.log("🔒 Production Freeze: Checking file modifications...");

let diff;
try {
  diff = execSync("git diff --name-only origin/main...HEAD", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
} catch (error) {
  console.warn("⚠️  Could not get git diff (might be initial commit). Proceeding with caution.");
  process.exit(0);
}

if (diff.length === 0) {
  console.log("✅ No files changed. Freeze respected.");
  process.exit(0);
}

console.log(`📁 Files changed: ${diff.length}`);

const isAllowed = (file) => allowed.some((allowedPath) =>
  allowedPath.endsWith("/") ? file.startsWith(allowedPath) : file === allowedPath
);

const isCritical = (file) => criticalPaths.some((criticalPath) =>
  criticalPath.endsWith("/") ? file.startsWith(criticalPath) : file === criticalPath
);

const violations = diff.filter((file) => !isAllowed(file));
const criticalViolations = violations.filter((file) => isCritical(file));

if (violations.length === 0) {
  console.log("✅ Freeze respected. Only deployment files were changed:");
  diff.forEach((file) => console.log(`  ✓ ${file}`));
  process.exit(0);
}

console.error("❌ PRODUCTION FREEZE VIOLATION DETECTED");
console.error("");
console.error("🚫 Disallowed file changes:");
violations.forEach((file) => {
  const marker = criticalViolations.includes(file) ? "💀 CRITICAL:" : "❌";
  console.error(`  ${marker} ${file}`);
});

console.error("");
console.error("📋 ALLOWED files during freeze:");
allowed.forEach((path) => console.error(`  ✓ ${path}`));

console.error("");
console.error("🛑 To proceed:");
console.error("  1. Revert changes to disallowed files");
console.error("  2. Or request approval to modify specific paths");
console.error("  3. Only deployment configuration changes are permitted");

process.exit(1);
