import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

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

function getISTDate(now = new Date()): Date {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

function isIndianMarketOpen(now = new Date()): boolean {
  const ist = getISTDate(now);
  const day = ist.getDay(); // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return false;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  // Market window: 09:15 IST (555 mins) to 15:30 IST (930 mins)
  return totalMinutes >= 555 && totalMinutes <= 930;
}

const INTERVAL_MINUTES = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

async function runSync() {
  const ist = getISTDate();
  const timeStr = ist.toLocaleTimeString('en-IN', { hour12: false });
  console.log(`\n⏰ [Daemon ${timeStr} IST] Checking market state...`);

  const force = process.env.FORCE_SYNC === 'true';
  if (!isIndianMarketOpen() && !force) {
    console.log('🌙 Indian markets are currently CLOSED (Open Mon-Fri 09:15 - 15:30 IST).');
    console.log(`💤 Daemon sleeping for ${INTERVAL_MINUTES} minutes until next check. (Set FORCE_SYNC=true to override)`);
    return;
  }

  if (force && !isIndianMarketOpen()) {
    console.log('⚡ FORCE_SYNC is active: proceeding with sync outside regular market hours...');
  } else {
    console.log('📈 Market is OPEN! Triggering live snapshot sync and push...');
  }

  try {
    const syncScript = path.resolve(process.cwd(), 'scripts/sync-and-push.ts');
    execSync(`npx tsx "${syncScript}"`, { stdio: 'inherit' });
  } catch (err: unknown) {
    console.error('⚠️ [Daemon] Sync iteration encountered an error:', (err as Error)?.message || err);
  }
}

console.log('🚀 [Dhan GEX Daemon] Started automated local market sync runner.');
console.log(`⏱️ Sync interval configured to: ${INTERVAL_MINUTES} minutes.`);
console.log('🔒 Zero secrets will ever be pushed; only computed public/data/ is synced.');
console.log('Press Ctrl+C to stop.\n');

// Initial run
runSync();

// Scheduled loop
setInterval(runSync, INTERVAL_MS);
