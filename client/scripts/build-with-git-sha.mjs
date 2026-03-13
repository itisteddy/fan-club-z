#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { spawn } from 'node:child_process';

function resolveGitSha() {
  if (process.env.VITE_GIT_SHA && process.env.VITE_GIT_SHA.trim()) {
    return process.env.VITE_GIT_SHA.trim();
  }
  if (process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.trim()) {
    return process.env.VERCEL_GIT_COMMIT_SHA.trim();
  }
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const gitSha = resolveGitSha();
const env = {
  ...process.env,
  VITE_GIT_SHA: gitSha,
};

console.log(`[build-with-git-sha] VITE_GIT_SHA=${gitSha}`);

const child = spawn('vite', ['build'], {
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
