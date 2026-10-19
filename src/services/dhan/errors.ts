/**
 * Typed Error Hierarchy for DhanHQ API Client
 */

export class DhanApiError extends Error {
  public readonly statusCode?: number;
  public readonly endpoint?: string;
  public readonly responseBody?: unknown;

  constructor(message: string, statusCode?: number, endpoint?: string, responseBody?: unknown) {
    super(message);
    this.name = 'DhanApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, DhanApiError.prototype);
  }
}

export class DhanAuthError extends DhanApiError {
  constructor(message = 'Invalid or expired DhanHQ access token or client ID', endpoint?: string, responseBody?: unknown) {
    super(message, 401, endpoint, responseBody);
    this.name = 'DhanAuthError';
    Object.setPrototypeOf(this, DhanAuthError.prototype);
  }
}

export class DhanRateLimitError extends DhanApiError {
  public readonly retryAfterMs: number;

  constructor(message = 'DhanHQ API rate limit exceeded (HTTP 429)', retryAfterMs = 1000, endpoint?: string, responseBody?: unknown) {
    super(message, 429, endpoint, responseBody);
    this.name = 'DhanRateLimitError';
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, DhanRateLimitError.prototype);
  }
}

export class DhanNotFoundError extends DhanApiError {
  constructor(message = 'Requested DhanHQ security or option chain data not found', endpoint?: string, responseBody?: unknown) {
    super(message, 404, endpoint, responseBody);
    this.name = 'DhanNotFoundError';
    Object.setPrototypeOf(this, DhanNotFoundError.prototype);
  }
}

export class DhanMarketClosedError extends DhanApiError {
  constructor(message = 'Market is closed or data feed is currently unavailable for requested instrument', endpoint?: string, responseBody?: unknown) {
    super(message, 204, endpoint, responseBody);
    this.name = 'DhanMarketClosedError';
    Object.setPrototypeOf(this, DhanMarketClosedError.prototype);
  }
}

export class DhanValidationError extends DhanApiError {
  constructor(message: string, endpoint?: string) {
    super(message, 400, endpoint);
    this.name = 'DhanValidationError';
    Object.setPrototypeOf(this, DhanValidationError.prototype);
  }
}
