import React from 'react';
import { RefreshCw, AlertOctagon, SearchX } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Fetching market quotes and simulating GEX structure...',
}) => {
  return (
    <div className="state-container loading-state" data-testid="loading-state">
      <div className="spinner-wrapper">
        <RefreshCw size={36} className="spin text-cyan" />
      </div>
      <h3 className="state-title">Loading Scanner Data</h3>
      <p className="state-desc">{message}</p>
      <div className="skeleton-grid">
        <div className="skeleton-line full" />
        <div className="skeleton-line three-quarters" />
        <div className="skeleton-line half" />
      </div>
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Scanner Feed Error',
  message = 'Failed to load options data feed or calculate gamma levels. Ensure DhanHQ credentials and network connection are operational.',
  onRetry,
}) => {
  return (
    <div className="state-container error-state" data-testid="error-state">
      <div className="state-icon-circle error-circle">
        <AlertOctagon size={36} className="text-rose" />
      </div>
      <h3 className="state-title text-rose">{title}</h3>
      <p className="state-desc">{message}</p>
      <button className="btn-retry" onClick={onRetry} data-testid="retry-btn">
        <RefreshCw size={14} />
        <span>Retry Connection</span>
      </button>
    </div>
  );
};

interface EmptyStateProps {
  searchQuery?: string;
  onResetFilters: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  searchQuery,
  onResetFilters,
}) => {
  return (
    <div className="state-container empty-state" data-testid="empty-state">
      <div className="state-icon-circle empty-circle">
        <SearchX size={36} className="text-muted" />
      </div>
      <h3 className="state-title">No Matching Instruments Found</h3>
      <p className="state-desc">
        {searchQuery
          ? `No instruments matched query "${searchQuery}". Try searching for NIFTY, BANKNIFTY, or F&O stocks.`
          : 'No instruments found matching the active type or status filter criteria.'}
      </p>
      <button className="btn-reset-filters" onClick={onResetFilters} data-testid="reset-filters-btn">
        Reset All Filters
      </button>
    </div>
  );
};
