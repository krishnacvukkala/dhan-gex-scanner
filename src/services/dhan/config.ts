import { DhanConfig } from './types';
import { DhanValidationError } from './errors';

/**
 * Safely loads DhanHQ API credentials from environment variables.
 * Compatible with Vite (import.meta.env) and Node.js (process.env).
 */
export function getEnvVariable(key: string): string {
  // Check Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }

  // Check Node environment
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }

  return '';
}

export function loadDhanConfig(override?: Partial<DhanConfig>): DhanConfig {
  const clientId =
    override?.clientId ||
    getEnvVariable('VITE_DHAN_CLIENT_ID') ||
    getEnvVariable('DHAN_CLIENT_ID');

  const accessToken =
    override?.accessToken ||
    getEnvVariable('VITE_DHAN_ACCESS_TOKEN') ||
    getEnvVariable('DHAN_ACCESS_TOKEN');

  const baseUrl =
    override?.baseUrl ||
    getEnvVariable('VITE_DHAN_BASE_URL') ||
    getEnvVariable('DHAN_BASE_URL') ||
    'https://api.dhan.co/v2';

  const timeoutMs = override?.timeoutMs ?? 10000;
  const maxRetries = override?.maxRetries ?? 3;
  const requestsPerSecond = override?.requestsPerSecond ?? 10;

  return {
    clientId: clientId.trim(),
    accessToken: accessToken.trim(),
    baseUrl: baseUrl.trim().replace(/\/+$/, ''),
    timeoutMs,
    maxRetries,
    requestsPerSecond,
  };
}

export function validateDhanConfig(config: DhanConfig): void {
  if (!config.clientId || config.clientId === 'YOUR_DHAN_CLIENT_ID_HERE') {
    throw new DhanValidationError('Missing valid DHAN_CLIENT_ID. Please configure in .env');
  }

  if (!config.accessToken || config.accessToken === 'YOUR_DHAN_ACCESS_TOKEN_HERE') {
    throw new DhanValidationError('Missing valid DHAN_ACCESS_TOKEN. Please configure in .env');
  }
}

export function isDhanConfigured(config: DhanConfig): boolean {
  try {
    validateDhanConfig(config);
    return true;
  } catch {
    return false;
  }
}

/**
 * Masks credentials for safe debugging/diagnostics.
 * e.g., "1100223344" -> "1100****3344"
 */
export function maskCredential(val: string): string {
  if (!val || val.length <= 6) return '******';
  const prefix = val.slice(0, 3);
  const suffix = val.slice(-3);
  return `${prefix}****${suffix}`;
}
