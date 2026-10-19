import { describe, it, expect } from 'vitest';
import { calculateOptionChainGex } from '../services/gex/engine';
import { NormalizedOptionChain } from '../services/dhan/types';

describe('Conventional GEX Aggregation Engine', () => {
  // Construct a realistic synthetic option chain around spot = 25000 (NIFTY)
  const mockChain: NormalizedOptionChain = {
    underlyingScrip: 13,
    underlyingPrice: 25000,
    expiry: '2026-10-22',
    timestamp: '2026-10-19T09:30:00Z',
    strikes: [
      {
        strikePrice: 24600,
        callPrice: 420,
        callOi: 20000,
        callPreviousOi: 19000,
        callVolume: 5000,
        callIv: 0,
        putPrice: 15,
        putOi: 180000, // Massive Put Support (Put Wall candidate)
        putPreviousOi: 170000,
        putVolume: 12000,
        putIv: 0,
      },
      {
        strikePrice: 24800,
        callPrice: 260,
        callOi: 50000,
        callPreviousOi: 48000,
        callVolume: 15000,
        callIv: 0,
        putPrice: 45,
        putOi: 120000,
        putPreviousOi: 115000,
        putVolume: 35000,
        putIv: 0,
      },
      {
        strikePrice: 25000, // ATM strike
        callPrice: 130,
        callOi: 100000,
        callPreviousOi: 95000,
        callVolume: 80000,
        callIv: 0,
        putPrice: 110,
        putOi: 90000,
        putPreviousOi: 88000,
        putVolume: 75000,
        putIv: 0,
      },
      {
        strikePrice: 25200,
        callPrice: 45,
        callOi: 150000,
        callPreviousOi: 140000,
        callVolume: 65000,
        callIv: 0,
        putPrice: 240,
        putOi: 40000,
        putPreviousOi: 38000,
        putVolume: 18000,
        putIv: 0,
      },
      {
        strikePrice: 25400,
        callPrice: 12,
        callOi: 220000, // Massive Call Resistance (Call Wall candidate)
        callPreviousOi: 210000,
        callVolume: 90000,
        callIv: 0,
        putPrice: 410,
        putOi: 10000,
        putPreviousOi: 9500,
        putVolume: 4000,
        putIv: 0,
      },
    ],
  };

  const fixedDate = new Date('2026-10-19T04:00:00Z'); // 09:30 IST

  it('calculates theoretical IV and Gammas per strike without synthesizing data', () => {
    const result = calculateOptionChainGex(mockChain, {
      currentDate: fixedDate,
      lotSize: 25,
      riskFreeRate: 0.065,
    });

    expect(result.strikes).toHaveLength(5);
    for (const strike of result.strikes) {
      expect(strike.callIv).toBeGreaterThan(0.01);
      expect(strike.putIv).toBeGreaterThan(0.01);
      expect(strike.callGamma).toBeGreaterThan(0);
      expect(strike.putGamma).toBeGreaterThan(0);
      expect(strike.callGex).toBeGreaterThan(0);
      expect(strike.putGex).toBeLessThan(0);
      expect(strike.netGex).toBeCloseTo(strike.callGex + strike.putGex, 4);
    }
  });

  it('correctly aggregates Total Call GEX, Total Put GEX, and Net GEX', () => {
    const result = calculateOptionChainGex(mockChain, {
      currentDate: fixedDate,
      lotSize: 25,
    });

    expect(result.totalCallGex).toBeGreaterThan(0);
    expect(result.totalPutGex).toBeGreaterThan(0);

    const manualSumNet = result.strikes.reduce((acc, s) => acc + s.netGex, 0);
    expect(result.netTotalGex).toBeCloseTo(manualSumNet, 4);
  });

  it('identifies Call Wall and Put Wall structural levels accurately', () => {
    const result = calculateOptionChainGex(mockChain, {
      currentDate: fixedDate,
      lotSize: 25,
    });

    // Call Wall should be at or near major call OI / resistance (25200 or 25400)
    expect(result.callWall).toBeGreaterThanOrEqual(25000);
    expect(result.callWall).toBeLessThanOrEqual(25400);

    // Put Wall should be at or near major put OI / support (24600 or 24800)
    expect(result.putWall).toBeGreaterThanOrEqual(24600);
    expect(result.putWall).toBeLessThanOrEqual(25000);
  });

  it('interpolates Gamma Flip level where Net GEX transitions across zero', () => {
    const result = calculateOptionChainGex(mockChain, {
      currentDate: fixedDate,
      lotSize: 25,
    });

    // Flip should be within strike boundary range [24600, 25400]
    expect(result.gammaFlip).toBeGreaterThanOrEqual(24600);
    expect(result.gammaFlip).toBeLessThanOrEqual(25400);
  });

  it('assigns dealer bias correctly based on Net Total GEX', () => {
    const result = calculateOptionChainGex(mockChain, {
      currentDate: fixedDate,
      lotSize: 25,
    });

    expect(['LONG_GAMMA', 'SHORT_GAMMA', 'NEUTRAL']).toContain(result.dealerBias);
    if (result.netTotalGex > 0) {
      expect(result.dealerBias).toBe('LONG_GAMMA');
    } else if (result.netTotalGex < 0) {
      expect(result.dealerBias).toBe('SHORT_GAMMA');
    }
  });

  it('classifies nearest GEX event distance and status', () => {
    const result = calculateOptionChainGex(mockChain, {
      currentDate: fixedDate,
      lotSize: 25,
    });

    expect(result.nearestGex).toBeDefined();
    expect(['Call Wall', 'Put Wall', 'Gamma Flip']).toContain(result.nearestGex.name);
    expect(result.nearestGex.distancePts).toBeDefined();
    expect(result.nearestGex.distancePct).toBeDefined();
    expect(['APPROACHING', 'TESTING', 'PINNING', 'BREACHED']).toContain(result.nearestGex.status);
  });

  it('gracefully handles empty option chain without crashing', () => {
    const emptyChain: NormalizedOptionChain = {
      underlyingScrip: 13,
      underlyingPrice: 25000,
      expiry: '2026-10-22',
      timestamp: '2026-10-19T09:30:00Z',
      strikes: [],
    };

    const result = calculateOptionChainGex(emptyChain, {
      currentDate: fixedDate,
      lotSize: 25,
    });

    expect(result.strikes).toEqual([]);
    expect(result.totalCallGex).toBe(0);
    expect(result.totalPutGex).toBe(0);
    expect(result.netTotalGex).toBe(0);
    expect(result.dealerBias).toBe('NEUTRAL');
    expect(result.callWall).toBe(25000);
    expect(result.putWall).toBe(25000);
    expect(result.gammaFlip).toBe(25000);
  });
});
