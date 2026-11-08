import { DhanApiClient } from './client';
import { DHAN_REGISTERED_INSTRUMENTS, getInstrumentBySymbol } from './instruments';
import { MOCK_INSTRUMENTS } from '../../data/mockData';
import { calculateOptionChainGex } from '../gex/engine';
import { calculateDexAndHedgingFlow } from '../gex/dexEngine';
import { calculatePinProbabilities } from '../gex/pinProbabilityEngine';
import { StrikeGexDetail } from '../gex/types';

export interface IndexSnapshotData {
  symbol: string;
  name: string;
  type?: 'INDEX' | 'STOCK';
  securityId: number;
  spotPrice: number;
  timestamp: string;
  change?: number;
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: string;
  lotSize?: number;
  expiry?: string;
  netGex: number;
  callGex: number;
  putGex: number;
  gammaFlip: number;
  callWall: number;
  putWall: number;
  netDexCr: number;
  pinStrikes: { strike: number; probability: number }[];
  strikes: StrikeGexDetail[];
  candles?: import('../../types').CandleData[];
  prevSession?: {
    callWall: number;
    putWall: number;
    gammaFlip: number;
    close: number;
    sessionDate: string;
  };
}

export interface GexSnapshotPayload {
  schemaVersion: string;
  mode: 'LIVE_DHAN_SNAPSHOT' | 'SIMULATED_SNAPSHOT';
  generatedAt: string;
  indices: Record<string, IndexSnapshotData>;
}

export const ALL_DEFAULT_SNAPSHOT_SYMBOLS: string[] = [
  'NIFTY 50',
  'BANK NIFTY',
  'FINNIFTY',
  'MIDCPNIFTY',
  'SENSEX',
  'RELIANCE',
  'HDFCBANK',
  'SBIN',
  'TCS',
  'INFY',
  'ICICIBANK',
  'TATAMOTORS',
  'BHARTIARTL',
];

function matchesSymbolOrName(target: string, symbol: string, name: string): boolean {
  const normTarget = target.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const normSymbol = symbol.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const normName = name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return (
    normTarget === normSymbol ||
    normTarget === normName ||
    normName.includes(normTarget) ||
    normTarget.includes(normSymbol)
  );
}

