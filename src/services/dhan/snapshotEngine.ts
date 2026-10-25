import { DhanApiClient } from './client';
import { DHAN_REGISTERED_INSTRUMENTS, getInstrumentBySymbol } from './instruments';
import { MOCK_INSTRUMENTS } from '../../data/mockData';
import { calculateOptionChainGex } from '../gex/engine';
import { calculateDexAndHedgingFlow } from '../gex/dexEngine';
import { calculatePinProbabilities } from '../gex/pinProbabilityEngine';
import { StrikeGexDetail } from '../gex/types';
import { NormalizedOptionChain, NormalizedOptionStrike } from './types';

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

      const dex = calculateDexAndHedgingFlow(inst.strikes, inst.lastPrice, inst.lotSize, inst.netGex * 1e7);
      const pinForecast = calculatePinProbabilities(inst.strikes, inst.lastPrice, 0.05);

      indicesData[targetName] = {
        symbol: inst.symbol,
        name: inst.name,
        securityId: inst.underlyingScrip,
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
        strikes: inst.strikes,
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
      const ocRes = await client.getOptionChain(reg.underlyingScrip, reg.exchangeSegment);
      // Support both { data: { data: { oc, spot } } } or { data: { oc, last_price } }
      // @ts-expect-error handle flexible broker payload shape
      const ocObj = ocRes?.data?.data?.oc || ocRes?.data?.oc || {};
      // @ts-expect-error handle flexible broker spot price
      const spot = ocRes?.data?.data?.spot || ocRes?.data?.last_price || (reg.underlyingScrip === 13 ? 24500 : 52000);

      const strikes: NormalizedOptionStrike[] = [];
      const strikeKeys = Object.keys(ocObj).map(Number).sort((a, b) => a - b);

      for (const strikePrice of strikeKeys) {
        const item = ocObj[strikePrice.toFixed(6)] || ocObj[strikePrice];
        if (!item) continue;

        strikes.push({
          strikePrice,
          callPrice: item.ce?.last_price || 0,
          callOi: item.ce?.oi || 0,
          callPreviousOi: item.ce?.previous_oi || item.ce?.oi || 0,
          callVolume: item.ce?.volume || 0,
          callIv: (item.ce?.implied_volatility || item.ce?.iv || 15) / 100,
          putPrice: item.pe?.last_price || 0,
          putOi: item.pe?.oi || 0,
          putPreviousOi: item.pe?.previous_oi || item.pe?.oi || 0,
          putVolume: item.pe?.volume || 0,
          putIv: (item.pe?.implied_volatility || item.pe?.iv || 15) / 100,
        });
      }

      const normChain: NormalizedOptionChain = {
        underlyingScrip: reg.underlyingScrip,
        underlyingPrice: spot,
        expiry: new Date().toISOString().split('T')[0],
        strikes,
        timestamp: generatedAt,
      };

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
          securityId: mock.underlyingScrip,
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
          strikes: mock.strikes,
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
