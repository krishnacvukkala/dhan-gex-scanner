import { describe, it, expect, vi } from 'vitest';
import {
  DhanApiClient,
  TokenBucketRateLimiter,
  loadDhanConfig,
  validateDhanConfig,
  maskCredential,
  DhanAuthError,
  DhanRateLimitError,
  DhanNotFoundError,
  DhanValidationError,
} from '../services/dhan';

describe('DhanHQ Service - Rate Limiter', () => {
  it('initializes with capacity and depletes tokens on acquire', async () => {
    const limiter = new TokenBucketRateLimiter(5, 5);
    expect(limiter.getAvailableTokens()).toBe(5);

    await limiter.acquire();
    expect(limiter.getAvailableTokens()).toBeLessThan(5);
  });

  it('resets to full token capacity', () => {
    const limiter = new TokenBucketRateLimiter(5, 5);
    limiter.reset();
    expect(limiter.getAvailableTokens()).toBe(5);
  });
});

describe('DhanHQ Service - Config & Security', () => {
  it('masks credentials safely without exposing full token', () => {
    expect(maskCredential('1100223344')).toBe('110****344');
    expect(maskCredential('short')).toBe('******');
  });

  it('throws validation error when credentials are placeholders or empty', () => {
    expect(() =>
      validateDhanConfig({
        clientId: 'YOUR_DHAN_CLIENT_ID_HERE',
        accessToken: 'dummy',
      })
    ).toThrow(DhanValidationError);

    expect(() =>
      validateDhanConfig({
        clientId: '123456',
        accessToken: '',
      })
    ).toThrow(DhanValidationError);
  });

  it('loads valid config object', () => {
    const config = loadDhanConfig({
      clientId: '998877',
      accessToken: 'sample_token_xyz',
    });
    expect(config.clientId).toBe('998877');
    expect(config.accessToken).toBe('sample_token_xyz');
  });
});

describe('DhanHQ Service - API Client (Read-Only Safety & Methods)', () => {
  const validConfig = {
    clientId: 'test_client_id',
    accessToken: 'test_access_token',
    baseUrl: 'https://api.dhan.co/v2',
    timeoutMs: 2000,
    maxRetries: 1,
  };

  it('strictly rejects any order execution or trading endpoint call (Rule 12)', async () => {
    const client = new DhanApiClient(validConfig);
    // @ts-expect-error accessing private method for safety audit
    await expect(client.request('/orders', 'POST')).rejects.toThrow(DhanValidationError);
    // @ts-expect-error accessing private method for safety audit
    await expect(client.request('/trade/place', 'POST')).rejects.toThrow(DhanValidationError);
  });

  it('sends correct authentication headers on read-only requests', async () => {
    let capturedHeaders: Record<string, string> = {};

    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      capturedHeaders = init.headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              last_price: 25150.0,
              oc: {
                '25100.000000': {
                  ce: { last_price: 120, oi: 15000, previous_oi: 12000, volume: 50000, implied_volatility: 12.5 },
                  pe: { last_price: 45, oi: 25000, previous_oi: 22000, volume: 80000, implied_volatility: 13.1 },
                },
              },
            },
          }),
      });
    });

    const client = new DhanApiClient(validConfig, mockFetch as unknown as typeof fetch);

    const result = await client.getOptionChain({
      UnderlyingScrip: 13,
      UnderlyingSeg: 'IDX_I',
      Expiry: '2026-10-29',
    });

    expect(capturedHeaders['access-token']).toBe('test_access_token');
    expect(capturedHeaders['client-id']).toBe('test_client_id');
    expect(result.underlyingPrice).toBe(25150.0);
    expect(result.strikes).toHaveLength(1);
    expect(result.strikes[0].strikePrice).toBe(25100.0);
    expect(result.strikes[0].callOi).toBe(15000);
    expect(result.strikes[0].putOi).toBe(25000);
  });

  it('normalizes option chain and sorts strikes ascending', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'success',
            data: {
              last_price: 25200.0,
              oc: {
                '25300.000000': {
                  ce: { last_price: 50, oi: 40000, previous_oi: 35000, volume: 10000, implied_volatility: 14.0 },
                },
                '25000.000000': {
                  pe: { last_price: 30, oi: 55000, previous_oi: 50000, volume: 15000, implied_volatility: 13.5 },
                },
                '25100.000000': {
                  ce: { last_price: 110, oi: 20000, previous_oi: 18000, volume: 8000, implied_volatility: 13.0 },
                  pe: { last_price: 70, oi: 30000, previous_oi: 28000, volume: 9000, implied_volatility: 13.2 },
                },
              },
            },
          }),
      });
    });

    const client = new DhanApiClient(validConfig, mockFetch as unknown as typeof fetch);
    const result = await client.getOptionChain({
      UnderlyingScrip: 13,
      UnderlyingSeg: 'IDX_I',
      Expiry: '2026-10-29',
    });

    expect(result.strikes.map((s) => s.strikePrice)).toEqual([25000, 25100, 25300]);
  });

  it('throws DhanAuthError on HTTP 401', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });
    });

    const client = new DhanApiClient(validConfig, mockFetch as unknown as typeof fetch);
    await expect(
      client.getQuotes({ IDX_I: [13] })
    ).rejects.toThrow(DhanAuthError);
  });

  it('throws DhanNotFoundError on HTTP 404', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Security ID not found' }),
      });
    });

    const client = new DhanApiClient(validConfig, mockFetch as unknown as typeof fetch);
    await expect(
      client.getQuotes({ IDX_I: [999999] })
    ).rejects.toThrow(DhanNotFoundError);
  });

  it('handles HTTP 429 rate limit backoff and throws DhanRateLimitError on persistent limit', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 429,
        headers: {
          get: (header: string) => (header === 'Retry-After' ? '0.01' : null),
        },
        json: () => Promise.resolve({ message: 'Too Many Requests' }),
      });
    });

    const client = new DhanApiClient(validConfig, mockFetch as unknown as typeof fetch);
    await expect(
      client.getExpiryList(13, 'IDX_I')
    ).rejects.toThrow(DhanRateLimitError);
  });

  it('fetches intraday candlestick bars correctly', async () => {
    const mockCandles = {
      open: [25100, 25120],
      high: [25130, 25140],
      low: [25090, 25110],
      close: [25120, 25135],
      volume: [1500, 2200],
      timestamp: [1729314900, 1729315200],
    };

    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCandles),
      });
    });

    const client = new DhanApiClient(validConfig, mockFetch as unknown as typeof fetch);
    const candles = await client.getIntradayCandles({
      securityId: '13',
      exchangeSegment: 'IDX_I',
      instrument: 'INDEX',
      interval: '5',
      fromDate: '2026-10-19 09:15:00',
      toDate: '2026-10-19 15:30:00',
    });

    expect(candles.close).toEqual([25120, 25135]);
    expect(candles.volume).toEqual([1500, 2200]);
  });
});
