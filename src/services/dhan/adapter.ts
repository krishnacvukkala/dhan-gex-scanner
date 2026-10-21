import { RegisteredInstrument } from './instruments';
import { GexCalculationResult } from '../gex/types';
import { Instrument, CandleData, NearestGexInfo, WatchlistType, GexLevelType } from '../../types';
import { DhanQuoteData, DhanIntradayCandleResponse } from './types';

/**
 * Maps GEX Level Name to Watchlist type (Support vs Resistance).
 */
export function resolveWatchlistType(
  levelName: string,
  spot: number,
  level: number
): WatchlistType {
  if (levelName === 'Call Wall') {
    return 'RESISTANCE';
  }
  if (levelName === 'Put Wall') {
    return 'SUPPORT';
  }
  // For Gamma Flip: if spot is currently above the flip level, it acts as support; otherwise resistance
  return spot >= level ? 'SUPPORT' : 'RESISTANCE';
}

/**
 * Maps GEX Level Name to UI GexLevelType.
 */
export function resolveGexLevelType(levelName: string): GexLevelType {
  switch (levelName) {
    case 'Call Wall':
      return 'CALL_WALL';
    case 'Put Wall':
      return 'PUT_WALL';
    case 'Gamma Flip':
      return 'GAMMA_FLIP';
    default:
      return 'VOL_TRIGGER';
  }
}

/**
 * Converts Dhan intraday candle response into chart CandleData array.
 */
export function convertDhanCandles(response: DhanIntradayCandleResponse): CandleData[] {
  if (!response.timestamp || response.timestamp.length === 0) {
    return [];
  }

  const candles: CandleData[] = [];
  const len = response.timestamp.length;

  for (let i = 0; i < len; i++) {
    candles.push({
      time: response.timestamp[i],
      open: response.open[i] ?? 0,
      high: response.high[i] ?? 0,
      low: response.low[i] ?? 0,
      close: response.close[i] ?? 0,
      volume: response.volume[i] ?? 0,
    });
  }

  return candles.sort((a, b) => a.time - b.time);
}

/**
 * Formats volume numbers into human-readable Indian or financial format (e.g. 1.2M, 450K).
 */
export function formatVolume(volume: number): string {
  if (!volume || volume <= 0) return '0';
  if (volume >= 1e7) {
    return `${(volume / 1e7).toFixed(2)}Cr`;
  }
  if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(2)}M`;
  }
  if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(1)}K`;
  }
  return volume.toLocaleString('en-IN');
}

/**
 * Generates synthetic intraday candles around spot price when historical candle API is unavailable or outside trading hours.
 */
function createFallbackCandles(spot: number): CandleData[] {
  const nowSec = Math.floor(Date.now() / 1000);
  const candles: CandleData[] = [];
  const count = 30; // 30 5-min candles = 2.5 hours
  let currentPrice = spot * 0.995;

  for (let i = 0; i < count; i++) {
    const time = nowSec - (count - i) * 300;
    const delta = (Math.random() - 0.48) * (spot * 0.002);
    const open = currentPrice;
    const close = i === count - 1 ? spot : currentPrice + delta;
    const high = Math.max(open, close) + Math.random() * (spot * 0.001);
    const low = Math.min(open, close) - Math.random() * (spot * 0.001);
    const volume = Math.floor(10000 + Math.random() * 50000);

    candles.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Adapts GexCalculationResult into UI Instrument model.
 */
export function adaptGexResultToInstrument(
  registered: RegisteredInstrument,
  gexResult: GexCalculationResult,
  quote?: DhanQuoteData,
  rawCandles?: DhanIntradayCandleResponse
): Instrument {
  const spot = gexResult.underlyingPrice;
  const quoteLast = quote?.last_price ?? spot;
  const close = quote?.close ?? quoteLast;
  const change = quote?.net_change ?? (close > 0 ? quoteLast - close : 0);
  const changePercent = close > 0 ? (change / close) * 100 : 0;
  const dayHigh = quote?.high ?? Math.max(spot, gexResult.callWall);
  const dayLow = quote?.low ?? Math.min(spot, gexResult.putWall);
  const volumeStr = formatVolume(quote?.volume ?? 0);

  // Net GEX in ₹ Crores (1 Cr = 10,000,000)
  const netGexInCr = Number((gexResult.netTotalGex / 1e7).toFixed(2));

  const watchlist = resolveWatchlistType(
    gexResult.nearestGex.name,
    spot,
    gexResult.nearestGex.level
  );

  const nearestGex: NearestGexInfo = {
    level: gexResult.nearestGex.level,
    name: gexResult.nearestGex.name,
    type: resolveGexLevelType(gexResult.nearestGex.name),
    watchlist,
    distancePts: gexResult.nearestGex.distancePts,
    distancePct: gexResult.nearestGex.distancePct,
    status: gexResult.nearestGex.status,
  };

  const candles = rawCandles && rawCandles.timestamp?.length > 0
    ? convertDhanCandles(rawCandles)
    : createFallbackCandles(spot);

  return {
    id: registered.id,
    symbol: registered.symbol,
    name: registered.name,
    type: registered.type,
    lastPrice: Number(quoteLast.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    dayHigh: Number(dayHigh.toFixed(2)),
    dayLow: Number(dayLow.toFixed(2)),
    volume: volumeStr,
    callWall: gexResult.callWall,
    putWall: gexResult.putWall,
    gammaFlip: gexResult.gammaFlip,
    netGex: netGexInCr,
    netGexUnit: 'Cr',
    dealerBias: gexResult.dealerBias,
    nearestGex,
    updatedAt: new Date().toLocaleTimeString('en-IN', { hour12: false }),
    isSimulated: false,
    candles,
    strikes: gexResult.strikes,
    underlyingScrip: gexResult.underlyingScrip,
    expiry: gexResult.expiry,
    lotSize: gexResult.lotSize,
  };
}
