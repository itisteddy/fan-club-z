#!/usr/bin/env tsx
/**
 * Preflight environment validation script
 * Validates all required environment variables and exits non-zero with readable table if missing
 */

interface EnvGroup {
  name: string;
  required: string[];
  optional?: string[];
  description?: string;
}

const SERVER_ENV_GROUPS: EnvGroup[] = [
  {
    name: 'Payments & Blockchain',
    required: [
      'CHAIN_ID',
      'RPC_URL',
      'USDC_ADDRESS',
      'BASE_ESCROW_ADDRESS',
    ],
    optional: ['PAYMENTS_ENABLE', 'ENABLE_BASE_DEPOSITS'],
    description: 'Blockchain configuration for Base Sepolia'
  },
  {
    name: 'Supabase',
    required: [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
    ],
    description: 'Database and auth configuration'
  },
  {
    name: 'Server',
    required: [
      'PORT',
      'NODE_ENV',
    ],
    optional: ['CORS_ORIGIN', 'SESSION_SECRET'],
    description: 'Server runtime configuration'
  }
];

const CLIENT_ENV_GROUPS: EnvGroup[] = [
  {
    name: 'Blockchain (Client)',
    required: [
      'VITE_CHAIN_ID',
      'VITE_RPC_URL',
      'VITE_USDC_ADDRESS',
      'VITE_BASE_ESCROW_ADDRESS',
    ],
    description: 'Client-side blockchain configuration'
  },
  {
    name: 'WalletConnect',
    required: [
      'VITE_WC_PROJECT_ID',
    ],
    description: 'WalletConnect project ID for wallet connections'
  },
  {
    name: 'API',
    required: [
      'VITE_API_URL',
    ],
    optional: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    description: 'API endpoint configuration'
  }
];

function checkEnv(group: EnvGroup, env: Record<string, string | undefined>): { missing: string[]; present: string[] } {
  const missing: string[] = [];
  const present: string[] = [];

  for (const key of group.required) {
    if (!env[key] || env[key]?.trim() === '') {
      missing.push(key);
    } else {
      present.push(key);
    }
  }

  return { missing, present };
}

function formatTable(rows: Array<{ group: string; missing: string[]; present: string[]; description?: string }>): string {
  const lines: string[] = [];
  lines.push('┌─────────────────────────────────────────────────────────────────┐');
  lines.push('│ Environment Variable Validation                                 │');
  lines.push('├─────────────────────────────────────────────────────────────────┤');

  for (const row of rows) {
    if (row.missing.length > 0) {
      lines.push(`│ ❌ ${row.group.padEnd(55)} │`);
      if (row.description) {
        lines.push(`│    ${row.description.padEnd(53)} │`);
      }
      for (const key of row.missing) {
        lines.push(`│    Missing: ${key.padEnd(45)} │`);
      }
    } else {
      lines.push(`│ ✅ ${row.group.padEnd(55)} │`);
      if (row.description) {
        lines.push(`│    ${row.description.padEnd(53)} │`);
      }
      lines.push(`│    All required variables present (${row.present.length})${' '.repeat(35 - String(row.present.length).length)} │`);
    }
    lines.push('├─────────────────────────────────────────────────────────────────┤');
  }

  lines.push('└─────────────────────────────────────────────────────────────────┘');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const checkClient = args.includes('--client') || args.includes('--all');
  const checkServer = args.includes('--server') || args.includes('--all') || args.length === 0;

  const serverEnv = process.env;
  const clientEnv = process.env; // In monorepo, both read from same env

  const results: Array<{ group: string; missing: string[]; present: string[]; description?: string }> = [];
  let totalMissing = 0;

  if (checkServer) {
    console.log('🔍 Checking server environment variables...\n');
    for (const group of SERVER_ENV_GROUPS) {
      const { missing, present } = checkEnv(group, serverEnv);
      results.push({
        group: group.name,
        missing,
        present,
        description: group.description
      });
      totalMissing += missing.length;
    }
  }

  if (checkClient) {
    console.log('🔍 Checking client environment variables...\n');
    for (const group of CLIENT_ENV_GROUPS) {
      const { missing, present } = checkEnv(group, clientEnv);
      results.push({
        group: `[CLIENT] ${group.name}`,
        missing,
        present,
        description: group.description
      });
      totalMissing += missing.length;
    }
  }

  console.log(formatTable(results));

  if (totalMissing > 0) {
    console.log(`\n❌ Validation failed: ${totalMissing} required environment variable(s) missing\n`);
    console.log('💡 Tip: Create .env files in server/ and client/ directories');
    console.log('   See .env.example files for required variables\n');
    process.exit(1);
  } else {
    console.log('\n✅ All required environment variables are present\n');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { checkEnv, SERVER_ENV_GROUPS, CLIENT_ENV_GROUPS };