export async function generateMarketSnapshot(
  client: DhanApiClient | null,
  indicesToFetch: string[] = ALL_DEFAULT_SNAPSHOT_SYMBOLS
): Promise<GexSnapshotPayload> {
  const generatedAt = new Date().toISOString();
  const indicesData: Record<string, IndexSnapshotData> = {};

  if (!client) {
    // Generate simulated snapshot fallback from MOCK_INSTRUMENTS
    for (const targetName of indicesToFetch) {
      const inst = MOCK_INSTRUMENTS.find((m) =>
        matchesSymbolOrName(targetName, m.symbol, m.name)
      );
      if (!inst) continue;

      const strikes = inst.strikes || [];
      const lotSize = inst.lotSize || 50;
      const dex = calculateDexAndHedgingFlow(strikes, inst.lastPrice, lotSize, inst.netGex * 1e7);
      const pinForecast = calculatePinProbabilities(strikes, inst.lastPrice, 0.05);

      const entry: IndexSnapshotData = {
        symbol: inst.symbol,
        name: inst.name,
        type: inst.type,
        securityId: inst.underlyingScrip || 13,
        spotPrice: inst.lastPrice,
        timestamp: generatedAt,
        change: inst.change,
        changePercent: inst.changePercent,
        dayHigh: inst.dayHigh,
        dayLow: inst.dayLow,
        volume: inst.volume,
        lotSize,
        expiry: inst.expiry,
        netGex: inst.netGex,
        callGex: inst.netGex > 0 ? inst.netGex * 1.5 : inst.netGex * 0.5,
        putGex: inst.netGex > 0 ? -inst.netGex * 0.5 : inst.netGex * 1.5,
        gammaFlip: inst.gammaFlip,
        callWall: inst.callWall,
        putWall: inst.putWall,
        netDexCr: dex.netDexCr,
        pinStrikes: pinForecast.strikes.slice(0, 5).map((p) => ({
          strike: p.strike,
          probability: Number((p.pinProbabilityPct ?? 0).toFixed(2)),
        })),
        strikes,
        candles: inst.candles,
        prevSession: inst.prevSession,
      };

      indicesData[targetName] = entry;
      indicesData[inst.symbol] = entry;
      if (inst.symbol === 'BANKNIFTY') {
        indicesData['BANK NIFTY'] = entry;
        indicesData['BANKNIFTY'] = entry;
      }
      if (inst.symbol === 'NIFTY 50') {
        indicesData['NIFTY'] = entry;
        indicesData['NIFTY 50'] = entry;
      }
    }

    return {
      schemaVersion: '1.0',
      mode: 'SIMULATED_SNAPSHOT',
      generatedAt,
      indices: indicesData,
    };
  }

  // Live Dhan API fetching
  // First, verify credentials with a test call so we fail fast with a clear error on 401
  if (typeof client.getExpiryList === 'function') {
    try {
      const testExpiries = await client.getExpiryList(13, 'IDX_I');
      if (!testExpiries || testExpiries.length === 0) {
        console.warn('[SnapshotEngine] Warning: No active expiries returned for NIFTY.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('401') || errMsg.includes('Authentication') || errMsg.includes('Token invalid')) {
        throw new Error(`DhanHQ API authentication failed (401): Your Access Token has expired. Please generate a fresh token from https://dhanhq.co/docs`);
      }
      throw err;
    }
  }

  for (const targetName of indicesToFetch) {
    const reg =
      getInstrumentBySymbol(targetName) ||
      DHAN_REGISTERED_INSTRUMENTS.find(
        (i) => matchesSymbolOrName(targetName, i.symbol, i.name)
      );

    if (!reg) continue;

    try {
      // 1. Get valid active expiry from DhanHQ
      let activeExpiry: string | null = null;
      if (typeof client.getExpiryList === 'function') {
        try {
          const expiries = await client.getExpiryList(reg.underlyingScrip, reg.exchangeSegment);
          if (expiries && expiries.length > 0) {
            activeExpiry = expiries[0];
          }
        } catch (expErr) {
          console.warn(`[SnapshotEngine] Could not fetch expiry list for ${reg.symbol}:`, expErr);
        }
      }

      if (!activeExpiry) {
        // Fall back to calculated nearest Thursday expiry
        const now = new Date();
        const day = now.getDay();
        const diff = (4 - day + 7) % 7;
        const target = new Date(now);
        target.setDate(now.getDate() + (diff === 0 && now.getHours() >= 16 ? 7 : diff));
        activeExpiry = target.toISOString().split('T')[0];
      }

      // 2. Fetch Option Chain using the valid active expiry
      const normChain = await client.getOptionChain({
        UnderlyingScrip: reg.underlyingScrip,
        UnderlyingSeg: reg.exchangeSegment,
        Expiry: activeExpiry,
      });

      const spot = normChain.underlyingPrice;
      const gexResult = calculateOptionChainGex(normChain, {
        symbol: reg.symbol,
        lotSize: reg.lotSize,
      });

      const dexResult = calculateDexAndHedgingFlow(
        gexResult.strikes,
        spot,
        reg.lotSize,
        gexResult.netTotalGex
      );

      const pinForecast = calculatePinProbabilities(gexResult.strikes, spot, 0.05);

      const liveEntry: IndexSnapshotData = {
        symbol: reg.symbol,
        name: reg.name,
        type: reg.type,
        securityId: reg.underlyingScrip,
        spotPrice: spot,
        timestamp: generatedAt,
        lotSize: reg.lotSize,
        expiry: activeExpiry,
        netGex: Number((gexResult.netTotalGex / 1e7).toFixed(2)),
        callGex: Number((gexResult.totalCallGex / 1e7).toFixed(2)),
        putGex: Number((gexResult.totalPutGex / 1e7).toFixed(2)),
        gammaFlip: gexResult.gammaFlip,
        callWall: gexResult.callWall,
        putWall: gexResult.putWall,
        netDexCr: dexResult.netDexCr,
        pinStrikes: pinForecast.strikes.slice(0, 5).map((p) => ({
          strike: p.strike,
          probability: Number((p.pinProbabilityPct ?? 0).toFixed(2)),
        })),
        strikes: gexResult.strikes,
      };

      indicesData[targetName] = liveEntry;
      indicesData[reg.symbol] = liveEntry;
      if (reg.symbol === 'BANKNIFTY') {
        indicesData['BANK NIFTY'] = liveEntry;
      }
      if (reg.symbol === 'NIFTY') {
        indicesData['NIFTY 50'] = liveEntry;
      }
    } catch (itemErr: unknown) {
      console.warn(`[SnapshotEngine] Failed fetching live data for ${reg.symbol}:`, (itemErr as Error)?.message || itemErr);
      // Fallback to mock instrument only if live data fetch fails for this specific item
      const mock = MOCK_INSTRUMENTS.find((m) =>
        matchesSymbolOrName(reg.symbol, m.symbol, m.name) ||
        m.underlyingScrip === reg.underlyingScrip
      );
      if (mock) {
        const mockFallback: IndexSnapshotData = {
          symbol: mock.symbol,
          name: mock.name,
          type: mock.type,
          securityId: mock.underlyingScrip || reg.underlyingScrip,
          spotPrice: mock.lastPrice,
          timestamp: generatedAt,
          change: mock.change,
          changePercent: mock.changePercent,
          dayHigh: mock.dayHigh,
          dayLow: mock.dayLow,
          volume: mock.volume,
          lotSize: mock.lotSize || reg.lotSize,
          expiry: mock.expiry,
          netGex: mock.netGex,
          callGex: mock.netGex > 0 ? mock.netGex * 1.5 : mock.netGex * 0.5,
          putGex: mock.netGex > 0 ? -mock.netGex * 0.5 : mock.netGex * 1.5,
          gammaFlip: mock.gammaFlip,
          callWall: mock.callWall,
          putWall: mock.putWall,
          netDexCr: 0,
          pinStrikes: [],
          strikes: mock.strikes || [],
          candles: mock.candles,
          prevSession: mock.prevSession,
        };

        indicesData[targetName] = mockFallback;
        indicesData[mock.symbol] = mockFallback;
        if (mock.symbol === 'BANKNIFTY') {
          indicesData['BANK NIFTY'] = mockFallback;
        }
        if (mock.symbol === 'NIFTY 50') {
          indicesData['NIFTY'] = mockFallback;
        }
      }
    }
  }

  return {
    schemaVersion: '1.0',
    mode: 'LIVE_DHAN_SNAPSHOT',
    generatedAt,
    indices: indicesData,
  };
}
