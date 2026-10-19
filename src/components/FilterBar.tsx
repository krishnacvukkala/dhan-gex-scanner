import React from 'react';
import { TypeFilter, StatusFilter } from '../types';
import { Filter, Layers, Zap } from 'lucide-react';

interface FilterBarProps {
  typeFilter: TypeFilter;
  onTypeFilterChange: (type: TypeFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  totalCount: number;
  supportCount: number;
  resistanceCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  supportCount,
  resistanceCount,
}) => {
  return (
    <div className="filter-bar" data-testid="filter-bar">
      <div className="filter-group">
        <div className="filter-label">
          <Layers size={14} />
          <span>Instrument:</span>
        </div>
        <div className="filter-pills" role="tablist">
          <button
            className={`pill-btn ${typeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => onTypeFilterChange('ALL')}
            data-testid="filter-type-all"
          >
            All Instruments
          </button>
          <button
            className={`pill-btn ${typeFilter === 'INDEX' ? 'active' : ''}`}
            onClick={() => onTypeFilterChange('INDEX')}
            data-testid="filter-type-index"
          >
            Indices Only (Nifty / Bank Nifty)
          </button>
          <button
            className={`pill-btn ${typeFilter === 'STOCK' ? 'active' : ''}`}
            onClick={() => onTypeFilterChange('STOCK')}
            data-testid="filter-type-stock"
          >
            F&O Stocks
          </button>
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-label">
          <Filter size={14} />
          <span>Event Status:</span>
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          data-testid="filter-status-select"
        >
          <option value="ALL">All Event Statuses</option>
          <option value="APPROACHING">Approaching Level (&lt;0.5%)</option>
          <option value="TESTING">Testing / At Strike</option>
          <option value="PINNING">Pinning Resistance</option>
          <option value="BREACHED">Breached Level</option>
        </select>
      </div>

      <div className="filter-stats">
        <div className="stat-item">
          <span className="stat-label">Total Active:</span>
          <span className="stat-value font-mono">{totalCount}</span>
        </div>
        <div className="stat-item support-stat">
          <Zap size={13} className="text-emerald" />
          <span className="stat-label">Support Watch:</span>
          <span className="stat-value font-mono text-emerald">{supportCount}</span>
        </div>
        <div className="stat-item resistance-stat">
          <Zap size={13} className="text-rose" />
          <span className="stat-label">Resistance Watch:</span>
          <span className="stat-value font-mono text-rose">{resistanceCount}</span>
        </div>
      </div>
    </div>
  );
};
