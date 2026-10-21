import { useState, useEffect, useRef } from 'react';
import { Instrument } from '../types';
import { GexAlert, evaluateInstrumentAlerts, playAlertChime } from '../services/alerts/alertEngine';

export function useGexAlerts(instruments: Instrument[]) {
  const [alerts, setAlerts] = useState<GexAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const seenAlertKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!instruments || instruments.length === 0) return;

    const detected = evaluateInstrumentAlerts(instruments);
    if (detected.length === 0) return;

    let hasNewCritical = false;

    setAlerts((prev) => {
      const newItems: GexAlert[] = [];

      for (const alert of detected) {
        // Debounce alert key per symbol + type
        const key = `${alert.symbol}-${alert.type}-${alert.level}`;
        if (!seenAlertKeysRef.current.has(key)) {
          seenAlertKeysRef.current.add(key);
          newItems.push(alert);
          if (alert.severity === 'critical') {
            hasNewCritical = true;
          }
        }
      }

      if (newItems.length === 0) return prev;

      setUnreadCount((c) => c + newItems.length);
      const combined = [...newItems, ...prev];
      return combined.slice(0, 30); // Keep max 30 recent alerts
    });

    if (hasNewCritical && soundEnabled) {
      playAlertChime();
    }
  }, [instruments, soundEnabled]);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const clearAlerts = () => {
    setAlerts([]);
    setUnreadCount(0);
    seenAlertKeysRef.current.clear();
  };

  return {
    alerts,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    markAllAsRead,
    clearAlerts,
  };
}
