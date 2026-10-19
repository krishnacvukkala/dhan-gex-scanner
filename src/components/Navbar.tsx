import React from 'react';
import { ViewState } from '../types';
import { Activity, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewState: ViewState;
  onViewStateChange: (state: ViewState) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  viewState,
  onViewStateChange,
}) => {
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

        <div className="mock-banner-tag" title="Stage 1: All data is simulated mock data">
          <span className="mock-pulse"></span>
          <span>SIMULATED DATA ONLY</span>
        </div>
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
        {/* State Toggle for Review & Testing */}
        <div className="state-switcher" title="Toggle simulation states to review loading, empty, and error behaviors">
          <span className="state-switcher-label">State:</span>
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
