import { useState, useEffect, useRef, useCallback } from 'react';
import { Instrument, ConnectionStatus } from '../types';
import { DhanApiClient } from '../services/dhan/client';
import { getStoredCredentials } from '../services/dhan/credentialManager';
import {
  DHAN_REGISTERED_INSTRUMENTS,
  RegisteredInstrument,
} from '../services/dhan/instruments';
import { calculateOptionChainGex } from '../services/gex/engine';
import { adaptGexResultToInstrument } from '../services/dhan/adapter';
import { DhanRateLimitError, DhanAuthError } from '../services/dhan/errors';
import { loadGitSnapshot, convertSnapshotToInstrument } from '../services/dhan/snapshotLoader';

export interface UseLiveGexScannerOptions {
  enabled?: boolean;
  defaultPollIntervalMs?: number;
  instrumentsToScan?: RegisteredInstrument[];
}

export interface UseLiveGexScannerReturn {
  isLiveMode: boolean;
  setIsLiveMode: (enabled: boolean) => void;
  connectionStatus: ConnectionStatus;
  liveInstruments: Instrument[];
  snapshotInstruments: Instrument[];
  snapshotTimestamp: string | null;
  sourceMode: 'LIVE_DHAN' | 'GIT_SNAPSHOT' | 'SIMULATED';
  lastSyncTime: Date | null;
  isPolling: boolean;
  pollIntervalMs: number;
  setPollIntervalMs: (interval: number) => void;
  errorMessage: string | null;
  refreshNow: () => Promise<void>;
  expiryDate: string;
  setExpiryDate: (expiry: string) => void;
}

/**
 * Calculates upcoming Indian F&O contract expiry (nearest Thursday at 15:30 IST).
 */
