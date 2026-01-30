#!/usr/bin/env tsx
/**
 * Fix Vercel domain mappings and trigger redeploys
 * 
 * Usage:
 *   VERCEL_TOKEN=your_token tsx scripts/fix-vercel-domains.ts
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
if (!VERCEL_TOKEN) {
  console.error('❌ VERCEL_TOKEN environment variable is required');
  console.error('   Get it from: https://vercel.com/account/tokens');
  process.exit(1);
}

const VERCEL_API_BASE = 'https://api.vercel.com';

interface VercelProject {
  id: string;
  name: string;
  accountId: string;
}

interface VercelDomain {
  name: string;
  projectId: string;
  verified: boolean;
}

interface VercelDeployment {
  uid: string;
  url: string;
  state: string;
  createdAt: number;
  target: string | null;
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: any
): Promise<T> {
  const url = `${VERCEL_API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vercel API ${method} ${path}: ${res.status} ${error}`);
  }

  return res.json();
}

async function listProjects(): Promise<VercelProject[]> {
  const data = await apiRequest<{ projects: VercelProject[] }>(
    'GET',
    '/v9/projects'
  );
  return data.projects;
}

async function getProjectDomains(projectId: string): Promise<VercelDomain[]> {
  const data = await apiRequest<{ domains: VercelDomain[] }>(
    'GET',
    `/v9/projects/${projectId}/domains`
  );
  return data.domains;
}

async function addDomain(projectId: string, domain: string): Promise<void> {
  await apiRequest('POST', `/v10/projects/${projectId}/domains`, { name: domain });
  console.log(`  ✅ Added domain: ${domain}`);
}

async function removeDomain(projectId: string, domain: string): Promise<void> {
  await apiRequest('DELETE', `/v9/projects/${projectId}/domains/${domain}`);
  console.log(`  ✅ Removed domain: ${domain}`);
}

async function getLatestDeployment(
  projectId: string,
  target: 'production' | 'preview' = 'production'
): Promise<VercelDeployment | null> {
  const data = await apiRequest<{ deployments: VercelDeployment[] }>(
    'GET',
    `/v6/deployments?projectId=${projectId}&target=${target}&limit=1`
  );
  return data.deployments[0] || null;
}

async function createDeployment(
  projectId: string,
  target: 'production' | 'preview' = 'production'
): Promise<VercelDeployment> {
  // Get latest deployment to reuse its config
  const latest = await getLatestDeployment(projectId, target);
  if (!latest) {
    throw new Error(`No existing deployment found for project ${projectId}`);
  }

  // Trigger redeploy by creating a new deployment from the same source
  // Vercel API v13 requires full deployment config, but we can trigger via v6
  const data = await apiRequest<{ deployment: VercelDeployment }>(
    'POST',
    `/v13/deployments`,
    {
      name: projectId,
      project: projectId,
      target,
      gitSource: {
        type: 'github',
        repo: 'itisteddy/fan-club-z',
        ref: 'main',
        sha: latest.uid, // Use latest deployment's commit
      },
    }
  );

  return data.deployment;
}

async function main() {
  console.log('🔍 Fetching Vercel projects...\n');

  const projects = await listProjects();
  const landingProject = projects.find((p) => p.name === 'landing-page');
  const appProject = projects.find((p) => p.name === 'fan-club-z');

  if (!landingProject) {
    throw new Error('❌ landing-page project not found');
  }
  if (!appProject) {
    throw new Error('❌ fan-club-z project not found');
  }

  console.log(`✅ Found landing-page: ${landingProject.id}`);
  console.log(`✅ Found fan-club-z: ${appProject.id}\n`);

  // Get current domain mappings
  console.log('🔍 Checking domain mappings...\n');
  const landingDomains = await getProjectDomains(landingProject.id);
  const appDomains = await getProjectDomains(appProject.id);

  console.log(`📋 landing-page domains: ${landingDomains.map((d) => d.name).join(', ') || '(none)'}`);
  console.log(`📋 fan-club-z domains: ${appDomains.map((d) => d.name).join(', ') || '(none)'}\n`);

  // Fix domain mappings
  const targetLandingDomains = ['fanclubz.app', 'www.fanclubz.app'];
  const targetAppDomains = ['app.fanclubz.app', 'web.fanclubz.app'];

  console.log('🔧 Fixing domain mappings...\n');

  // Remove wrong domains from landing-page
  for (const domain of landingDomains) {
    if (!targetLandingDomains.includes(domain.name)) {
      console.log(`  Removing ${domain.name} from landing-page...`);
      await removeDomain(landingProject.id, domain.name);
    }
  }

  // Add missing domains to landing-page
  for (const domain of targetLandingDomains) {
    if (!landingDomains.find((d) => d.name === domain)) {
      console.log(`  Adding ${domain} to landing-page...`);
      await addDomain(landingProject.id, domain);
    }
  }

  // Remove wrong domains from app project
  for (const domain of appDomains) {
    if (!targetAppDomains.includes(domain.name)) {
      console.log(`  Removing ${domain.name} from fan-club-z...`);
      await removeDomain(appProject.id, domain.name);
    }
  }

  // Add missing domains to app project
  for (const domain of targetAppDomains) {
    if (!appDomains.find((d) => d.name === domain)) {
      console.log(`  Adding ${domain} to fan-club-z...`);
      await addDomain(appProject.id, domain);
    }
  }

  console.log('\n✅ Domain mappings fixed!\n');

  console.log('✅ All done!');
  console.log('\n📝 Summary:');
  console.log(`  - landing-page: ${targetLandingDomains.join(', ')}`);
  console.log(`  - fan-club-z: ${targetAppDomains.join(', ')}`);
  console.log(`\n💡 Note: Vercel will auto-deploy on next git push to main.`);
  console.log(`   Or manually redeploy via Vercel dashboard if needed.`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
