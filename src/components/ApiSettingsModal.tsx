import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  getStoredCredentials,
  saveCredentials,
  clearCredentials,
  testDhanConnection,
} from '../services/dhan/credentialManager';
import { DhanApiClient } from '../services/dhan/client';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollIntervalMs: number;
  onPollIntervalChange: (intervalMs: number) => void;
  onCredentialsSaved?: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  pollIntervalMs,
  onPollIntervalChange,
  onCredentialsSaved,
}) => {
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(pollIntervalMs);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load stored credentials when modal opens
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredCredentials();
      if (stored) {
        setClientId(stored.clientId || '');
        setAccessToken(stored.accessToken || '');
        setRemember(stored.remember ?? false);
      }
      setSelectedInterval(pollIntervalMs);
      setTestResult(null);
    }
  }, [isOpen, pollIntervalMs]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!clientId.trim() || !accessToken.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both Client ID and Access Token to test connection.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const client = new DhanApiClient({
        clientId: clientId.trim(),
        accessToken: accessToken.trim(),
      });
      const result = await testDhanConnection(client);
      setTestResult(result);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (clientId.trim() && accessToken.trim()) {
      saveCredentials(clientId.trim(), accessToken.trim(), remember);
    }
    onPollIntervalChange(selectedInterval);
    if (onCredentialsSaved) {
      onCredentialsSaved();
    }
    onClose();
  };

  const handleClear = () => {
    clearCredentials();
    setClientId('');
    setAccessToken('');
    setRemember(false);
    setTestResult(null);
    if (onCredentialsSaved) {
      onCredentialsSaved();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="api-settings-modal"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="DhanHQ API Settings"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-title-icon">
              <Key size={18} className="text-cyan" />
            </div>
            <div>
              <h3 className="modal-title">DhanHQ API Configuration</h3>
              <span className="modal-subtitle">
                Configure live market data feeds and polling interval
              </span>
            </div>
          </div>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close API settings"
            data-testid="close-settings-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Security Banner */}
        <div className="modal-security-notice">
          <ShieldCheck size={16} className="text-emerald" />
          <span>
            <strong>Client-Side Only:</strong> Your Dhan credentials are used directly by your browser to authenticate with DhanHQ. They are never sent to any intermediary server or logged.
          </span>
        </div>

        {/* Form Body */}
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="dhan-client-id" className="form-label">
              Dhan Client ID
            </label>
            <input
              id="dhan-client-id"
              type="text"
              className="form-input font-mono"
              placeholder="e.g. 1000000001"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              data-testid="client-id-input"
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="dhan-access-token" className="form-label">
                Dhan Access Token (JWT)
              </label>
              <a
                href="https://dhanhq.co/docs"
                target="_blank"
                rel="noreferrer"
                className="portal-link"
              >
                Get Token <ExternalLink size={11} />
              </a>
            </div>
            <div className="password-input-wrapper">
              <input
                id="dhan-access-token"
                type={showToken ? 'text' : 'password'}
                className="form-input font-mono"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                data-testid="access-token-input"
              />
              <button
                type="button"
                className="toggle-visibility-btn"
                onClick={() => setShowToken(!showToken)}
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="poll-interval-select" className="form-label">
                <Clock size={13} className="inline-icon" /> Polling Frequency
              </label>
              <select
                id="poll-interval-select"
                className="form-select"
                value={selectedInterval}
                onChange={(e) => setSelectedInterval(Number(e.target.value))}
                data-testid="poll-interval-select"
              >
                <option value={5000}>5 seconds (Fast / Active Trading)</option>
                <option value={15000}>15 seconds (Recommended standard)</option>
                <option value={30000}>30 seconds (Conservative)</option>
                <option value={60000}>60 seconds (Low Rate Limit)</option>
              </select>
            </div>

            <div className="form-group remember-toggle-group">
              <label className="checkbox-label" htmlFor="remember-credentials">
                <input
                  id="remember-credentials"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  data-testid="remember-credentials-checkbox"
                />
                <span>Remember on this browser (localStorage)</span>
              </label>
              <span className="checkbox-subtext">
                Unchecked stores credentials in sessionStorage only (cleared on tab close).
              </span>
            </div>
          </div>

          {/* Test Connection Output */}
          {testResult && (
            <div
              className={`test-result-banner ${testResult.success ? 'success' : 'error'}`}
              data-testid="test-result-banner"
            >
              {testResult.success ? (
                <CheckCircle size={16} className="text-emerald" />
              ) : (
                <ShieldAlert size={16} className="text-rose" />
              )}
              <span className="test-result-msg">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-left">
            {(clientId || accessToken) && (
              <button
                type="button"
                className="btn-danger-outline"
                onClick={handleClear}
                data-testid="clear-credentials-btn"
              >
                <Trash2 size={13} />
                <span>Clear Stored</span>
              </button>
            )}
          </div>

          <div className="footer-right">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTestConnection}
              disabled={testing}
              data-testid="test-connection-btn"
            >
              {testing ? (
                <RefreshCw size={13} className="spin" />
              ) : (
                <CheckCircle size={13} />
              )}
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              data-testid="save-settings-btn"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
