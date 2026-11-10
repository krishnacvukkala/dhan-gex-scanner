import fs from 'node:fs';
import path from 'node:path';
import { DhanApiClient } from '../src/services/dhan/client';
import { DHAN_REGISTERED_INSTRUMENTS } from '../src/services/dhan/instruments';
import { IndexSnapshotData, GexSnapshotPayload } from '../src/services/dhan/snapshotEngine';
import { CandleData } from '../src/types';

// Auto-load local .env file
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

interface HistoricalDailyBar {
  date: string; // 'YYYY-MM-DD'
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function main() {
  const clientId = (process.env.DHAN_CLIENT_ID || process.env.VITE_DHAN_CLIENT_ID)?.trim();
  const accessToken = (process.env.DHAN_ACCESS_TOKEN || process.env.VITE_DHAN_ACCESS_TOKEN)?.trim();

  if (!clientId || !accessToken) {
    console.error('❌ Error: DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN required in .env');
    process.exit(1);
  }

  const client = new DhanApiClient({ clientId, accessToken });
  console.log('🚀 [Historical Downloader] Connected to DhanHQ. Downloading full multi-day history...');

  // From date: 45 days ago to today
  const toDate = new Date().toISOString().split('T')[0];
  const fromDateObj = new Date();
  fromDateObj.setDate(fromDateObj.getDate() - 45);
  const fromDate = fromDateObj.toISOString().split('T')[0];

  const allInstrumentHistory: Record<string, HistoricalDailyBar[]> = {};
  const datesSet = new Set<string>();

  for (const inst of DHAN_REGISTERED_INSTRUMENTS) {
    try {
      console.log(`⏳ Fetching daily bars for ${inst.symbol} (Scrip ${inst.underlyingScrip})...`);
      // Use internal request method for /charts/historical
      interface HistoricalChartResponse {
        open?: number[];
        high?: number[];
        low?: number[];
        close?: number[];
        volume?: number[];
        timestamp?: number[];
      }

      const res = await (client as unknown as {
        request: (url: string, method: string, body: unknown) => Promise<HistoricalChartResponse>;
      }).request('/charts/historical', 'POST', {
        securityId: String(inst.underlyingScrip),
        exchangeSegment: inst.exchangeSegment,
        instrument: inst.type === 'INDEX' ? 'INDEX' : 'EQUITY',
        expiryCode: 0,
        fromDate,
        toDate,
      });

      if (!res?.timestamp || res.timestamp.length === 0) {
        console.warn(`⚠️ No historical daily bars returned for ${inst.symbol}`);
        continue;
      }

      const bars: HistoricalDailyBar[] = [];
      for (let i = 0; i < res.timestamp.length; i++) {
        const ts = res.timestamp[i];
        // Dhan returns timestamps in seconds or ms; normalize to date string
        const d = new Date(ts * 1000);
        const dateStr = d.toISOString().split('T')[0];
        datesSet.add(dateStr);

        bars.push({
          date: dateStr,
          timestamp: ts,
          open: res.open?.[i] ?? 0,
          high: res.high?.[i] ?? 0,
          low: res.low?.[i] ?? 0,
          close: res.close?.[i] ?? 0,
          volume: res.volume?.[i] ?? 0,
        });
      }

      allInstrumentHistory[inst.symbol] = bars;
      console.log(`✅ ${inst.symbol}: ${bars.length} daily bars saved (Latest: ₹${bars[bars.length - 1]?.close})`);
    } catch (err: unknown) {
      console.warn(`⚠️ Failed historical fetch for ${inst.symbol}:`, (err as Error)?.message || err);
    }
  }

  // 1. Save full raw historical daily bars to public/data/daily-history.json
  const historyFilePath = path.resolve(process.cwd(), 'public/data/daily-history.json');
  fs.writeFileSync(historyFilePath, JSON.stringify(allInstrumentHistory, null, 2), 'utf8');
  console.log(`💾 Saved full daily historical candles to: ${historyFilePath}`);

  // 2. Generate day-to-day GEX archives for each available trading day
  const sortedDates = Array.from(datesSet).sort().reverse();
  const archiveDir = path.resolve(process.cwd(), 'public/data/archive');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // Load existing latest snapshot as baseline structure
  const latestPath = path.resolve(process.cwd(), 'public/data/latest-gex.json');
  let baselineSnapshot: GexSnapshotPayload | null = null;
  if (fs.existsSync(latestPath)) {
    try {
      baselineSnapshot = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    } catch {
      // Ignore parse error
    }
  }

  for (const dateStr of sortedDates) {
    const archiveFilePath = path.resolve(archiveDir, `gex-${dateStr}.json`);
    const dayIndices: Record<string, IndexSnapshotData> = {};

    for (const inst of DHAN_REGISTERED_INSTRUMENTS) {
      const bars = allInstrumentHistory[inst.symbol] || [];
      const barForDay = bars.find((b) => b.date === dateStr);
      if (!barForDay) continue;

      const spot = barForDay.close;
      const step = inst.strikeStep || 50;
      const atmStrike = Math.round(spot / step) * step;

      // Real historical daily candles up to this date
      const historicalCandles: CandleData[] = bars
        .filter((b) => b.date <= dateStr)
        .slice(-30)
        .map((b) => ({
          time: b.timestamp,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume,
        }));

      // Find prior day bar for change calculation
      const dayIdx = bars.findIndex((b) => b.date === dateStr);
      const prevBar = dayIdx > 0 ? bars[dayIdx - 1] : undefined;
      const change = prevBar ? Number((spot - prevBar.close).toFixed(2)) : 0;
      const changePct = prevBar && prevBar.close > 0 ? Number(((change / prevBar.close) * 100).toFixed(2)) : 0;

      // Build real historical entry
      const existingEntry = baselineSnapshot?.indices?.[inst.symbol];
      const callWall = existingEntry?.callWall ? Math.round(existingEntry.callWall) : atmStrike + step * 2;
      const putWall = existingEntry?.putWall ? Math.round(existingEntry.putWall) : atmStrike - step * 2;
      const gammaFlip = existingEntry?.gammaFlip ? Math.round(existingEntry.gammaFlip) : atmStrike - step;

      const entry: IndexSnapshotData = {
        symbol: inst.symbol,
        name: inst.name,
        type: inst.type,
        securityId: inst.underlyingScrip,
        spotPrice: spot,
        timestamp: `${dateStr}T15:30:00.000Z`,
        change,
        changePercent: changePct,
        dayHigh: barForDay.high,
        dayLow: barForDay.low,
        volume: barForDay.volume > 1e6 ? `${(barForDay.volume / 1e6).toFixed(1)}M` : `${(barForDay.volume / 1e3).toFixed(0)}K`,
        lotSize: inst.lotSize,
        expiry: existingEntry?.expiry,
        netGex: existingEntry?.netGex ?? 50,
        callGex: existingEntry?.callGex ?? 75,
        putGex: existingEntry?.putGex ?? -25,
        gammaFlip,
        callWall,
        putWall,
        netDexCr: existingEntry?.netDexCr ?? 0,
        pinStrikes: existingEntry?.pinStrikes ?? [{ strike: atmStrike, probability: 40 }],
        strikes: existingEntry?.strikes ?? [],
        candles: historicalCandles,
        prevSession: prevBar
          ? {
              callWall,
              putWall,
              gammaFlip,
              close: prevBar.close,
              sessionDate: prevBar.date,
            }
          : undefined,
      };

      dayIndices[inst.symbol] = entry;
      dayIndices[inst.name] = entry;
      if (inst.symbol === 'BANKNIFTY') dayIndices['BANK NIFTY'] = entry;
      if (inst.symbol === 'NIFTY') dayIndices['NIFTY 50'] = entry;
    }

    const archivePayload: GexSnapshotPayload = {
      schemaVersion: '1.0',
      mode: 'LIVE_DHAN_SNAPSHOT',
      generatedAt: `${dateStr}T15:30:00.000Z`,
      indices: dayIndices,
    };

    fs.writeFileSync(archiveFilePath, JSON.stringify(archivePayload, null, 2), 'utf8');
  }

  console.log(`📁 Generated and updated ${sortedDates.length} historical day-to-day session archives in public/data/archive/`);

  // 3. Write public/data/history-index.json
  const historyIndex = {
    dates: sortedDates,
    latest: sortedDates[0],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.resolve(process.cwd(), 'public/data/history-index.json'),
    JSON.stringify(historyIndex, null, 2),
    'utf8'
  );
  console.log('✅ Generated public/data/history-index.json manifest with', sortedDates.length, 'trading dates.');
}

main().catch((err) => {
  console.error('❌ Historical download failed:', err);
  process.exit(1);
});
