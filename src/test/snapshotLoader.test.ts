import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadGitSnapshot, convertSnapshotToInstrument } from '../services/dhan/snapshotLoader';
import { GexSnapshotPayload, IndexSnapshotData } from '../services/dhan/snapshotEngine';

describe('snapshotLoader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and returns latest git snapshot payload', async () => {
    const mockPayload: GexSnapshotPayload = {
      schemaVersion: '1.0',
      mode: 'LIVE_DHAN_SNAPSHOT',
      generatedAt: '2026-10-25T15:35:00.000Z',
      indices: {
        'NIFTY 50': {
          symbol: 'NIFTY',
          name: 'NIFTY 50',
          securityId: 13,
          spotPrice: 24500,
          timestamp: '2026-10-25T15:35:00.000Z',
          netGex: 120,
          callGex: 200,
          putGex: -80,
          gammaFlip: 24450,
          callWall: 24600,
          putWall: 24300,
          netDexCr: 50,
          pinStrikes: [{ strike: 24500, probability: 35.5 }],
          strikes: [],
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockPayload),
    });

    const result = await loadGitSnapshot();
    expect(result).toEqual(mockPayload);
  });

  it('converts snapshot index data to active instrument model', () => {
    const indexData: IndexSnapshotData = {
      symbol: 'NIFTY',
      name: 'NIFTY 50',
      securityId: 13,
      spotPrice: 24500,
      timestamp: '2026-10-25T15:35:00.000Z',
      netGex: 120,
      callGex: 200,
      putGex: -80,
      gammaFlip: 24450,
      callWall: 24600,
      putWall: 24300,
      netDexCr: 50,
      pinStrikes: [{ strike: 24500, probability: 35.5 }],
      strikes: [],
    };

    const inst = convertSnapshotToInstrument(indexData);
    expect(inst.symbol).toBe('NIFTY');
    expect(inst.lastPrice).toBe(24500);
    expect(inst.callWall).toBe(24600);
    expect(inst.putWall).toBe(24300);
    expect(inst.gammaFlip).toBe(24450);
    expect(inst.netGex).toBe(120);
    expect(inst.isSimulated).toBe(false);
  });
});
