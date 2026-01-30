#!/usr/bin/env tsx
/**
 * Check Vercel deployments and trigger redeploys if needed
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
if (!VERCEL_TOKEN) {
  console.error('❌ VERCEL_TOKEN required');
  process.exit(1);
}

const VERCEL_API_BASE = 'https://api.vercel.com';

async function apiRequest<T>(method: string, path: string, body?: any): Promise<T> {
  const res = await fetch(`${VERCEL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API ${method} ${path}: ${res.status} ${error}`);
  }
  return res.json();
}

async function main() {
  console.log('🔍 Checking Vercel deployments...\n');

  const projects = await apiRequest<{ projects: Array<{ id: string; name: string }> }>(
    'GET',
    '/v9/projects'
  );

  const landingProject = projects.projects.find((p) => p.name === 'landing-page');
  const appProject = projects.projects.find((p) => p.name === 'fan-club-z');

  if (!landingProject || !appProject) {
    throw new Error('Projects not found');
  }

  console.log(`✅ Found projects:`);
  console.log(`   - landing-page: ${landingProject.id}`);
  console.log(`   - fan-club-z: ${appProject.id}\n`);

  // Get latest deployments
  const landingDeploys = await apiRequest<{ deployments: Array<{ uid: string; createdAt: number; target: string | null; url: string }> }>(
    'GET',
    `/v6/deployments?projectId=${landingProject.id}&target=production&limit=1`
  );

  const appDeploys = await apiRequest<{ deployments: Array<{ uid: string; createdAt: number; target: string | null; url: string }> }>(
    'GET',
    `/v6/deployments?projectId=${appProject.id}&target=production&limit=1`
  );

  console.log('📋 Latest Production Deployments:');
  if (landingDeploys.deployments[0]) {
    const d = landingDeploys.deployments[0];
    const age = Math.floor((Date.now() - d.createdAt) / 1000 / 60);
    console.log(`   - landing-page: ${d.uid} (${age}m ago) ${d.url}`);
  }
  if (appDeploys.deployments[0]) {
    const d = appDeploys.deployments[0];
    const age = Math.floor((Date.now() - d.createdAt) / 1000 / 60);
    console.log(`   - fan-club-z: ${d.uid} (${age}m ago) ${d.url}`);
  }

  console.log('\n💡 Vercel auto-deploys on git push to main.');
  console.log('   If deployments are old, push a new commit or manually redeploy via dashboard.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
