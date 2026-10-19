/**
 * Token Bucket Rate Limiter
 * Regulates request rates to stay strictly within DhanHQ API rate limits.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRatePerMs: number;
  private lastRefillTimestamp: number;

  constructor(requestsPerSecond = 10, maxBurst = 10) {
    this.maxTokens = maxBurst;
    this.tokens = maxBurst;
    this.refillRatePerMs = requestsPerSecond / 1000;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTimestamp;
    const tokensToAdd = elapsed * this.refillRatePerMs;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  /**
   * Acquires a single execution token.
   * If tokens are depleted, asynchronously sleeps until tokens refill.
   */
  public async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate required wait time for 1 full token
    const deficit = 1 - this.tokens;
    const waitMs = Math.ceil(deficit / this.refillRatePerMs);

    await new Promise((resolve) => setTimeout(resolve, waitMs));

    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }

  /**
   * Returns current available token count.
   */
  public getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Resets the limiter to full capacity (useful for tests).
   */
  public reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTimestamp = Date.now();
  }
}
