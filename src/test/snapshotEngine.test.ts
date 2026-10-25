import { describe, it, expect, vi } from 'vitest';
import { generateMarketSnapshot, GexSnapshotPayload } from '../services/dhan/snapshotEngine';
import { DhanApiClient } from '../services/dhan/client';

describe('snapshotEngine', () => {
  it('generates a valid snapshot payload structure for standard indices', async () => {
    const mockClient = {
      getOptionChain: vi.fn().mockResolvedValue({
        underlyingScrip: 13,
        underlyingPrice: 24500,
        expiry: '2026-10-25',
        timestamp: '2026-10-25T10:00:00Z',
        strikes: [
          {
            strikePrice: 24400,
            callPrice: 150,
            callOi: 5000,
            callPreviousOi: 5000,
            callVolume: 1000,
            callIv: 0.15,
            putPrice: 40,
            putOi: 15000,
            putPreviousOi: 15000,
            putVolume: 2000,
            putIv: 0.15,
          },
          {
            strikePrice: 24500,
            callPrice: 80,
            callOi: 25000,
            callPreviousOi: 25000,
            callVolume: 5000,
            callIv: 0.15,
            putPrice: 75,
            putOi: 25000,
            putPreviousOi: 25000,
            putVolume: 4500,
            putIv: 0.15,
          },
          {
            strikePrice: 24600,
            callPrice: 35,
            callOi: 18000,
            callPreviousOi: 18000,
            callVolume: 3000,
            callIv: 0.15,
            putPrice: 130,
            putOi: 6000,
            putPreviousOi: 6000,
            putVolume: 1500,
            putIv: 0.15,
          },
        ],
      }),
    } as unknown as DhanApiClient;

    const payload: GexSnapshotPayload = await generateMarketSnapshot(mockClient, ['NIFTY 50']);

    expect(payload).toBeDefined();
    expect(payload.schemaVersion).toBe('1.0');
    expect(payload.indices['NIFTY 50']).toBeDefined();
    expect(payload.indices['NIFTY 50'].spotPrice).toBe(24500);
    expect(payload.indices['NIFTY 50'].callWall).toBeGreaterThan(0);
    expect(payload.indices['NIFTY 50'].putWall).toBeGreaterThan(0);
    expect(payload.indices['NIFTY 50'].strikes.length).toBeGreaterThan(0);
  });

  it('generates simulated snapshot fallback when no credentials are provided', async () => {
    const payload = await generateMarketSnapshot(null);
    expect(payload.mode).toBe('SIMULATED_SNAPSHOT');
    expect(payload.indices['NIFTY 50']).toBeDefined();
    expect(payload.indices['BANK NIFTY']).toBeDefined();
  });
});
