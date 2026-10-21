import React from 'react';
import { Instrument } from '../types';
import { X, Printer, Download, CheckCircle2, AlertTriangle, ShieldCheck, FileText, Calendar } from 'lucide-react';

interface SessionRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  instruments: Instrument[];
}

export const SessionRecapModal: React.FC<SessionRecapModalProps> = ({
  isOpen,
  onClose,
  instruments,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Calculate audit statistics
  let respectedCount = 0;
  let testedCount = 0;
  let breachedCount = 0;

  const rows = instruments.map((inst) => {
    const spot = inst.lastPrice;
    const callWall = inst.callWall;
    const putWall = inst.putWall;

    let wallStatus: 'RESPECTED' | 'TESTED' | 'BREACHED' = 'RESPECTED';

    if (spot > callWall || spot < putWall) {
      wallStatus = 'BREACHED';
      breachedCount++;
    } else if (
      Math.abs((spot - callWall) / spot) <= 0.003 ||
      Math.abs((spot - putWall) / spot) <= 0.003
    ) {
      wallStatus = 'TESTED';
      testedCount++;
    } else {
      respectedCount++;
    }

    const isAboveFlip = spot >= inst.gammaFlip;

    return {
      instrument: inst,
      wallStatus,
      isAboveFlip,
    };
  });

  const total = instruments.length || 1;
  const respectRate = Math.round(((respectedCount + testedCount) / total) * 100);

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const recapData = {
      reportDate: new Date().toISOString(),
      respectRatePercent: respectRate,
      totalInstruments: instruments.length,
      respectedWalls: respectedCount,
      testedWalls: testedCount,
      breachedWalls: breachedCount,
      instruments: rows.map((r) => ({
        symbol: r.instrument.symbol,
        lastPrice: r.instrument.lastPrice,
        callWall: r.instrument.callWall,
        putWall: r.instrument.putWall,
        gammaFlip: r.instrument.gammaFlip,
        netGexCr: r.instrument.netGex,
        dealerBias: r.instrument.dealerBias,
        wallStatus: r.wallStatus,
        aboveGammaFlip: r.isAboveFlip,
      })),
    };

    const blob = new Blob([JSON.stringify(recapData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dhan_GEX_Session_Recap_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="recap-modal-backdrop" onClick={onClose} data-testid="recap-modal-backdrop">
      <div
        className="recap-modal-card"
        onClick={(e) => e.stopPropagation()}
        data-testid="session-recap-modal"
      >
        {/* Header */}
        <div className="recap-header">
          <div className="recap-header-left">
            <div className="recap-icon-wrap">
              <FileText size={20} className="text-cyan" />
            </div>
            <div>
              <h2 className="recap-title">Daily Institutional GEX Session Recap & Audit Journal</h2>
              <div className="recap-subtitle">
                <Calendar size={13} />
                <span>Session Date: {todayStr} | Benchmark Performance & Level Respect</span>
              </div>
            </div>
          </div>

          <div className="recap-header-actions">
            <button
              type="button"
              className="recap-btn print-btn"
              onClick={handlePrint}
              title="Print or Save as PDF"
              data-testid="print-recap-btn"
            >
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              className="recap-btn export-btn"
              onClick={handleExportJson}
              title="Export session audit to JSON"
              data-testid="export-recap-json-btn"
            >
              <Download size={14} />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              className="recap-close-btn"
              onClick={onClose}
              data-testid="close-recap-modal-btn"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Statistical Summary Cards */}
        <div className="recap-stats-grid">
          <div className="recap-stat-card respect">
            <ShieldCheck size={20} className="text-emerald-400" />
            <div>
              <span className="recap-stat-num font-mono">{respectRate}%</span>
              <span className="recap-stat-lbl">GEX Wall Respect Rate</span>
            </div>
          </div>

          <div className="recap-stat-card">
            <CheckCircle2 size={20} className="text-cyan" />
            <div>
              <span className="recap-stat-num font-mono">{respectedCount}</span>
              <span className="recap-stat-lbl">Walls Held Cleanly</span>
            </div>
          </div>

          <div className="recap-stat-card warning">
            <AlertTriangle size={20} className="text-amber-400" />
            <div>
              <span className="recap-stat-num font-mono">{testedCount}</span>
              <span className="recap-stat-lbl">Walls Tested / Pinned</span>
            </div>
          </div>

          <div className="recap-stat-card danger">
            <AlertTriangle size={20} className="text-rose-400" />
            <div>
              <span className="recap-stat-num font-mono">{breachedCount}</span>
              <span className="recap-stat-lbl">Walls Breached</span>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="recap-table-wrapper">
          <table className="recap-table font-mono">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Closing Spot</th>
                <th>Net GEX (₹ Cr)</th>
                <th>Dealer Bias</th>
                <th>Put Wall (Support)</th>
                <th>Call Wall (Resistance)</th>
                <th>Gamma Flip Regime</th>
                <th>Wall Respect Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ instrument, wallStatus, isAboveFlip }) => (
                <tr key={instrument.id} className={`recap-row ${wallStatus.toLowerCase()}`}>
                  <td className="font-bold text-slate-100">{instrument.symbol}</td>
                  <td>₹{instrument.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className={instrument.netGex >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {instrument.netGex >= 0 ? `+₹${instrument.netGex}` : `-₹${Math.abs(instrument.netGex)}`} Cr
                  </td>
                  <td>
                    <span className={`status-chip ${instrument.dealerBias.toLowerCase()}`}>
                      {instrument.dealerBias === 'LONG_GAMMA' ? 'Long Γ' : 'Short Γ'}
                    </span>
                  </td>
                  <td>₹{instrument.putWall.toLocaleString('en-IN')}</td>
                  <td>₹{instrument.callWall.toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`flip-chip ${isAboveFlip ? 'above' : 'below'}`}>
                      {isAboveFlip ? 'Above Flip (Buffering)' : 'Below Flip (Expanding)'}
                    </span>
                  </td>
                  <td>
                    <span className={`wall-respect-badge ${wallStatus.toLowerCase()}`}>
                      {wallStatus === 'RESPECTED' && '✓ Held Firm'}
                      {wallStatus === 'TESTED' && '⚡ Tested / Pinned'}
                      {wallStatus === 'BREACHED' && '✗ Breached'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="recap-footer font-sans">
          <p className="text-xs text-slate-400">
            Institutional Audit: Conventional Black-Scholes gamma wall respect rate measures the fidelity of dealer delta-hedging barriers in containing intraday volatility.
          </p>
        </div>
      </div>
    </div>
  );
};
