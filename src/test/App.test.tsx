import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Dhan GEX Scanner - Stage 1 Frontend Dashboard', () => {
  it('renders application navbar with branding and simulated badge', () => {
    render(<App />);

    expect(screen.getByText('Dhan GEX Scanner')).toBeInTheDocument();
    expect(screen.getByText('SIMULATED DATA ONLY')).toBeInTheDocument();
    expect(screen.getByTestId('simulated-banner')).toBeInTheDocument();
  });

  it('renders both Support and Resistance watchlist cards with simulated tags', () => {
    render(<App />);

    expect(screen.getByTestId('watchlist-support')).toBeInTheDocument();
    expect(screen.getByTestId('watchlist-resistance')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText(/Support Watchlist/i)).toBeInTheDocument();
    expect(screen.getByText(/Resistance Watchlist/i)).toBeInTheDocument();

    // Check instruments in default mock data
    expect(screen.getByText('NIFTY 50')).toBeInTheDocument();
    expect(screen.getByText('BANKNIFTY')).toBeInTheDocument();
    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    expect(screen.getByText('TCS')).toBeInTheDocument();
  });

  it('filters instruments when selecting Indices Only vs F&O Stocks', () => {
    render(<App />);

    // Click Indices Only filter
    const indicesBtn = screen.getByTestId('filter-type-index');
    fireEvent.click(indicesBtn);

    // Indices should be visible
    expect(screen.getByText('NIFTY 50')).toBeInTheDocument();
    expect(screen.getByText('BANKNIFTY')).toBeInTheDocument();

    // Stocks should not be visible
    expect(screen.queryByText('RELIANCE')).not.toBeInTheDocument();
    expect(screen.queryByText('TCS')).not.toBeInTheDocument();

    // Switch to F&O Stocks
    const stockBtn = screen.getByTestId('filter-type-stock');
    fireEvent.click(stockBtn);

    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    expect(screen.getByText('TCS')).toBeInTheDocument();
    expect(screen.queryByText('NIFTY 50')).not.toBeInTheDocument();
  });

  it('filters instruments by search query', () => {
    render(<App />);

    const searchInput = screen.getByTestId('symbol-search-input');
    fireEvent.change(searchInput, { target: { value: 'INFY' } });

    expect(screen.getByText('INFY')).toBeInTheDocument();
    expect(screen.queryByText('RELIANCE')).not.toBeInTheDocument();
    expect(screen.queryByText('NIFTY 50')).not.toBeInTheDocument();
  });

  it('opens instrument detail modal when clicking a watchlist row and closes on close button', () => {
    render(<App />);

    // Click on NIFTY 50 row
    const niftyRow = screen.getByTestId('row-nifty-50');
    fireEvent.click(niftyRow);

    // Detail view should appear
    expect(screen.getByTestId('instrument-detail-modal')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /NIFTY 50 Detail View/i })).toBeInTheDocument();
    expect(screen.getByText('Put Wall (Support)')).toBeInTheDocument();
    expect(screen.getByText('Call Wall (Resistance)')).toBeInTheDocument();
    expect(screen.getByText('Gamma Flip Level')).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getByTestId('close-detail-btn');
    fireEvent.click(closeBtn);

    // Modal should disappear
    expect(screen.queryByTestId('instrument-detail-modal')).not.toBeInTheDocument();
  });

  it('displays loading state when loading mode is activated', () => {
    render(<App />);

    const loadingBtn = screen.getByTestId('state-btn-loading');
    fireEvent.click(loadingBtn);

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Loading Scanner Data')).toBeInTheDocument();
    expect(screen.queryByTestId('watchlists-layout')).not.toBeInTheDocument();
  });

  it('displays error state with retry button when error mode is activated', () => {
    render(<App />);

    const errorBtn = screen.getByTestId('state-btn-error');
    fireEvent.click(errorBtn);

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText('Scanner Feed Error')).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByTestId('retry-btn');
    fireEvent.click(retryBtn);

    // Returns to normal state
    expect(screen.getByTestId('watchlists-layout')).toBeInTheDocument();
  });

  it('displays empty state when empty mode is activated and resets on button click', () => {
    render(<App />);

    const emptyBtn = screen.getByTestId('state-btn-empty');
    fireEvent.click(emptyBtn);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Matching Instruments Found')).toBeInTheDocument();

    const resetBtn = screen.getByTestId('reset-filters-btn');
    fireEvent.click(resetBtn);

    expect(screen.getByTestId('watchlists-layout')).toBeInTheDocument();
  });

  it('opens API settings modal when clicking settings gear icon in navbar', () => {
    render(<App />);

    const settingsBtn = screen.getByTestId('open-api-settings-btn');
    fireEvent.click(settingsBtn);

    expect(screen.getByTestId('api-settings-modal')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('close-settings-btn');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('api-settings-modal')).not.toBeInTheDocument();
  });

  it('switches between Simulated Mode and Live Dhan Mode via Mode Switcher', () => {
    render(<App />);

    // Initially simulated
    expect(screen.getByTestId('simulated-banner')).toBeInTheDocument();
    expect(screen.getByTestId('mode-btn-simulated')).toHaveClass('active');

    // Click Live Dhan button
    const liveBtn = screen.getByTestId('mode-btn-live');
    fireEvent.click(liveBtn);

    // Live banner should be displayed
    expect(screen.getByTestId('live-status-banner')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('simulated-banner')).not.toBeInTheDocument();

    // Click back to Simulated
    const simBtn = screen.getByTestId('mode-btn-simulated');
    fireEvent.click(simBtn);

    expect(screen.getByTestId('simulated-banner')).toBeInTheDocument();
  });

  it('opens and closes Real-Time GEX Alerts drawer when clicking alerts button in navbar', () => {
    render(<App />);

    const alertsBtn = screen.getByTestId('open-alerts-btn');
    fireEvent.click(alertsBtn);

    expect(screen.getByTestId('alerts-drawer-panel')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('close-alerts-drawer-btn');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('alerts-drawer-panel')).not.toBeInTheDocument();
  });

  it('navigates across all Stage 5 tabs in instrument detail modal', () => {
    render(<App />);

    // Click NIFTY 50 row
    const niftyRow = screen.getByText('NIFTY 50');
    fireEvent.click(niftyRow);

    expect(screen.getByTestId('instrument-detail-modal')).toBeInTheDocument();

    // 1. Initial chart panel
    expect(screen.getByTestId('chart-view-panel')).toBeInTheDocument();

    // 2. Click Strike GEX Bars tab
    const strikesTab = screen.getByTestId('tab-strikes');
    fireEvent.click(strikesTab);
    expect(screen.getByTestId('strike-profile-panel')).toBeInTheDocument();

    // 3. Click Option Chain Table tab
    const chainTab = screen.getByTestId('tab-chain');
    fireEvent.click(chainTab);
    expect(screen.getByTestId('option-chain-table')).toBeInTheDocument();

    // 4. Click Intraday GEX Drift tab
    const driftTab = screen.getByTestId('tab-drift');
    fireEvent.click(driftTab);
    expect(screen.getByTestId('gex-drift-container')).toBeInTheDocument();
  });
});
