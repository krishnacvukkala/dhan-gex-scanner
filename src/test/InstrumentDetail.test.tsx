import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstrumentDetail } from '../components/InstrumentDetail';
import { MOCK_INSTRUMENTS } from '../data/mockData';

describe('InstrumentDetail Component - Stage 6 Quantitative & PC-GEX Additions', () => {
  const mockInstrument = MOCK_INSTRUMENTS[0]; // NIFTY

  it('renders Net Delta Exposure (DEX) and 1% Move Hedging cards', () => {
    render(<InstrumentDetail instrument={mockInstrument} onClose={vi.fn()} />);

    expect(screen.getByTestId('metric-dex-card')).toBeInTheDocument();
    expect(screen.getByText('Net Delta Exposure (DEX)')).toBeInTheDocument();

    expect(screen.getByTestId('metric-hedge-flow-card')).toBeInTheDocument();
    expect(screen.getByText('1% Move Re-hedging Flow')).toBeInTheDocument();
  });

  it('toggles between Conventional GEX and Experimental PC-GEX model (Rule 11)', () => {
    render(<InstrumentDetail instrument={mockInstrument} onClose={vi.fn()} />);

    // Initially Conventional GEX is active
    const convBtn = screen.getByTestId('btn-conventional-gex');
    const pcGexBtn = screen.getByTestId('btn-pc-gex');

    expect(convBtn).toHaveClass('active');
    expect(pcGexBtn).not.toHaveClass('active');
    expect(screen.queryByTestId('pc-gex-experimental-banner')).not.toBeInTheDocument();

    // Switch to Experimental PC-GEX
    fireEvent.click(pcGexBtn);

    expect(pcGexBtn).toHaveClass('active');
    expect(screen.getByTestId('pc-gex-experimental-banner')).toBeInTheDocument();
    expect(screen.getByText(/Rule 11 Segregated Experimental Model \(PC-GEX\)/i)).toBeInTheDocument();

    // Switch back to Conventional GEX
    fireEvent.click(convBtn);
    expect(convBtn).toHaveClass('active');
    expect(screen.queryByTestId('pc-gex-experimental-banner')).not.toBeInTheDocument();
  });
});
