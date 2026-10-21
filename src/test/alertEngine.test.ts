import { describe, it, expect } from 'vitest';
import { evaluateInstrumentAlerts } from '../services/alerts/alertEngine';
import { Instrument } from '../types';

describe('alertEngine', () => {
  const baseInstrument: Instrument = {
    id: 'nifty-50',
    symbol: 'NIFTY 50',
    name: 'NIFTY 50 Index',
    type: 'INDEX',
    lastPrice: 25100,
    change: 50,
    changePercent: 0.2,
    dayHigh: 25150,
    dayLow: 25050,
    volume: '2M',
    callWall: 25300,
    putWall: 24900,
    gammaFlip: 25050,
    netGex: 150,
    netGexUnit: '₹ Cr',
    dealerBias: 'LONG_GAMMA',
    nearestGex: {
      level: 25050,
      name: 'Gamma Flip',
      type: 'GAMMA_FLIP',
      watchlist: 'SUPPORT',
      distancePts: 50,
      distancePct: 0.2,
      status: 'APPROACHING',
    },
    updatedAt: '15:30:00',
    isSimulated: true,
    candles: [],
  };

  it('triggers critical alert when testing Call Wall within 0.15%', () => {
    const testingInst: Instrument = {
      ...baseInstrument,
      lastPrice: 25280, // Call Wall is 25300 -> diff is 20 pts = 0.08%
      callWall: 25300,
    };

    const alerts = evaluateInstrumentAlerts([testingInst]);
    const callTest = alerts.find((a) => a.type === 'WALL_TESTING' && a.level === 25300);
    expect(callTest).toBeDefined();
    expect(callTest?.severity).toBe('critical');
  });

  it('triggers warning alert when approaching Put Wall within 0.5%', () => {
    const approachingInst: Instrument = {
      ...baseInstrument,
      lastPrice: 24980, // Put Wall is 24900 -> diff is 80 pts = 0.32%
      putWall: 24900,
    };

    const alerts = evaluateInstrumentAlerts([approachingInst]);
    const putApp = alerts.find((a) => a.type === 'WALL_APPROACHING' && a.level === 24900);
    expect(putApp).toBeDefined();
    expect(putApp?.severity).toBe('warning');
  });

  it('triggers critical alert when near Gamma Flip regime pivot within 0.2%', () => {
    const flipInst: Instrument = {
      ...baseInstrument,
      lastPrice: 25060, // Gamma Flip is 25050 -> diff is 10 pts = 0.04%
      gammaFlip: 25050,
    };

    const alerts = evaluateInstrumentAlerts([flipInst]);
    const flipAlert = alerts.find((a) => a.type === 'GAMMA_FLIP_BREACH');
    expect(flipAlert).toBeDefined();
    expect(flipAlert?.severity).toBe('critical');
  });
});
