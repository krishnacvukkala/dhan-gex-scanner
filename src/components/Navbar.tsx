import React from 'react';
import { ViewState, ConnectionStatus } from '../types';
import {
  Activity,
  Search,
  AlertCircle,
  RefreshCw,
  Settings,
  Radio,
  Zap,
} from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewState: ViewState;
  onViewStateChange: (state: ViewState) => void;
  isLiveMode: boolean;
  onToggleLiveMode: (isLive: boolean) => void;
  connectionStatus: ConnectionStatus;
  onOpenSettings: () => void;
  onRefreshNow?: () => void;
  isPolling?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  viewState,
  onViewStateChange,
  isLiveMode,
  onToggleLiveMode,
  connectionStatus,
  onOpenSettings,
  onRefreshNow,
  isPolling = false,
}) => {
  const getStatusDotClass = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return 'dot-connected';
      case 'CONNECTING':
        return 'dot-connecting';
      case 'RATE_LIMITED':
        return 'dot-rate-limited';
      case 'ERROR':
        return 'dot-error';
      case 'DISCONNECTED':
      default:
        return 'dot-disconnected';
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return 'Live Feed';
      case 'CONNECTING':
        return 'Syncing...';
      case 'RATE_LIMITED':
        return 'Rate Limited';
      case 'ERROR':
        return 'Auth / Conn Error';
      case 'DISCONNECTED':
      default:
        return 'Disconnected';
    }
  };

  return (
    <header className="app-navbar" data-testid="app-navbar">
      <div className="navbar-left">
        <div className="brand-badge">
          <div className="brand-icon">
            <Activity size={20} className="text-cyan" />
          </div>
          <div>
            <h1 className="brand-title">Dhan GEX Scanner</h1>
            <span className="brand-subtitle">Gamma Exposure & Key Structural Levels</span>
          </div>
        </div>

        {isLiveMode ? (
          <div
            className={`connection-status-badge ${getStatusDotClass()}`}
            title={`Status: ${connectionStatus}`}
            data-testid="connection-status-badge"
          >
            <span className="status-dot"></span>
            <span className="status-label">{getStatusLabel()}</span>
          </div>
        ) : (
          <div className="mock-banner-tag" title="Stage 1 & 3: Simulated mock dataset">
            <span className="mock-pulse"></span>
            <span>SIMULATED DATA ONLY</span>
          </div>
        )}
      </div>

      <div className="navbar-center">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search symbol (e.g. NIFTY, TCS)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="symbol-search-input"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {/* Mode Switcher: Simulated vs Live */}
        <div className="mode-toggle-group" data-testid="mode-toggle-group">
          <button
            type="button"
            className={`mode-toggle-btn ${!isLiveMode ? 'active' : ''}`}
            onClick={() => onToggleLiveMode(false)}
            data-testid="mode-btn-simulated"
            title="Use deterministic simulated options and candle data"
          >
            <Zap size={13} />
            <span>Simulated</span>
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${isLiveMode ? 'active live-active' : ''}`}
            onClick={() => onToggleLiveMode(true)}
            data-testid="mode-btn-live"
            title="Connect directly to DhanHQ option chain API"
          >
            <Radio size={13} className={isLiveMode ? 'pulse-icon' : ''} />
            <span>Live Dhan</span>
          </button>
        </div>

        {/* Live Controls: Refresh & API Settings */}
        {isLiveMode && onRefreshNow && (
          <button
            type="button"
            className="icon-action-btn"
            onClick={onRefreshNow}
            disabled={isPolling}
            title="Refresh option chains now"
            data-testid="manual-refresh-btn"
            aria-label="Refresh live data"
          >
            <RefreshCw size={15} className={isPolling ? 'spin text-cyan' : ''} />
          </button>
        )}

        <button
          type="button"
          className="icon-action-btn"
          onClick={onOpenSettings}
          title="Configure DhanHQ API Credentials & Polling"
          data-testid="open-api-settings-btn"
          aria-label="API Settings"
        >
          <Settings size={16} />
        </button>

        {/* State Toggle for Review & Testing */}
        <div className="state-switcher" title="Toggle simulation states to review loading, empty, and error behaviors">
          <span className="state-switcher-label">View:</span>
          <button
            className={`state-btn ${viewState === 'NORMAL' ? 'active' : ''}`}
            onClick={() => onViewStateChange('NORMAL')}
            data-testid="state-btn-normal"
          >
            Normal
          </button>
          <button
            className={`state-btn ${viewState === 'LOADING' ? 'active' : ''}`}
            onClick={() => onViewStateChange('LOADING')}
            data-testid="state-btn-loading"
          >
            <RefreshCw size={12} className={viewState === 'LOADING' ? 'spin' : ''} />
            Loading
          </button>
          <button
            className={`state-btn ${viewState === 'ERROR' ? 'active' : ''}`}
            onClick={() => onViewStateChange('ERROR')}
            data-testid="state-btn-error"
          >
            <AlertCircle size={12} />
            Error
          </button>
          <button
            className={`state-btn ${viewState === 'EMPTY' ? 'active' : ''}`}
            onClick={() => onViewStateChange('EMPTY')}
            data-testid="state-btn-empty"
          >
            Empty
          </button>
        </div>
      </div>
    </header>
  );
};
