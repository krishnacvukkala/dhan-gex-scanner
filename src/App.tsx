import React, { useState, useMemo } from 'react';
import { Instrument, ViewState, TypeFilter, StatusFilter } from './types';
import { MOCK_INSTRUMENTS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { WatchlistTable } from './components/WatchlistTable';
import { InstrumentDetail } from './components/InstrumentDetail';
import { LoadingState, ErrorState, EmptyState } from './components/StateViews';
import { Info, ShieldAlert } from 'lucide-react';

export const App: React.FC = () => {
  const [instruments] = useState<Instrument[]>(MOCK_INSTRUMENTS);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  // Filtered dataset
  const filteredInstruments = useMemo(() => {
    if (viewState === 'EMPTY') return [];

    return instruments.filter((inst) => {
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
  }, [instruments, searchQuery, typeFilter, statusFilter, viewState]);

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
      />

      <main className="app-main">
        {/* Stage 1 Mock Data Disclaimer Banner */}
        <section className="simulation-banner" data-testid="simulated-banner">
          <div className="banner-content">
            <ShieldAlert size={18} className="banner-icon" />
            <div className="banner-text">
              <strong>Stage 1 Prototype: Simulated GEX & Mock Candles Active.</strong>
              <span>
                All Gamma Exposure levels, strike pegs, and 5-minute candlestick charts are currently generated using simulated mock models. No live Dhan API connection or automated order execution is active.
              </span>
            </div>
          </div>
        </section>

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
              selectedId={selectedInstrument?.id ?? null}
              onSelect={(inst) => setSelectedInstrument(inst)}
            />

            {/* Resistance Watchlist */}
            <WatchlistTable
              type="RESISTANCE"
              title="Resistance Watchlist (Call Wall / Flip Resistance)"
              instruments={resistanceWatchlist}
              selectedId={selectedInstrument?.id ?? null}
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
      {selectedInstrument && (
        <InstrumentDetail
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      )}
    </div>
  );
};

export default App;
