import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OiVelocityMatrix } from '../components/OiVelocityMatrix';
import { MOCK_INSTRUMENTS } from '../data/mockData';

describe('OiVelocityMatrix Component', () => {
  const mockInstrument = MOCK_INSTRUMENTS[0]; // NIFTY

  it('renders summary KPI cards with Net Intraday ΔGEX and flow badges', () => {
    render(
      <OiVelocityMatrix
        strikes={mockInstrument.strikes || []}
        spotPrice={mockInstrument.lastPrice}
        lotSize={mockInstrument.lotSize || 25}
        symbol={mockInstrument.symbol}
      />
    );

    expect(screen.getByTestId('oi-velocity-matrix')).toBeInTheDocument();
    expect(screen.getByText('Net Intraday ΔGEX')).toBeInTheDocument();
    expect(screen.getByText('Total Call ΔOI')).toBeInTheDocument();
    expect(screen.getByText('Total Put ΔOI')).toBeInTheDocument();
    expect(screen.getByText('Dominant Intraday Flow')).toBeInTheDocument();
  });

  it('toggles between ΔOI Contracts and ΔGEX (₹ Cr) modes', () => {
    render(
      <OiVelocityMatrix
        strikes={mockInstrument.strikes || []}
        spotPrice={mockInstrument.lastPrice}
        lotSize={mockInstrument.lotSize || 25}
        symbol={mockInstrument.symbol}
      />
    );

    const oiToggle = screen.getByTestId('toggle-mode-oi');
    const gexToggle = screen.getByTestId('toggle-mode-gex');

    expect(oiToggle).toHaveClass('active');
    expect(gexToggle).not.toHaveClass('active');

    // Switch to GEX mode
    fireEvent.click(gexToggle);
    expect(gexToggle).toHaveClass('active');
    expect(oiToggle).not.toHaveClass('active');

    // Switch back to OI mode
    fireEvent.click(oiToggle);
    expect(oiToggle).toHaveClass('active');
  });

  it('renders granular flow audit table', () => {
    render(
      <OiVelocityMatrix
        strikes={mockInstrument.strikes || []}
        spotPrice={mockInstrument.lastPrice}
        lotSize={mockInstrument.lotSize || 25}
        symbol={mockInstrument.symbol}
      />
    );

    expect(screen.getByTestId('velocity-table')).toBeInTheDocument();
    expect(screen.getByText('Call Flow')).toBeInTheDocument();
    expect(screen.getByText('Put Flow')).toBeInTheDocument();
  });
});
