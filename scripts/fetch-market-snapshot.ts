import fs from 'node:fs';
import path from 'node:path';
import { DhanApiClient } from '../src/services/dhan/client';
import { generateMarketSnapshot } from '../src/services/dhan/snapshotEngine';

async function main() {
  const clientId = process.env.DHAN_CLIENT_ID?.trim();
  const accessToken = process.env.DHAN_ACCESS_TOKEN?.trim();

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
