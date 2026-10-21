import { describe, it, expect } from 'vitest';
import {
  resolveWatchlistType,
  resolveGexLevelType,
  convertDhanCandles,
  formatVolume,
  adaptGexResultToInstrument,
} from '../services/dhan/adapter';
import { RegisteredInstrument } from '../services/dhan/instruments';
import { GexCalculationResult } from '../services/gex/types';

describe('Dhan GEX Adapter', () => {
  it('should resolve watchlist type correctly', () => {
    expect(resolveWatchlistType('Call Wall', 25000, 25200)).toBe('RESISTANCE');
    expect(resolveWatchlistType('Put Wall', 25000, 24800)).toBe('SUPPORT');
    // Spot above flip -> support
    expect(resolveWatchlistType('Gamma Flip', 25100, 25000)).toBe('SUPPORT');
    // Spot below flip -> resistance
    expect(resolveWatchlistType('Gamma Flip', 24900, 25000)).toBe('RESISTANCE');
  });

  it('should map level names to GexLevelType', () => {
    expect(resolveGexLevelType('Call Wall')).toBe('CALL_WALL');
    expect(resolveGexLevelType('Put Wall')).toBe('PUT_WALL');
    expect(resolveGexLevelType('Gamma Flip')).toBe('GAMMA_FLIP');
    expect(resolveGexLevelType('Other')).toBe('VOL_TRIGGER');
  });

  it('should format volume correctly', () => {
    expect(formatVolume(0)).toBe('0');
    expect(formatVolume(500)).toBe('500');
    expect(formatVolume(15000)).toBe('15.0K');
    expect(formatVolume(2500000)).toBe('2.50M');
    expect(formatVolume(35000000)).toBe('3.50Cr');
  });

  it('should convert raw Dhan candles to chart CandleData', () => {
    const raw = {
      open: [100, 105],
      high: [108, 110],
      low: [99, 104],
      close: [106, 107],
      volume: [5000, 8000],
      timestamp: [1700000000, 1700000300],
    };

    const converted = convertDhanCandles(raw);
    expect(converted).toHaveLength(2);
    expect(converted[0].time).toBe(1700000000);
    expect(converted[0].open).toBe(100);
    expect(converted[1].close).toBe(107);
  });

  it('should adapt GexCalculationResult to Instrument model', () => {
    const registered: RegisteredInstrument = {
      id: 'nifty-50',
      symbol: 'NIFTY',
      name: 'NIFTY 50',
      type: 'INDEX',
      underlyingScrip: 13,
      exchangeSegment: 'IDX_I',
      lotSize: 75,
      strikeStep: 50,
    };

    const gexResult: GexCalculationResult = {
      timestamp: '2026-10-19T10:00:00.000Z',
      underlyingScrip: 13,
      underlyingPrice: 25000,
      expiry: '2026-10-22',
      lotSize: 75,
      totalCallGex: 45000000,
      totalPutGex: -30000000,
      netTotalGex: 15000000,
      dealerBias: 'LONG_GAMMA',
      callWall: 25200,
      putWall: 24800,
      gammaFlip: 24950,
      nearestGex: {
        level: 25200,
        name: 'Call Wall',
        distancePts: 200,
        distancePct: 0.8,
        status: 'APPROACHING',
      },
      strikes: [],
    };

    const instrument = adaptGexResultToInstrument(registered, gexResult, {
      last_price: 25010,
      volume: 1200000,
      average_price: 25000,
      open: 24950,
      high: 25050,
      low: 24900,
      close: 24980,
      net_change: 30,
    });

    expect(instrument.id).toBe('nifty-50');
    expect(instrument.symbol).toBe('NIFTY');
    expect(instrument.lastPrice).toBe(25010);
    expect(instrument.callWall).toBe(25200);
    expect(instrument.putWall).toBe(24800);
    expect(instrument.gammaFlip).toBe(24950);
    expect(instrument.dealerBias).toBe('LONG_GAMMA');
    expect(instrument.isSimulated).toBe(false);
    expect(instrument.netGex).toBe(1.5); // 15,000,000 / 1e7 = 1.5 Cr
    expect(instrument.nearestGex.watchlist).toBe('RESISTANCE');
    expect(instrument.nearestGex.name).toBe('Call Wall');
    expect(instrument.candles.length).toBeGreaterThan(0);
  });
});
