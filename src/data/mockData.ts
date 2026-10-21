import { Instrument, CandleData } from '../types';
import { bsGamma, bsDelta, bsCallPrice, bsPutPrice } from '../services/gex/blackScholes';
import { StrikeGexDetail } from '../services/gex/types';

/**
 * Generates realistic 5-minute candle data across multiple trading sessions (default: 3 days = 225 candles).
 * Timestamps are generated in strictly ascending 300-second (5 min) increments.
 */
function generate5MinCandles(
  basePrice: number,
  volatility: number,
  count = 225,
  trend = 0.0002
): CandleData[] {
  const candles: CandleData[] = [];
  const nowSec = Math.floor(Date.now() / 1000);
  const startTime = nowSec - count * 300;

  let currentPrice = basePrice * (1 - count * trend * 0.4);

  for (let i = 0; i < count; i++) {
    const time = startTime + i * 300;
    const change = currentPrice * (Math.random() - 0.49 + trend) * volatility;
    const open = Math.round(currentPrice * 100) / 100;
    const close = Math.round((open + change) * 100) / 100;
    const high = Math.round((Math.max(open, close) + Math.random() * basePrice * volatility * 0.6) * 100) / 100;
    const low = Math.round((Math.min(open, close) - Math.random() * basePrice * volatility * 0.6) * 100) / 100;
    const volume = Math.floor(Math.random() * 25000 + 5000);

    candles.push({ time, open, high, low, close, volume });
    currentPrice = close;
  }

  return candles;
}

/**
 * Generates realistic strike-level option chain Greeks and GEX details for simulation.
 */
function generateMockStrikes(
  spot: number,
  step: number,
  lotSize: number
): StrikeGexDetail[] {
  const strikes: StrikeGexDetail[] = [];
  const atm = Math.round(spot / step) * step;
  const T = 4 / 365; // ~4 days to weekly expiration
  const r = 0.065;

  for (let i = -12; i <= 12; i++) {
    const K = atm + i * step;
    const dist = (K - spot) / spot;
    const callIv = Math.max(0.08, 0.15 + dist * 0.15);
    const putIv = Math.max(0.08, 0.16 - dist * 0.15);
    const callGamma = bsGamma(spot, K, r, T, callIv);
    const putGamma = bsGamma(spot, K, r, T, putIv);
    const callDelta = Math.round(bsDelta(spot, K, r, T, callIv, 'CALL') * 1000) / 1000;
    const putDelta = Math.round(bsDelta(spot, K, r, T, putIv, 'PUT') * 1000) / 1000;
    const callPrice = Math.max(0.05, Math.round(bsCallPrice(spot, K, r, T, callIv) * 100) / 100);
    const putPrice = Math.max(0.05, Math.round(bsPutPrice(spot, K, r, T, putIv) * 100) / 100);

    const callWeight = Math.exp(-Math.pow(dist - 0.012, 2) / 0.0006);
    const putWeight = Math.exp(-Math.pow(dist + 0.012, 2) / 0.0006);
    const callOi = Math.max(1, Math.round((callWeight * 120000 + 5000 + (K % (step * 5) === 0 ? 40000 : 0)) / lotSize)) * lotSize;
    const putOi = Math.max(1, Math.round((putWeight * 110000 + 4000 + (K % (step * 5) === 0 ? 35000 : 0)) / lotSize)) * lotSize;

    const callGex = callGamma * callOi * lotSize;
    const putGex = -(putGamma * putOi * lotSize);
    const netGex = callGex + putGex;

    strikes.push({
      strikePrice: K,
      callOi,
      callIv: Math.round(callIv * 10000) / 100,
      callGamma,
      callDelta,
      callPrice,
      callGex,
      putOi,
      putIv: Math.round(putIv * 10000) / 100,
      putGamma,
      putDelta,
      putPrice,
      putGex,
      netGex,
    });
  }

  return strikes;
}

