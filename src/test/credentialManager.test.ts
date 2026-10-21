import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredCredentials,
  saveCredentials,
  clearCredentials,
  hasConfiguredCredentials,
  maskToken,
  testDhanConnection,
} from '../services/dhan/credentialManager';
import { DhanApiClient } from '../services/dhan/client';

describe('Credential Manager', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('should return null when no credentials stored and env is empty', () => {
    expect(getStoredCredentials()).toBeNull();
    expect(hasConfiguredCredentials()).toBe(false);
  });

  it('should save and retrieve credentials in sessionStorage by default', () => {
    saveCredentials('client-123', 'token-abc', false);

    const creds = getStoredCredentials();
    expect(creds).not.toBeNull();
    expect(creds?.clientId).toBe('client-123');
    expect(creds?.accessToken).toBe('token-abc');
    expect(creds?.remember).toBe(false);
    expect(hasConfiguredCredentials()).toBe(true);

    expect(window.sessionStorage.getItem('dhan_gex_client_id')).toBe('client-123');
    expect(window.localStorage.getItem('dhan_gex_client_id')).toBeNull();
  });

  it('should save credentials in localStorage when remember is true', () => {
    saveCredentials('client-999', 'token-xyz', true);

    const creds = getStoredCredentials();
    expect(creds).not.toBeNull();
    expect(creds?.clientId).toBe('client-999');
    expect(creds?.accessToken).toBe('token-xyz');
    expect(creds?.remember).toBe(true);

    expect(window.localStorage.getItem('dhan_gex_client_id')).toBe('client-999');
  });

  it('should clear credentials from all storages', () => {
    saveCredentials('client-123', 'token-abc', true);
    expect(hasConfiguredCredentials()).toBe(true);

    clearCredentials();
    expect(hasConfiguredCredentials()).toBe(false);
    expect(getStoredCredentials()).toBeNull();
  });

  it('should safely mask credentials', () => {
    const masked = maskToken('my-secret-access-token-123456');
    expect(masked).toContain('****');
    expect(masked).not.toBe('my-secret-access-token-123456');
  });

  it('should test connection successfully with valid quote response', async () => {
    const mockClient = {
      getQuotes: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          IDX_I: {
            '13': {
              last_price: 24850.5,
              volume: 1000000,
            },
          },
        },
      }),
    } as unknown as DhanApiClient;

    const res = await testDhanConnection(mockClient);
    expect(res.success).toBe(true);
    expect(res.spotPrice).toBe(24850.5);
    expect(res.message).toContain('24850.50');
  });

  it('should report failure gracefully when API call rejects', async () => {
    const mockClient = {
      getQuotes: vi.fn().mockRejectedValue(new Error('Invalid access token (401)')),
    } as unknown as DhanApiClient;

    const res = await testDhanConnection(mockClient);
    expect(res.success).toBe(false);
    expect(res.message).toContain('Invalid access token');
  });
});
