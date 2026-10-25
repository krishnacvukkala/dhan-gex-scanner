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
  securityId: number;
  spotPrice: number;
  timestamp: string;
  netGex: number;
  callGex: number;
  putGex: number;
  gammaFlip: number;
  callWall: number;
  putWall: number;
  netDexCr: number;
  pinStrikes: { strike: number; probability: number }[];
  strikes: StrikeGexDetail[];
}

export interface GexSnapshotPayload {
  schemaVersion: string;
  mode: 'LIVE_DHAN_SNAPSHOT' | 'SIMULATED_SNAPSHOT';
  generatedAt: string;
  indices: Record<string, IndexSnapshotData>;
}

function matchesSymbolOrName(target: string, symbol: string, name: string): boolean {
  const normTarget = target.replace(/\s+/g, '').toUpperCase();
  const normSymbol = symbol.replace(/\s+/g, '').toUpperCase();
  const normName = name.replace(/\s+/g, '').toUpperCase();
  return (
    normTarget === normSymbol ||
    normTarget === normName ||
    normName.includes(normTarget) ||
    normTarget.includes(normSymbol)
  );
}

export async function generateMarketSnapshot(
  client: DhanApiClient | null,
  indicesToFetch: string[] = ['NIFTY 50', 'BANK NIFTY', 'FINNIFTY', 'SENSEX']
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

      indicesData[targetName] = {
        symbol: inst.symbol,
        name: inst.name,
        securityId: inst.underlyingScrip || 13,
        spotPrice: inst.lastPrice,
        timestamp: generatedAt,
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
      };
    }

    return {
      schemaVersion: '1.0',
      mode: 'SIMULATED_SNAPSHOT',
      generatedAt,
      indices: indicesData,
    };
  }

  // Live Dhan API fetching
  for (const targetName of indicesToFetch) {
    const reg =
      getInstrumentBySymbol(targetName) ||
      DHAN_REGISTERED_INSTRUMENTS.find(
        (i) => matchesSymbolOrName(targetName, i.symbol, i.name)
      );

    if (!reg) continue;

    try {
      const expiry = new Date().toISOString().split('T')[0];
      const normChain = await client.getOptionChain({
        UnderlyingScrip: reg.underlyingScrip,
        UnderlyingSeg: reg.exchangeSegment,
        Expiry: expiry,
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

      indicesData[targetName] = {
        symbol: reg.symbol,
        name: reg.name,
        securityId: reg.underlyingScrip,
        spotPrice: spot,
        timestamp: generatedAt,
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
    } catch {
      // Fallback to mock instrument if network fails for this instrument
      const mock = MOCK_INSTRUMENTS.find((m) => m.underlyingScrip === reg.underlyingScrip);
      if (mock) {
        indicesData[targetName] = {
          symbol: mock.symbol,
          name: mock.name,
          securityId: mock.underlyingScrip || reg.underlyingScrip,
          spotPrice: mock.lastPrice,
          timestamp: generatedAt,
          netGex: mock.netGex,
          callGex: mock.netGex > 0 ? mock.netGex * 1.5 : mock.netGex * 0.5,
          putGex: mock.netGex > 0 ? -mock.netGex * 0.5 : mock.netGex * 1.5,
          gammaFlip: mock.gammaFlip,
          callWall: mock.callWall,
          putWall: mock.putWall,
          netDexCr: 0,
          pinStrikes: [],
          strikes: mock.strikes || [],
        };
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
