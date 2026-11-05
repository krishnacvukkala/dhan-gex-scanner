import fs from 'node:fs';
import path from 'node:path';
import { DhanApiClient } from '../src/services/dhan/client';
import { generateMarketSnapshot } from '../src/services/dhan/snapshotEngine';

// Auto-load local .env file if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '').trim();
      if (!process.env[k]) {
        process.env[k] = val;
      }
    }
  }
}

async function main() {
  const clientId = (process.env.DHAN_CLIENT_ID || process.env.VITE_DHAN_CLIENT_ID)?.trim();
  const accessToken = (process.env.DHAN_ACCESS_TOKEN || process.env.VITE_DHAN_ACCESS_TOKEN)?.trim();

  let client: DhanApiClient | null = null;
  if (clientId && accessToken) {
    console.log(`[Snapshot] Authenticating with DhanHQ (Client ID: ${clientId.slice(0, 3)}***)...`);
    client = new DhanApiClient({ clientId, accessToken });
  } else {
    console.log('[Snapshot] No DhanHQ credentials supplied. Generating simulated baseline snapshot...');
  }

  const snapshot = await generateMarketSnapshot(client);

  const publicDataDir = path.resolve(process.cwd(), 'public/data');
  const archiveDir = path.resolve(publicDataDir, 'archive');

  fs.mkdirSync(archiveDir, { recursive: true });

  const latestPath = path.join(publicDataDir, 'latest-gex.json');
  fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`[Snapshot] Successfully written latest snapshot to: ${latestPath}`);

  const dateStr = new Date().toISOString().split('T')[0];
  const archivePath = path.join(archiveDir, `gex-${dateStr}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`[Snapshot] Successfully archived snapshot to: ${archivePath}`);
}

main().catch((err) => {
  console.error('[Snapshot] Failed to fetch market snapshot:', err);
  process.exit(1);
});
