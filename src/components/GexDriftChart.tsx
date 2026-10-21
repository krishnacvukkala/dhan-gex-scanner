import React, { useState } from 'react';
import { GexDriftSnapshot } from '../hooks/useGexDriftTracker';
import { TrendingUp, Activity } from 'lucide-react';

interface GexDriftChartProps {
  history: GexDriftSnapshot[];
  symbol: string;
}

export const GexDriftChart: React.FC<GexDriftChartProps> = ({ history, symbol }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="drift-chart-empty" data-testid="drift-chart-empty">
        <p>No intraday GEX drift snapshots recorded yet for {symbol}.</p>
      </div>
    );
  }

  // Calculate scales
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const h of history) {
    minPrice = Math.min(minPrice, h.spotPrice, h.putWall, h.gammaFlip);
    maxPrice = Math.max(maxPrice, h.spotPrice, h.callWall, h.gammaFlip);
  }

  const padding = (maxPrice - minPrice) * 0.05 || 10;
  const scaledMin = minPrice - padding;
  const scaledMax = maxPrice + padding;
  const range = scaledMax - scaledMin || 1;

  const width = 800;
  const height = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const getX = (index: number) => {
    return margin.left + (index / (history.length - 1 || 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const norm = (val - scaledMin) / range;
    return margin.top + innerHeight - norm * innerHeight;
  };

  const makeLinePath = (getter: (h: GexDriftSnapshot) => number) => {
    return history
      .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(getter(h))}`)
      .join(' ');
  };

  const spotPath = makeLinePath((h) => h.spotPrice);
  const callWallPath = makeLinePath((h) => h.callWall);
  const putWallPath = makeLinePath((h) => h.putWall);
  const flipPath = makeLinePath((h) => h.gammaFlip);

  const activeSnapshot = hoveredIndex !== null ? history[hoveredIndex] : history[history.length - 1];

  return (
    <div className="gex-drift-container" data-testid="gex-drift-container">
      {/* Drift Header & Metrics */}
      <div className="drift-header">
        <div className="drift-title">
          <span className="font-semibold text-slate-100">{symbol} — Intraday GEX Level Migration</span>
          <span className="text-xs text-slate-400">Tracking Wall Shifts & Gamma Flip Drift</span>
        </div>

        <div className="drift-legend">
          <span className="legend-chip call-wall">
            <span className="legend-chip-dot red" /> Call Wall
          </span>
          <span className="legend-chip flip">
            <span className="legend-chip-dot amber" /> Gamma Flip
          </span>
          <span className="legend-chip put-wall">
            <span className="legend-chip-dot green" /> Put Wall
          </span>
          <span className="legend-chip spot">
            <span className="legend-chip-dot blue" /> Spot Price
          </span>
        </div>
      </div>

      {/* Snapshot Snapshot Tooltip Bar */}
      {activeSnapshot && (
        <div className="drift-active-snapshot font-mono">
          <span className="snapshot-time">Time: <strong>{activeSnapshot.time}</strong></span>
          <span className="snapshot-metric spot-val">Spot: ₹{activeSnapshot.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          <span className="snapshot-metric call-val">Call Wall: ₹{activeSnapshot.callWall.toLocaleString('en-IN')}</span>
          <span className="snapshot-metric flip-val">Flip: ₹{activeSnapshot.gammaFlip.toLocaleString('en-IN')}</span>
          <span className="snapshot-metric put-val">Put Wall: ₹{activeSnapshot.putWall.toLocaleString('en-IN')}</span>
          <span className="snapshot-metric net-val">Net GEX: {activeSnapshot.netGexCr > 0 ? `+₹${activeSnapshot.netGexCr}` : `-₹${Math.abs(activeSnapshot.netGexCr)}`} Cr</span>
        </div>
      )}

      {/* SVG Multi-Line Chart */}
      <div className="drift-chart-svg-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="drift-svg"
          preserveAspectRatio="none"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = margin.top + innerHeight * ratio;
            const price = Math.round(scaledMax - ratio * range);
            return (
              <g key={ratio} className="grid-line-group">
                <line
                  x1={margin.left}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  stroke="rgba(51, 65, 85, 0.3)"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ₹{price.toLocaleString('en-IN')}
                </text>
              </g>
            );
          })}

          {/* Call Wall Line (Red, Dashed) */}
          <path
            d={callWallPath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2"
            strokeDasharray="5 3"
          />

          {/* Gamma Flip Line (Amber, Dotted) */}
          <path
            d={flipPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="2 3"
          />

          {/* Put Wall Line (Green, Dashed) */}
          <path
            d={putWallPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="5 3"
          />

          {/* Spot Price Line (Cyan/Blue Solid) */}
          <path
            d={spotPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />

          {/* Data Points & Hover Targets */}
          {history.map((h, i) => {
            const cx = getX(i);
            const cy = getY(h.spotPrice);
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                className="point-target"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover area */}
                <rect
                  x={cx - 15}
                  y={margin.top}
                  width="30"
                  height={innerHeight}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                />

                {/* Spot point circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 2.5}
                  fill="#38bdf8"
                  stroke="#0b1120"
                  strokeWidth="1.5"
                />

                {isHovered && (
                  <line
                    x1={cx}
                    y1={margin.top}
                    x2={cx}
                    y2={margin.top + innerHeight}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
              </g>
            );
          })}

          {/* X Axis labels */}
          {history.map((h, i) => {
            // Show every 2nd or 3rd label
            if (i % Math.max(1, Math.floor(history.length / 7)) !== 0 && i !== history.length - 1) {
              return null;
            }
            return (
              <text
                key={i}
                x={getX(i)}
                y={height - margin.bottom + 18}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {h.time}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="drift-footer-analysis">
        <div className="analysis-card">
          <TrendingUp size={14} className="text-emerald-400" />
          <span>
            <strong>Wall Migration:</strong>{' '}
            {history[history.length - 1].callWall > history[0].callWall
              ? 'Call Wall expanded upwards, dealer resistance shifted higher.'
              : history[history.length - 1].callWall < history[0].callWall
              ? 'Call Wall compressed downwards, capping upside.'
              : 'Call Wall stable across session.'}
          </span>
        </div>
        <div className="analysis-card">
          <Activity size={14} className="text-amber-400" />
          <span>
            <strong>Gamma Flip Drift:</strong>{' '}
            {history[history.length - 1].gammaFlip > history[0].gammaFlip
              ? 'Flip level elevated (+bullish pivot shift).'
              : history[history.length - 1].gammaFlip < history[0].gammaFlip
              ? 'Flip level lowered (-bearish pivot shift).'
              : 'Flip level stationary.'}
          </span>
        </div>
      </div>
    </div>
  );
};
