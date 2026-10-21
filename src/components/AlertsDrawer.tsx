import React, { useState } from 'react';
import { X, Bell, Volume2, VolumeX, Trash2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { GexAlert } from '../services/alerts/alertEngine';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: GexAlert[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClearAlerts: () => void;
  onSelectInstrument?: (symbol: string) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  soundEnabled,
  onToggleSound,
  onClearAlerts,
  onSelectInstrument,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'critical' | 'warning'>('ALL');

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === 'ALL') return true;
    return a.severity === severityFilter;
  });

  return (
    <div className="alerts-drawer-backdrop" onClick={onClose} data-testid="alerts-drawer-backdrop">
      <div
        className="alerts-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        data-testid="alerts-drawer-panel"
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-icon-wrap">
              <Bell size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="drawer-title">Real-Time GEX Alerts</h3>
              <p className="drawer-subtitle">
                Wall testing, approaching resistance/support, and Gamma Flip breaches
              </p>
            </div>
          </div>

          <div className="drawer-actions">
            <button
              type="button"
              className={`drawer-action-btn ${soundEnabled ? 'active' : ''}`}
              onClick={onToggleSound}
              title={soundEnabled ? 'Disable audio alerts' : 'Enable audio alerts'}
              data-testid="toggle-sound-btn"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {alerts.length > 0 && (
              <button
                type="button"
                className="drawer-action-btn text-rose-400 hover:text-rose-300"
                onClick={onClearAlerts}
                title="Clear all alerts"
                data-testid="clear-alerts-btn"
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              type="button"
              className="drawer-close-btn"
              onClick={onClose}
              data-testid="close-alerts-drawer-btn"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="drawer-filters">
          <button
            type="button"
            className={`filter-pill ${severityFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('ALL')}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            type="button"
            className={`filter-pill critical ${severityFilter === 'critical' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('critical')}
          >
            Critical Testing ({alerts.filter((a) => a.severity === 'critical').length})
          </button>
          <button
            type="button"
            className={`filter-pill warning ${severityFilter === 'warning' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('warning')}
          >
            Approaching ({alerts.filter((a) => a.severity === 'warning').length})
          </button>
        </div>

        {/* Alerts List */}
        <div className="drawer-body">
          {filteredAlerts.length === 0 ? (
            <div className="empty-alerts-state" data-testid="empty-alerts">
              <Bell size={32} className="text-slate-600 mb-2" />
              <p className="text-slate-300 font-medium">No alerts right now</p>
              <p className="text-xs text-slate-500">
                Actionable proximity alerts will trigger when price tests Call/Put Walls or crosses Gamma Flip.
              </p>
            </div>
          ) : (
            <div className="alerts-list">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-card ${alert.severity}`}
                  onClick={() => {
                    if (onSelectInstrument) {
                      onSelectInstrument(alert.symbol);
                      onClose();
                    }
                  }}
                  style={{ cursor: onSelectInstrument ? 'pointer' : 'default' }}
                  data-testid="alert-card-item"
                >
                  <div className="alert-card-top">
                    <div className="alert-symbol-badge">
                      <span className="font-bold text-slate-100">{alert.symbol}</span>
                      <span className={`severity-tag ${alert.severity}`}>
                        {alert.severity === 'critical' && <AlertCircle size={11} />}
                        {alert.severity === 'warning' && <AlertTriangle size={11} />}
                        {alert.severity === 'info' && <Info size={11} />}
                        <span>{alert.type.replace(/_/g, ' ')}</span>
                      </span>
                    </div>
                    <span className="alert-timestamp font-mono">{alert.timestamp}</span>
                  </div>

                  <p className="alert-card-title">{alert.title}</p>
                  <p className="alert-card-message">{alert.message}</p>

                  <div className="alert-card-footer font-mono">
                    <span>Level: ₹{alert.level.toLocaleString('en-IN')}</span>
                    <span>Spot: ₹{alert.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span>Distance: {alert.distancePct > 0 ? `+${alert.distancePct}%` : `${alert.distancePct}%`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
