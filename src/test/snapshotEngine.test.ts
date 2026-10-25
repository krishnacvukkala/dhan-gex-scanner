import { describe, it, expect, vi } from 'vitest';
import { generateMarketSnapshot, GexSnapshotPayload } from '../services/dhan/snapshotEngine';
import { DhanApiClient } from '../services/dhan/client';

describe('snapshotEngine', () => {
  it('generates a valid snapshot payload structure for standard indices', async () => {
    const mockClient = {
      getQuotes: vi.fn().mockResolvedValue({
        data: {
          IDX_I: {
            '13': { last_price: 24500, volume: 1000000 },
            '25': { last_price: 52000, volume: 500000 },
          },
        },
      }),
      getOptionChain: vi.fn().mockResolvedValue({
        data: {
          data: {
            spot: 24500,
            oc: {
              '24400.000000': {
                ce: { oi: 5000, last_price: 150, volume: 1000 },
                pe: { oi: 15000, last_price: 40, volume: 2000 },
              },
              '24500.000000': {
                ce: { oi: 25000, last_price: 80, volume: 5000 },
                pe: { oi: 25000, last_price: 75, volume: 4500 },
              },
              '24600.000000': {
                ce: { oi: 18000, last_price: 35, volume: 3000 },
                pe: { oi: 6000, last_price: 130, volume: 1500 },
              },
            },
          },
        },
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
