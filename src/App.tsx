import React, { useState, useMemo } from 'react';
import { Instrument, ViewState, TypeFilter, StatusFilter } from './types';
import { MOCK_INSTRUMENTS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { WatchlistTable } from './components/WatchlistTable';
import { InstrumentDetail } from './components/InstrumentDetail';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { LoadingState, ErrorState, EmptyState } from './components/StateViews';
import { useLiveGexScanner } from './hooks/useLiveGexScanner';
import { useGexAlerts } from './hooks/useGexAlerts';
import { AlertsDrawer } from './components/AlertsDrawer';
import {
  Info,
  ShieldAlert,
  Radio,
  Clock,
  Layers,
  ExternalLink,
} from 'lucide-react';

export const App: React.FC = () => {
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [viewState, setViewState] = useState<ViewState>('NORMAL');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Live DhanHQ GEX Scanner hook
  const {
    isLiveMode,
    setIsLiveMode,
    connectionStatus,
    liveInstruments,
    lastSyncTime,
    isPolling,
    pollIntervalMs,
    setPollIntervalMs,
    errorMessage,
    refreshNow,
    expiryDate,
  } = useLiveGexScanner();

  // Active dataset depends on mode
  const rawInstruments = useMemo(() => {
    if (isLiveMode) {
      return liveInstruments.length > 0 ? liveInstruments : [];
    }
    return MOCK_INSTRUMENTS;
  }, [isLiveMode, liveInstruments]);

  // Real-time GEX Level Alerting hook
  const {
    alerts,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    markAllAsRead,
    clearAlerts,
  } = useGexAlerts(rawInstruments);

  // Keep selected instrument in sync with live updates
  const activeSelectedInstrument = useMemo(() => {
    if (!selectedInstrument) return null;
    const found = rawInstruments.find((i) => i.id === selectedInstrument.id || i.symbol === selectedInstrument.symbol);
    return found || selectedInstrument;
  }, [rawInstruments, selectedInstrument]);

  // Filtered dataset
  const filteredInstruments = useMemo(() => {
    if (viewState === 'EMPTY') return [];

    return rawInstruments.filter((inst) => {
      // Search filter
      const matchesSearch =
        searchQuery.trim() === '' ||
        inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType = typeFilter === 'ALL' || inst.type === typeFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' || inst.nearestGex.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rawInstruments, searchQuery, typeFilter, statusFilter, viewState]);

  // Support vs Resistance splitting
  const supportWatchlist = useMemo(() => {
    return filteredInstruments.filter((inst) => inst.nearestGex.watchlist === 'SUPPORT');
  }, [filteredInstruments]);

  const resistanceWatchlist = useMemo(() => {
    return filteredInstruments.filter((inst) => inst.nearestGex.watchlist === 'RESISTANCE');
  }, [filteredInstruments]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setViewState('NORMAL');
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewState={viewState}
        onViewStateChange={setViewState}
        isLiveMode={isLiveMode}
        onToggleLiveMode={(enableLive) => {
          setIsLiveMode(enableLive);
          if (enableLive && connectionStatus === 'DISCONNECTED') {
            setIsSettingsOpen(true);
          }
        }}
        connectionStatus={connectionStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshNow={refreshNow}
        isPolling={isPolling}
        unreadAlertsCount={unreadCount}
        onOpenAlerts={() => {
          setIsAlertsOpen(true);
          markAllAsRead();
        }}
      />

      <main className="app-main">
        {/* Banner: Simulated vs Live Mode */}
        {isLiveMode ? (
          <section
            className={`live-status-banner ${
              connectionStatus === 'ERROR'
                ? 'banner-error'
                : connectionStatus === 'RATE_LIMITED'
                ? 'banner-warning'
                : 'banner-connected'
            }`}
            data-testid="live-status-banner"
          >
            <div className="banner-content">
              <Radio size={18} className="banner-icon pulse-icon" />
              <div className="banner-text">
                <div className="live-banner-headline">
                  <strong>Live DhanHQ Option Chain Feed Active.</strong>
                  <span className="live-badge-detail font-mono">
                    Expiry: {expiryDate}
                  </span>
                  {lastSyncTime && (
                    <span className="live-badge-detail font-mono">
                      <Clock size={11} className="inline-icon" /> Last Sync: {lastSyncTime.toLocaleTimeString()}
                    </span>
                  )}
                  {liveInstruments.length > 0 && (
                    <span className="live-badge-detail font-mono">
                      <Layers size={11} className="inline-icon" /> {liveInstruments.length} Symbols Scanned
                    </span>
                  )}
                </div>
                <span>
                  {errorMessage ? (
                    <span className="banner-error-text">
                      {errorMessage}{' '}
                      <button
                        type="button"
                        className="banner-link-btn"
                        onClick={() => setIsSettingsOpen(true)}
                      >
                        Open API Settings <ExternalLink size={11} />
                      </button>
                    </span>
                  ) : (
                    'Real-time Black-Scholes gamma exposure and structural levels calculated from DhanHQ market data.'
                  )}
                </span>
              </div>
            </div>
          </section>
        ) : (
          <section className="simulation-banner" data-testid="simulated-banner">
            <div className="banner-content">
              <ShieldAlert size={18} className="banner-icon" />
              <div className="banner-text">
                <strong>Simulated Data Mode: Synthetic GEX & Mock Candles Active.</strong>
                <span>
                  All Gamma Exposure levels, strike pegs, and 5-minute candlestick charts are currently generated using simulated mock models. Switch to &apos;Live Dhan&apos; in navbar to fetch live Indian market option chains.
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Filter Bar */}
        <FilterBar
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          totalCount={filteredInstruments.length}
          supportCount={supportWatchlist.length}
          resistanceCount={resistanceWatchlist.length}
        />

        {/* Dynamic Views: Loading, Error, Empty, or Normal Watchlists */}
        {viewState === 'LOADING' ? (
          <LoadingState />
        ) : viewState === 'ERROR' ? (
          <ErrorState onRetry={() => setViewState('NORMAL')} />
        ) : isLiveMode && liveInstruments.length === 0 && connectionStatus === 'CONNECTING' ? (
          <LoadingState />
        ) : filteredInstruments.length === 0 ? (
          <EmptyState
            searchQuery={searchQuery}
            onResetFilters={resetAllFilters}
          />
        ) : (
          <div className="watchlists-layout" data-testid="watchlists-layout">
            {/* Support Watchlist */}
            <WatchlistTable
              type="SUPPORT"
              title="Support Watchlist (Put Wall / Flip Support)"
              instruments={supportWatchlist}
              selectedId={activeSelectedInstrument?.id ?? null}
              onSelect={(inst) => setSelectedInstrument(inst)}
            />

            {/* Resistance Watchlist */}
            <WatchlistTable
              type="RESISTANCE"
              title="Resistance Watchlist (Call Wall / Flip Resistance)"
              instruments={resistanceWatchlist}
              selectedId={activeSelectedInstrument?.id ?? null}
              onSelect={(inst) => setSelectedInstrument(inst)}
            />
          </div>
        )}

        {/* Methodology Quick Card */}
        <footer className="scanner-footer">
          <div className="footer-card">
            <div className="footer-title">
              <Info size={15} />
              <span>GEX Scanner Structural Philosophy</span>
            </div>
            <p>
              Dealer gamma exposure provides critical insights into counterparty hedging obligations.
              In positive gamma regimes, market makers buy dips and sell rips, suppressing volatility around Call & Put walls.
              In negative gamma regimes (below Gamma Flip), market makers hedge in the direction of the market, amplifying momentum and creating breakout conditions.
            </p>
          </div>
        </footer>
      </main>

      {/* Selected Instrument Detail Modal */}
      {activeSelectedInstrument && (
        <InstrumentDetail
          instrument={activeSelectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      )}

      {/* DhanHQ API Credentials & Configuration Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        pollIntervalMs={pollIntervalMs}
        onPollIntervalChange={setPollIntervalMs}
        onCredentialsSaved={() => {
          if (isLiveMode) {
            refreshNow();
          }
        }}
      />

      {/* Real-Time GEX Alerts Drawer */}
      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onClearAlerts={clearAlerts}
        onSelectInstrument={(symbol) => {
          const match = rawInstruments.find((i) => i.symbol === symbol);
          if (match) setSelectedInstrument(match);
        }}
      />
    </div>
  );
};

export default App;