export const MOCK_INSTRUMENTS: Instrument[] = [
  // --- INDICES ---
  {
    id: 'nifty-50',
    symbol: 'NIFTY 50',
    name: 'NIFTY 50 Index',
    type: 'INDEX',
    lastPrice: 25142.50,
    change: 84.30,
    changePercent: 0.34,
    dayHigh: 25210.00,
    dayLow: 25060.00,
    volume: '2.4M',
    callWall: 25300.00,
    putWall: 25000.00,
    gammaFlip: 25100.00,
    netGex: 184.2,
    netGexUnit: '₹ Cr',
    dealerBias: 'LONG_GAMMA',
    nearestGex: {
      level: 25100.00,
      name: 'Gamma Flip',
      type: 'GAMMA_FLIP',
      watchlist: 'SUPPORT',
      distancePts: 42.50,
      distancePct: 0.17,
      status: 'APPROACHING',
    },
    updatedAt: new Date().toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(25142.50, 0.0018, 225, 0.0003),
    lotSize: 25,
    underlyingScrip: 13,
    expiry: '2026-10-29',
    prevSession: {
      callWall: 25200.00,
      putWall: 24900.00,
      gammaFlip: 25050.00,
      close: 25058.20,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(25142.50, 50, 25),
  },
  {
    id: 'bank-nifty',
    symbol: 'BANKNIFTY',
    name: 'Nifty Bank Index',
    type: 'INDEX',
    lastPrice: 51880.20,
    change: -145.60,
    changePercent: -0.28,
    dayHigh: 52150.00,
    dayLow: 51720.00,
    volume: '1.8M',
    callWall: 52500.00,
    putWall: 51800.00,
    gammaFlip: 52000.00,
    netGex: -78.4,
    netGexUnit: '₹ Cr',
    dealerBias: 'SHORT_GAMMA',
    nearestGex: {
      level: 51800.00,
      name: 'Major Put Wall',
      type: 'PUT_WALL',
      watchlist: 'SUPPORT',
      distancePts: 80.20,
      distancePct: 0.15,
      status: 'TESTING',
    },
    updatedAt: new Date(Date.now() - 4000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(51880.20, 0.0022, 225, -0.0002),
    lotSize: 15,
    underlyingScrip: 25,
    expiry: '2026-10-29',
    prevSession: {
      callWall: 52200.00,
      putWall: 51500.00,
      gammaFlip: 51800.00,
      close: 52025.80,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(51880.20, 100, 15),
  },

  // --- F&O STOCKS (SUPPORT WATCHLIST) ---
  {
    id: 'reliance',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    type: 'STOCK',
    lastPrice: 2748.10,
    change: -12.40,
    changePercent: -0.45,
    dayHigh: 2772.00,
    dayLow: 2742.00,
    volume: '4.1M',
    callWall: 2800.00,
    putWall: 2740.00,
    gammaFlip: 2760.00,
    netGex: 42.1,
    netGexUnit: '₹ Cr',
    dealerBias: 'LONG_GAMMA',
    nearestGex: {
      level: 2740.00,
      name: 'Put Wall Support',
      type: 'PUT_WALL',
      watchlist: 'SUPPORT',
      distancePts: 8.10,
      distancePct: 0.30,
      status: 'APPROACHING',
    },
    updatedAt: new Date(Date.now() - 6000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(2748.10, 0.0025, 225, -0.0004),
    lotSize: 250,
    underlyingScrip: 2885,
    prevSession: {
      callWall: 2780.00,
      putWall: 2720.00,
      gammaFlip: 2750.00,
      close: 2760.50,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(2748.10, 20, 250),
  },
  {
    id: 'hdfcbank',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    type: 'STOCK',
    lastPrice: 1682.40,
    change: 3.10,
    changePercent: 0.18,
    dayHigh: 1690.00,
    dayLow: 1678.00,
    volume: '8.3M',
    callWall: 1720.00,
    putWall: 1680.00,
    gammaFlip: 1700.00,
    netGex: 35.8,
    netGexUnit: '₹ Cr',
    dealerBias: 'LONG_GAMMA',
    nearestGex: {
      level: 1680.00,
      name: 'Major Put Wall',
      type: 'PUT_WALL',
      watchlist: 'SUPPORT',
      distancePts: 2.40,
      distancePct: 0.14,
      status: 'TESTING',
    },
    updatedAt: new Date(Date.now() - 9000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(1682.40, 0.002, 225, 0.0001),
    lotSize: 550,
    underlyingScrip: 1333,
    prevSession: {
      callWall: 1700.00,
      putWall: 1660.00,
      gammaFlip: 1680.00,
      close: 1679.30,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(1682.40, 10, 550),
  },
  {
    id: 'sbin',
    symbol: 'SBIN',
    name: 'State Bank of India',
    type: 'STOCK',
    lastPrice: 792.80,
    change: -5.70,
    changePercent: -0.71,
    dayHigh: 801.50,
    dayLow: 791.00,
    volume: '6.7M',
    callWall: 820.00,
    putWall: 790.00,
    gammaFlip: 800.00,
    netGex: 18.2,
    netGexUnit: '₹ Cr',
    dealerBias: 'LONG_GAMMA',
    nearestGex: {
      level: 790.00,
      name: 'Put Wall Base',
      type: 'PUT_WALL',
      watchlist: 'SUPPORT',
      distancePts: 2.80,
      distancePct: 0.35,
      status: 'APPROACHING',
    },
    updatedAt: new Date(Date.now() - 12000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(792.80, 0.003, 225, -0.0005),
    lotSize: 750,
    underlyingScrip: 3045,
    prevSession: {
      callWall: 810.00,
      putWall: 780.00,
      gammaFlip: 795.00,
      close: 798.50,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(792.80, 10, 750),
  },

  // --- F&O STOCKS (RESISTANCE WATCHLIST) ---
  {
    id: 'tcs',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    type: 'STOCK',
    lastPrice: 4188.50,
    change: 48.20,
    changePercent: 1.16,
    dayHigh: 4195.00,
    dayLow: 4135.00,
    volume: '1.2M',
    callWall: 4200.00,
    putWall: 4100.00,
    gammaFlip: 4150.00,
    netGex: 64.5,
    netGexUnit: '₹ Cr',
    dealerBias: 'LONG_GAMMA',
    nearestGex: {
      level: 4200.00,
      name: 'Major Call Wall',
      type: 'CALL_WALL',
      watchlist: 'RESISTANCE',
      distancePts: 11.50,
      distancePct: 0.27,
      status: 'APPROACHING',
    },
    updatedAt: new Date(Date.now() - 5000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(4188.50, 0.002, 225, 0.0006),
    lotSize: 175,
    underlyingScrip: 11536,
    prevSession: {
      callWall: 4220.00,
      putWall: 4120.00,
      gammaFlip: 4160.00,
      close: 4140.30,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(4188.50, 50, 175),
  },
  {
    id: 'infy',
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    type: 'STOCK',
    lastPrice: 1897.10,
    change: 22.40,
    changePercent: 1.19,
    dayHigh: 1902.00,
    dayLow: 1870.00,
    volume: '5.6M',
    callWall: 1900.00,
    putWall: 1850.00,
    gammaFlip: 1880.00,
    netGex: 52.3,
    netGexUnit: '₹ Cr',
    dealerBias: 'SHORT_GAMMA',
    nearestGex: {
      level: 1900.00,
      name: 'Call Wall Pin',
      type: 'CALL_WALL',
      watchlist: 'RESISTANCE',
      distancePts: 2.90,
      distancePct: 0.15,
      status: 'PINNING',
    },
    updatedAt: new Date(Date.now() - 7000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(1897.10, 0.0028, 225, 0.0007),
    lotSize: 400,
    underlyingScrip: 1594,
    prevSession: {
      callWall: 1910.00,
      putWall: 1840.00,
      gammaFlip: 1870.00,
      close: 1874.70,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(1897.10, 20, 400),
  },
  {
    id: 'icicibank',
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    type: 'STOCK',
    lastPrice: 1248.60,
    change: 14.10,
    changePercent: 1.14,
    dayHigh: 1252.00,
    dayLow: 1230.00,
    volume: '7.9M',
    callWall: 1250.00,
    putWall: 1220.00,
    gammaFlip: 1235.00,
    netGex: 31.9,
    netGexUnit: '₹ Cr',
    dealerBias: 'LONG_GAMMA',
    nearestGex: {
      level: 1250.00,
      name: 'Call Resistance Wall',
      type: 'CALL_WALL',
      watchlist: 'RESISTANCE',
      distancePts: 1.40,
      distancePct: 0.11,
      status: 'PINNING',
    },
    updatedAt: new Date(Date.now() - 3000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(1248.60, 0.002, 225, 0.0005),
    lotSize: 700,
    underlyingScrip: 4963,
    prevSession: {
      callWall: 1255.00,
      putWall: 1215.00,
      gammaFlip: 1230.00,
      close: 1234.50,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(1248.60, 10, 700),
  },
  {
    id: 'tatamotors',
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    type: 'STOCK',
    lastPrice: 918.25,
    change: 16.80,
    changePercent: 1.86,
    dayHigh: 923.00,
    dayLow: 900.00,
    volume: '9.8M',
    callWall: 920.00,
    putWall: 890.00,
    gammaFlip: 905.00,
    netGex: 28.4,
    netGexUnit: '₹ Cr',
    dealerBias: 'SHORT_GAMMA',
    nearestGex: {
      level: 920.00,
      name: 'Key Call Wall',
      type: 'CALL_WALL',
      watchlist: 'RESISTANCE',
      distancePts: 1.75,
      distancePct: 0.19,
      status: 'TESTING',
    },
    updatedAt: new Date(Date.now() - 11000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(918.25, 0.0035, 225, 0.0008),
    lotSize: 550,
    underlyingScrip: 3456,
    prevSession: {
      callWall: 925.00,
      putWall: 885.00,
      gammaFlip: 900.00,
      close: 901.45,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(918.25, 10, 550),
  },
  {
    id: 'bhartiartl',
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    type: 'STOCK',
    lastPrice: 1695.50,
    change: 21.00,
    changePercent: 1.25,
    dayHigh: 1705.00,
    dayLow: 1670.00,
    volume: '3.4M',
    callWall: 1700.00,
    putWall: 1650.00,
    gammaFlip: 1680.00,
    netGex: 22.0,
    netGexUnit: '₹ Cr',
    dealerBias: 'LONG_GAMMA',
    nearestGex: {
      level: 1700.00,
      name: 'Call Wall Level',
      type: 'CALL_WALL',
      watchlist: 'RESISTANCE',
      distancePts: 4.50,
      distancePct: 0.27,
      status: 'APPROACHING',
    },
    updatedAt: new Date(Date.now() - 15000).toISOString(),
    isSimulated: true,
    candles: generate5MinCandles(1695.50, 0.0022, 225, 0.0005),
    lotSize: 475,
    underlyingScrip: 10604,
    prevSession: {
      callWall: 1710.00,
      putWall: 1640.00,
      gammaFlip: 1675.00,
      close: 1674.50,
      sessionDate: 'Prev Day',
    },
    strikes: generateMockStrikes(1695.50, 20, 475),
  },
];
