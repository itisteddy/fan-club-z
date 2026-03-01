import dotenv from 'dotenv';
import path from 'path';
import { runLegacyCryptoSnapshot } from '../services/legacyCryptoSnapshot';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

type Args = {
  snapshotVersion: string;
  adminKey: string;
};

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | null => {
    const pref = `--${name}=`;
    const hit = argv.find((a) => a.startsWith(pref));
    if (!hit) return null;
    return hit.slice(pref.length).trim();
  };

  const snapshotVersion = get('snapshot-version') || `zaurum-cutover-${new Date().toISOString()}`;
  const adminKey = get('admin-key') || '';
  return { snapshotVersion, adminKey };
}

async function run() {
  const { snapshotVersion, adminKey } = parseArgs(process.argv.slice(2));
  const expectedAdminKey = process.env.ADMIN_API_KEY || '';

  if (!expectedAdminKey || adminKey !== expectedAdminKey) {
    throw new Error('Unauthorized: valid --admin-key is required');
  }

  const result = await runLegacyCryptoSnapshot(snapshotVersion);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

run().catch((error) => {
  console.error('[snapshot-legacy-crypto] failed:', error);
  process.exit(1);
});
