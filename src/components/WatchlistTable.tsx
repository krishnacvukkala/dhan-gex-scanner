import React from 'react';
import { Instrument, WatchlistType } from '../types';
import { ShieldCheck, Crosshair, ArrowUpRight, ArrowDownRight, Radio } from 'lucide-react';

interface WatchlistTableProps {
  type: WatchlistType;
  title: string;
  instruments: Instrument[];
  selectedId: string | null;
  onSelect: (instrument: Instrument) => void;
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({
  type,
  title,
  instruments,
  selectedId,
  onSelect,
}) => {
  const isSupport = type === 'SUPPORT';

  return (
    <div
      className={`watchlist-card ${isSupport ? 'support-card' : 'resistance-card'}`}
      data-testid={`watchlist-${type.toLowerCase()}`}
    >
      <div className="watchlist-card-header">
        <div className="watchlist-title-group">
          <div className={`icon-badge ${isSupport ? 'icon-support' : 'icon-resistance'}`}>
            {isSupport ? <ShieldCheck size={18} /> : <Crosshair size={18} />}
          </div>
          <div>
            <h3 className="watchlist-title">{title}</h3>
            <span className="watchlist-subtitle">
              {isSupport
                ? 'Monitored for dealer put wall defense & gamma flip support'
                : 'Monitored for dealer call wall pinning & gamma flip resistance'}
            </span>
          </div>
        </div>
        <div className="watchlist-badge">
          <span className="count-pill">{instruments.length}</span>
          <span className="simulated-tag">SIMULATED</span>
        </div>
      </div>

      <div className="table-responsive">
        <table className="watchlist-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th className="text-right">Last Price</th>
              <th className="text-left">Nearest GEX Level</th>
              <th className="text-right">Distance</th>
              <th className="text-center">Status</th>
              <th className="text-right">Freshness</th>
            </tr>
          </thead>
          <tbody>
            {instruments.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  No instruments currently match filters for {title.toLowerCase()}.
                </td>
              </tr>
            ) : (
              instruments.map((inst) => {
                const isSelected = selectedId === inst.id;
                const isPositive = inst.change >= 0;
                const gex = inst.nearestGex;

                // Format freshness label
                const updatedTime = new Date(inst.updatedAt).getTime();
                const diffSec = Math.max(1, Math.round((Date.now() - updatedTime) / 1000));
                const freshnessLabel = diffSec < 5 ? 'Just now' : `${diffSec}s ago`;

                return (
                  <tr
                    key={inst.id}
                    className={`watchlist-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => onSelect(inst)}
                    data-testid={`row-${inst.symbol.toLowerCase().replace(/\s+/g, '-')}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onSelect(inst);
                    }}
                  >
                    {/* Symbol */}
                    <td>
                      <div className="symbol-cell">
                        <span className="symbol-text">{inst.symbol}</span>
                        <span className={`type-badge ${inst.type.toLowerCase()}`}>
                          {inst.type}
                        </span>
                      </div>
                      <div className="instrument-name">{inst.name}</div>
                    </td>

                    {/* Last Price */}
                    <td className="text-right">
                      <div className="price-value font-mono">
                        ₹{inst.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`price-change font-mono ${isPositive ? 'pos' : 'neg'}`}>
                        {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        <span>
                          {isPositive ? '+' : ''}
                          {inst.change.toFixed(2)} ({isPositive ? '+' : ''}
                          {inst.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </td>

                    {/* Nearest GEX Level */}
                    <td>
                      <div className="gex-level-name">{gex.name}</div>
                      <div className="gex-level-strike font-mono">
                        Strike: ₹{gex.level.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Distance */}
                    <td className="text-right">
                      <div
                        className={`distance-pct font-mono ${
                          gex.distancePct <= 0.2 ? 'distance-critical' : 'distance-normal'
                        }`}
                      >
                        {gex.distancePct.toFixed(2)}%
                      </div>
                      <div className="distance-pts font-mono text-muted">
                        {gex.distancePts.toFixed(2)} pts
                      </div>
                    </td>

                    {/* Status */}
                    <td className="text-center">
                      <span className={`status-pill status-${gex.status.toLowerCase()}`}>
                        {gex.status}
                      </span>
                    </td>

                    {/* Freshness */}
                    <td className="text-right">
                      <div className="freshness-cell">
                        <Radio size={12} className="pulse-icon text-cyan" />
                        <span className="freshness-text font-mono">{freshnessLabel}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
