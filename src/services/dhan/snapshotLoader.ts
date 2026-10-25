import { GexSnapshotPayload, IndexSnapshotData } from './snapshotEngine';
import { Instrument, CandleData, NearestGexInfo } from '../../types';
import { resolveLotSize } from '../gex/lotSize';

export async function loadGitSnapshot(): Promise<GexSnapshotPayload | null> {
  const possiblePaths = [
    './data/latest-gex.json',
    '/data/latest-gex.json',
    'data/latest-gex.json',
  ];

  for (const path of possiblePaths) {
    try {
      const response = await fetch(path, { cache: 'no-cache' });
      if (response && response.ok) {
        return (await response.json()) as GexSnapshotPayload;
      }
    } catch {
      // Continue to next path
    }
  }

  return null;
}

function generateCandlesFromSpot(spot: number): CandleData[] {
  const nowSec = Math.floor(Date.now() / 1000);
  const candles: CandleData[] = [];
  const count = 30;
  let currentPrice = spot * 0.995;

  for (let i = 0; i < count; i++) {
    const time = nowSec - (count - i) * 300;
    const delta = (Math.random() - 0.48) * (spot * 0.002);
    const open = currentPrice;
    const close = i === count - 1 ? spot : currentPrice + delta;
    const high = Math.max(open, close) + Math.random() * (spot * 0.001);
    const low = Math.min(open, close) - Math.random() * (spot * 0.001);

    candles.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: 15000,
    });

    currentPrice = close;
  }

  return candles;
}

export function convertSnapshotToInstrument(data: IndexSnapshotData): Instrument {
  const spot = data.spotPrice;
  const distToCall = Math.abs(spot - data.callWall);
  const distToPut = Math.abs(spot - data.putWall);
  const distToFlip = Math.abs(spot - data.gammaFlip);

  let nearestLevel = data.gammaFlip;
  let nearestName = 'Gamma Flip';
  let nearestType: 'CALL_WALL' | 'PUT_WALL' | 'GAMMA_FLIP' = 'GAMMA_FLIP';
  let minDistance = distToFlip;

  if (distToCall < minDistance) {
    nearestLevel = data.callWall;
    nearestName = 'Call Wall';
    nearestType = 'CALL_WALL';
    minDistance = distToCall;
  }
  if (distToPut < minDistance) {
    nearestLevel = data.putWall;
    nearestName = 'Put Wall';
    nearestType = 'PUT_WALL';
    minDistance = distToPut;
  }

  const distancePct = spot > 0 ? (minDistance / spot) * 100 : 0;
  const nearestGex: NearestGexInfo = {
    level: nearestLevel,
    name: nearestName,
    type: nearestType,
    watchlist: nearestType === 'CALL_WALL' ? 'RESISTANCE' : 'SUPPORT',
    distancePts: Number(minDistance.toFixed(2)),
    distancePct: Number(distancePct.toFixed(2)),
    status: distancePct < 0.25 ? 'PINNING' : distancePct < 0.75 ? 'APPROACHING' : 'TESTING',
  };

  const dealerBias = data.netGex > 0 ? 'LONG_GAMMA' : data.netGex < 0 ? 'SHORT_GAMMA' : 'NEUTRAL';

  return {
    id: data.symbol.toLowerCase().replace(/\s+/g, '-'),
    symbol: data.symbol,
    name: data.name,
    type: 'INDEX',
    lastPrice: spot,
    change: 0,
    changePercent: 0,
    dayHigh: Math.max(spot, data.callWall),
    dayLow: Math.min(spot, data.putWall),
    volume: '1.2M',
    callWall: data.callWall,
    putWall: data.putWall,
    gammaFlip: data.gammaFlip,
    netGex: data.netGex,
    netGexUnit: '₹ Cr',
    dealerBias,
    nearestGex,
    updatedAt: data.timestamp,
    isSimulated: false,
    candles: generateCandlesFromSpot(spot),
    lotSize: resolveLotSize(data.symbol),
    underlyingScrip: data.securityId,
    strikes: data.strikes || [],
  };
}