export function getNearestThursdayExpiry(refDate = new Date()): string {
  const d = new Date(refDate);
  // Target Thursday is day 4 (Sunday=0, Monday=1, ..., Thursday=4)
  const day = d.getDay();
  let daysUntilThursday = (4 - day + 7) % 7;
  
  // If today is Thursday after 15:30 IST, roll to next Thursday
  const istHours = d.getUTCHours() + 5 + (d.getUTCMinutes() + 30) / 60;
  if (day === 4 && istHours >= 15.5) {
    daysUntilThursday = 7;
  }

  d.setDate(d.getDate() + daysUntilThursday);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function useLiveGexScanner(
  options: UseLiveGexScannerOptions = {}
): UseLiveGexScannerReturn {
  const [isLiveMode, setIsLiveMode] = useState<boolean>(options.enabled ?? false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [liveInstruments, setLiveInstruments] = useState<Instrument[]>([]);
  const [snapshotInstruments, setSnapshotInstruments] = useState<Instrument[]>([]);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(
    options.defaultPollIntervalMs ?? 30000
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<string>(getNearestThursdayExpiry());

  // Load Git snapshot on mount
  useEffect(() => {
    let mounted = true;
    loadGitSnapshot().then((snapshot) => {
      if (!mounted || !snapshot) return;
      const instruments: Instrument[] = Object.values(snapshot.indices).map((idx) =>
        convertSnapshotToInstrument(idx)
      );
      if (instruments.length > 0) {
        setSnapshotInstruments(instruments);
        setSnapshotTimestamp(snapshot.generatedAt);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const activeInstruments = options.instrumentsToScan ?? DHAN_REGISTERED_INSTRUMENTS;
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingRef = useRef<boolean>(false);

  /**
   * Performs a single full scan cycle of active instruments.
   */
  const executeScan = useCallback(async () => {
    if (isExecutingRef.current) return;
    
    const creds = getStoredCredentials();
    if (!creds || !creds.clientId || !creds.accessToken) {
      setConnectionStatus('DISCONNECTED');
      setErrorMessage('DhanHQ credentials not configured. Open API Settings to connect.');
      setIsPolling(false);
      return;
    }

    isExecutingRef.current = true;
    setIsPolling(true);
    setConnectionStatus('CONNECTING');
    setErrorMessage(null);

    const client = new DhanApiClient({
      clientId: creds.clientId,
      accessToken: creds.accessToken,
    });

    const updatedInstruments: Instrument[] = [];

    try {
      // 1. Fetch available expiry list if possible
      try {
        const primary = activeInstruments[0];
        if (primary) {
          const expiries = await client.getExpiryList(
            primary.underlyingScrip,
            primary.exchangeSegment,
          );
          if (expiries && expiries.length > 0) {
            setExpiryDate(expiries[0]);
          }
        }
      } catch {
        // Fall back to calculated nearest Thursday expiry
      }

      // 2. Scan instruments sequentially through rate-limited client
      for (const inst of activeInstruments) {
        try {
          // Fetch option chain
          const chain = await client.getOptionChain({
            UnderlyingScrip: inst.underlyingScrip,
            UnderlyingSeg: inst.exchangeSegment,
            Expiry: expiryDate,
          });

          // Run pure Stage 3 Conventional GEX Engine
          const gexResult = calculateOptionChainGex(chain, {
            symbol: inst.symbol,
            lotSize: inst.lotSize,
          });

          // Adapt to UI Instrument
          const adapted = adaptGexResultToInstrument(inst, gexResult);
          updatedInstruments.push(adapted);
        } catch (itemErr: unknown) {
          console.warn(`[LiveGexScanner] Failed scanning ${inst.symbol}:`, itemErr);
        }
      }

      if (updatedInstruments.length > 0) {
        setLiveInstruments(updatedInstruments);
        setLastSyncTime(new Date());
        setConnectionStatus('CONNECTED');
        setErrorMessage(null);
      } else {
        setConnectionStatus('ERROR');
        setErrorMessage('Unable to retrieve option chain data. Verify market hours or API permissions.');
      }
    } catch (err: unknown) {
      if (err instanceof DhanRateLimitError) {
        setConnectionStatus('RATE_LIMITED');
        setErrorMessage('DhanHQ rate limit reached. Pausing until cooldown.');
      } else if (err instanceof DhanAuthError) {
        setConnectionStatus('ERROR');
        setErrorMessage('Authentication failed (401/403). Check Client ID and Access Token.');
      } else {
        setConnectionStatus('ERROR');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to DhanHQ.');
      }
    } finally {
      isExecutingRef.current = false;
      setIsPolling(false);
    }
  }, [activeInstruments, expiryDate]);

  /**
   * Manual refresh trigger.
   */
  const refreshNow = useCallback(async () => {
    await executeScan();
  }, [executeScan]);

  /**
   * Main polling lifecycle effect with tab visibility listener.
   */
  useEffect(() => {
    if (!isLiveMode) {
      setConnectionStatus('DISCONNECTED');
      setIsPolling(false);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Initial scan
    executeScan();

    // Setup polling timer
    pollTimerRef.current = setInterval(() => {
      // Only execute if browser tab is active
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      executeScan();
    }, pollIntervalMs);

    // Visibility change handler to resume polling immediately when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLiveMode) {
        executeScan();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLiveMode, pollIntervalMs, executeScan]);

  const sourceMode: 'LIVE_DHAN' | 'GIT_SNAPSHOT' | 'SIMULATED' =
    isLiveMode && liveInstruments.length > 0
      ? 'LIVE_DHAN'
      : snapshotInstruments.length > 0
      ? 'GIT_SNAPSHOT'
      : 'SIMULATED';

  return {
    isLiveMode,
    setIsLiveMode,
    connectionStatus,
    liveInstruments,
    snapshotInstruments,
    snapshotTimestamp,
    sourceMode,
    lastSyncTime,
    isPolling,
    pollIntervalMs,
    setPollIntervalMs,
    errorMessage,
    refreshNow,
    expiryDate,
    setExpiryDate,
  };
}
