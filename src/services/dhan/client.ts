import {
  DhanConfig,
  DhanOptionChainRequest,
  DhanOptionChainResponse,
  NormalizedOptionChain,
  NormalizedOptionStrike,
  DhanQuoteRequest,
  DhanQuoteResponse,
  DhanIntradayCandleRequest,
  DhanIntradayCandleResponse,
  DhanExchangeSegment,
} from './types';
import { loadDhanConfig, validateDhanConfig } from './config';
import { TokenBucketRateLimiter } from './rateLimiter';
import {
  DhanApiError,
  DhanAuthError,
  DhanRateLimitError,
  DhanNotFoundError,
  DhanValidationError,
} from './errors';

/**
 * DhanHQ API v2 Client
 * Provides read-only market quotes, option chains, and historical intraday charts.
 * Adheres strictly to non-trading, read-only decision-support constraints.
 */
export class DhanApiClient {
  private readonly config: DhanConfig;
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly fetchFn: typeof fetch;

  constructor(config?: Partial<DhanConfig>, customFetch?: typeof fetch) {
    this.config = loadDhanConfig(config);
    this.rateLimiter = new TokenBucketRateLimiter(
      this.config.requestsPerSecond ?? 10,
      this.config.requestsPerSecond ?? 10
    );
    this.fetchFn = customFetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (null as unknown as typeof fetch));
  }

  /**
   * Internal request executor with rate limiting and exponential backoff.
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: unknown,
    attempt = 1
  ): Promise<T> {
    // Safety verification: strictly read-only check
    const normalized = endpoint.toLowerCase();
    if (
      normalized.includes('/orders') ||
      normalized.includes('/trade') ||
      normalized.includes('/place') ||
      normalized.includes('/cancel') ||
      normalized.includes('/modify')
    ) {
      throw new DhanValidationError(`Execution endpoint '${endpoint}' is strictly prohibited.`);
    }

    // Validate config presence
    validateDhanConfig(this.config);

    // Rate limiter throttle
    await this.rateLimiter.acquire();

    const url = `${this.config.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'access-token': this.config.accessToken,
      'client-id': this.config.clientId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle HTTP status codes
      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new DhanAuthError('Authentication failed with DhanHQ API. Verify access token and client ID.', endpoint, errorData);
      }

      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}));
        throw new DhanNotFoundError(`DhanHQ resource at ${endpoint} not found.`, endpoint, errorData);
      }

      if (response.status === 429) {
        const retryAfterHeader = response.headers?.get?.('Retry-After');
        const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 1000 * Math.pow(2, attempt);

        if (attempt <= (this.config.maxRetries ?? 3)) {
          await new Promise((res) => setTimeout(res, retryAfterMs));
          return this.request<T>(endpoint, method, body, attempt + 1);
        }

        throw new DhanRateLimitError('Rate limit exceeded on DhanHQ API.', retryAfterMs, endpoint);
      }

      // Handle transient server errors (500, 502, 503, 504) with backoff
      if (response.status >= 500 && attempt <= (this.config.maxRetries ?? 3)) {
        const backoffMs = 500 * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, backoffMs));
        return this.request<T>(endpoint, method, body, attempt + 1);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new DhanApiError(
          `DhanHQ API request to ${endpoint} failed with HTTP ${response.status}`,
          response.status,
          endpoint,
          errorData
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeout);

      if (err instanceof DhanApiError) {
        throw err;
      }

      if ((err as Error)?.name === 'AbortError') {
        throw new DhanApiError(`DhanHQ API request to ${endpoint} timed out after ${this.config.timeoutMs}ms`, 408, endpoint);
      }

      // Network / connection error with retry
      if (attempt <= (this.config.maxRetries ?? 3)) {
        const backoffMs = 500 * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, backoffMs));
        return this.request<T>(endpoint, method, body, attempt + 1);
      }

      throw new DhanApiError(
        `DhanHQ network failure on ${endpoint}: ${(err as Error)?.message || 'Unknown network error'}`,
        0,
        endpoint
      );
    }
  }

  /**
   * Fetches the full Option Chain for an underlying asset and normalizes it.
   */
  public async getOptionChain(req: DhanOptionChainRequest): Promise<NormalizedOptionChain> {
    if (!req.UnderlyingScrip || !req.UnderlyingSeg || !req.Expiry) {
      throw new DhanValidationError('UnderlyingScrip, UnderlyingSeg, and Expiry are required for option chain.');
    }

    const rawResponse = await this.request<DhanOptionChainResponse>(
      '/optionchain',
      'POST',
      req
    );

    const strikes: NormalizedOptionStrike[] = [];
    const ocData = rawResponse?.data?.oc || {};

    // Sort strikes ascending
    const sortedStrikeKeys = Object.keys(ocData).sort((a, b) => parseFloat(a) - parseFloat(b));

    for (const strikeKey of sortedStrikeKeys) {
      const strikePrice = parseFloat(strikeKey);
      const item = ocData[strikeKey];

      strikes.push({
        strikePrice,
        callPrice: item.ce?.last_price ?? 0,
        callOi: item.ce?.oi ?? 0,
        callPreviousOi: item.ce?.previous_oi ?? 0,
        callVolume: item.ce?.volume ?? 0,
        callIv: item.ce?.implied_volatility ?? 0,
        putPrice: item.pe?.last_price ?? 0,
        putOi: item.pe?.oi ?? 0,
        putPreviousOi: item.pe?.previous_oi ?? 0,
        putVolume: item.pe?.volume ?? 0,
        putIv: item.pe?.implied_volatility ?? 0,
      });
    }

    return {
      underlyingScrip: req.UnderlyingScrip,
      underlyingPrice: rawResponse?.data?.last_price ?? 0,
      expiry: req.Expiry,
      strikes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetches live market quotes for given exchange segments and security IDs.
   */
  public async getQuotes(req: DhanQuoteRequest): Promise<DhanQuoteResponse> {
    return this.request<DhanQuoteResponse>('/marketfeed/quote', 'POST', req);
  }

  /**
   * Fetches historical 5-minute (or other interval) candlestick bars.
   */
  public async getIntradayCandles(req: DhanIntradayCandleRequest): Promise<DhanIntradayCandleResponse> {
    return this.request<DhanIntradayCandleResponse>('/charts/intraday', 'POST', req);
  }

  /**
   * Fetches available option chain expiry dates for an underlying scrip.
   */
  public async getExpiryList(
    underlyingScrip: number,
    underlyingSeg: DhanExchangeSegment
  ): Promise<string[]> {
    interface ExpiryResponse {
      data?: string[];
      status: string;
    }

    const response = await this.request<ExpiryResponse>('/optionchain/expirylist', 'POST', {
      UnderlyingScrip: underlyingScrip,
      UnderlyingSeg: underlyingSeg,
    });

    return response?.data || [];
  }
}
