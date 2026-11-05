import { execSync } from 'node:child_process';
import path from 'node:path';

function run(cmd: string): string {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).trim();
}

async function syncAndPush() {
  console.log('🔄 [Market Sync] Starting market snapshot fetch...');
  
  // 1. Run snapshot fetch script
  const fetchScript = path.resolve(process.cwd(), 'scripts/fetch-market-snapshot.ts');
  execSync(`npx tsx "${fetchScript}"`, { stdio: 'inherit' });

  // 2. Check git diff for public/data/
  const status = run('git status --porcelain public/data/');
  if (!status) {
    console.log('ℹ️ [Market Sync] No data changes detected in public/data/. Already up to date.');
    return;
  }

  console.log('📦 [Market Sync] Data updated. Staging public/data/ (secrets strictly excluded)...');
  run('git add public/data/');

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const commitMsg = `data: update market snapshot ${timestamp} [skip ci]`;
  console.log(`📝 [Market Sync] Committing: "${commitMsg}"...`);
  run(`git commit -m "${commitMsg}"`);

  console.log('🚀 [Market Sync] Pushing updated snapshot to GitHub origin/main...');
  try {
    run('git push origin main');
  } catch {
    console.log('🔄 Remote has updates. Pulling before re-trying push...');
    run('git pull --no-rebase origin main');
    run('git push origin main');
  }

  console.log('✅ [Market Sync] Successfully pushed! GitHub Pages will update with live data within ~60 seconds.');
  console.log('🌐 Web App URL: https://krishnacvukkala.github.io/dhan-gex-scanner/');
}

syncAndPush().catch((err) => {
  console.error('❌ [Market Sync] Error during sync and push:', err.message || err);
  process.exit(1);
});
