import { DhanApiClient } from './client';
import { maskCredential } from './config';

export interface StoredDhanCredentials {
  clientId: string;
  accessToken: string;
  remember: boolean;
}

const STORAGE_KEY_CLIENT_ID = 'dhan_gex_client_id';
const STORAGE_KEY_ACCESS_TOKEN = 'dhan_gex_access_token';
const STORAGE_KEY_REMEMBER = 'dhan_gex_remember';

/**
 * Discovers and retrieves currently configured Dhan credentials.
 * Follows resolution order:
 * 1. Active window.sessionStorage
 * 2. Active window.localStorage (if user opted to remember)
 * 3. Vite environment variables (VITE_DHAN_CLIENT_ID, VITE_DHAN_ACCESS_TOKEN)
 */
export function getStoredCredentials(): StoredDhanCredentials | null {
  try {
    // 1. Session storage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessClientId = window.sessionStorage.getItem(STORAGE_KEY_CLIENT_ID);
      const sessToken = window.sessionStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
      if (sessClientId && sessToken) {
        return {
          clientId: sessClientId.trim(),
          accessToken: sessToken.trim(),
          remember: false,
        };
      }
    }

    // 2. Local storage
    if (typeof window !== 'undefined' && window.localStorage) {
      const localClientId = window.localStorage.getItem(STORAGE_KEY_CLIENT_ID);
      const localToken = window.localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
      if (localClientId && localToken) {
        return {
          clientId: localClientId.trim(),
          accessToken: localToken.trim(),
          remember: true,
        };
      }
    }

    // 3. Environment variables (Vite import.meta.env or Node process.env)
    let envClientId: string | undefined;
    let envToken: string | undefined;

    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envClientId = import.meta.env.VITE_DHAN_CLIENT_ID;
      envToken = import.meta.env.VITE_DHAN_ACCESS_TOKEN;
    }

    if (!envClientId && typeof process !== 'undefined' && process.env) {
      envClientId = process.env.DHAN_CLIENT_ID || process.env.VITE_DHAN_CLIENT_ID;
      envToken = process.env.DHAN_ACCESS_TOKEN || process.env.VITE_DHAN_ACCESS_TOKEN;
    }

    if (envClientId && envToken) {
      return {
        clientId: envClientId.trim(),
        accessToken: envToken.trim(),
        remember: false,
      };
    }
  } catch {
    // Storage access may be restricted in sandboxed iframe environments
  }

  return null;
}

/**
 * Checks if credentials have been configured and are present.
 */
export function hasConfiguredCredentials(): boolean {
  const creds = getStoredCredentials();
  return Boolean(creds?.clientId && creds?.accessToken);
}

/**
 * Saves user credentials in browser storage.
 * If remember is true, stores in localStorage; otherwise stores in sessionStorage and cleans localStorage.
 */
export function saveCredentials(
  clientId: string,
  accessToken: string,
  remember = false
): void {
  const cleanClientId = clientId.trim();
  const cleanToken = accessToken.trim();

  if (typeof window === 'undefined') return;

  if (remember) {
    window.localStorage?.setItem(STORAGE_KEY_CLIENT_ID, cleanClientId);
    window.localStorage?.setItem(STORAGE_KEY_ACCESS_TOKEN, cleanToken);
    window.localStorage?.setItem(STORAGE_KEY_REMEMBER, 'true');
    // Clear session storage to avoid duplication
    window.sessionStorage?.removeItem(STORAGE_KEY_CLIENT_ID);
    window.sessionStorage?.removeItem(STORAGE_KEY_ACCESS_TOKEN);
  } else {
    window.sessionStorage?.setItem(STORAGE_KEY_CLIENT_ID, cleanClientId);
    window.sessionStorage?.setItem(STORAGE_KEY_ACCESS_TOKEN, cleanToken);
    // Clear local storage
    window.localStorage?.removeItem(STORAGE_KEY_CLIENT_ID);
    window.localStorage?.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    window.localStorage?.removeItem(STORAGE_KEY_REMEMBER);
  }
}

/**
 * Clears stored credentials from both sessionStorage and localStorage.
 */
export function clearCredentials(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage?.removeItem(STORAGE_KEY_CLIENT_ID);
  window.sessionStorage?.removeItem(STORAGE_KEY_ACCESS_TOKEN);
  window.localStorage?.removeItem(STORAGE_KEY_CLIENT_ID);
  window.localStorage?.removeItem(STORAGE_KEY_ACCESS_TOKEN);
  window.localStorage?.removeItem(STORAGE_KEY_REMEMBER);
}

/**
 * Masks sensitive access tokens for safe UI display.
 */
export function maskToken(token: string): string {
  return maskCredential(token);
}

/**
 * Validates connection to DhanHQ by fetching a lightweight quote for NIFTY (scrip 13).
 */
export async function testDhanConnection(
  client: DhanApiClient
): Promise<{ success: boolean; message: string; spotPrice?: number }> {
  try {
    const quotes = await client.getQuotes({
      IDX_I: [13],
    });

    const niftyQuote = quotes.data?.IDX_I?.['13'];
    if (niftyQuote && typeof niftyQuote.last_price === 'number') {
      return {
        success: true,
        message: `Successfully connected to DhanHQ. NIFTY 50 Spot: ₹${niftyQuote.last_price.toFixed(2)}`,
        spotPrice: niftyQuote.last_price,
      };
    }

    return {
      success: true,
      message: 'Connected to DhanHQ successfully.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: msg || 'Failed to authenticate with DhanHQ. Verify Client ID and Access Token.',
    };
  }
}
