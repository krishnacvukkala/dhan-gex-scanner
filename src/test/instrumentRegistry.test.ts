import { describe, it, expect } from 'vitest';
import {
  getRegisteredInstruments,
  getInstrumentBySymbol,
  getInstrumentByScrip,
} from '../services/dhan/instruments';

describe('DhanHQ Instrument Registry', () => {
  it('should return all registered instruments with valid lot sizes and scrip IDs', () => {
    const list = getRegisteredInstruments();
    expect(list.length).toBeGreaterThanOrEqual(10);

    for (const inst of list) {
      expect(inst.id).toBeTruthy();
      expect(inst.symbol).toBeTruthy();
      expect(inst.underlyingScrip).toBeGreaterThan(0);
      expect(inst.lotSize).toBeGreaterThan(0);
      expect(inst.strikeStep).toBeGreaterThan(0);
      expect(['IDX_I', 'NSE_EQ', 'BSE_EQ']).toContain(inst.exchangeSegment);
      expect(['INDEX', 'STOCK']).toContain(inst.type);
    }
  });

  it('should look up instrument by symbol case-insensitively', () => {
    const nifty = getInstrumentBySymbol('nifty');
    expect(nifty).toBeDefined();
    expect(nifty?.symbol).toBe('NIFTY');
    expect(nifty?.underlyingScrip).toBe(13);
    expect(nifty?.type).toBe('INDEX');

    const reliance = getInstrumentBySymbol('RELIANCE');
    expect(reliance).toBeDefined();
    expect(reliance?.underlyingScrip).toBe(2885);
    expect(reliance?.type).toBe('STOCK');

    const unknown = getInstrumentBySymbol('NONEXISTENT');
    expect(unknown).toBeUndefined();
  });

  it('should look up instrument by Dhan underlying scrip ID', () => {
    const banknifty = getInstrumentByScrip(25);
    expect(banknifty).toBeDefined();
    expect(banknifty?.symbol).toBe('BANKNIFTY');

    const tcs = getInstrumentByScrip(11536);
    expect(tcs).toBeDefined();
    expect(tcs?.symbol).toBe('TCS');

    const unknown = getInstrumentByScrip(9999999);
    expect(unknown).toBeUndefined();
  });
});
