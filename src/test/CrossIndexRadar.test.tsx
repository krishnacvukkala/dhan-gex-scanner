import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CrossIndexRadar } from '../components/CrossIndexRadar';
import { MOCK_INSTRUMENTS } from '../data/mockData';

describe('CrossIndexRadar Component', () => {
  it('renders cross-index radar with benchmark indices', () => {
    const onSelect = vi.fn();
    render(<CrossIndexRadar instruments={MOCK_INSTRUMENTS} onSelectInstrument={onSelect} />);

    expect(screen.getByTestId('cross-index-radar')).toBeInTheDocument();
    expect(screen.getByText('Cross-Index Institutional Gamma Radar')).toBeInTheDocument();
    expect(screen.getByText('NIFTY 50')).toBeInTheDocument();
    expect(screen.getByText('BANKNIFTY')).toBeInTheDocument();
    expect(screen.getByText('FINNIFTY')).toBeInTheDocument();
    expect(screen.getByText('SENSEX')).toBeInTheDocument();
  });

  it('triggers onSelectInstrument when clicking an index card', () => {
    const onSelect = vi.fn();
    render(<CrossIndexRadar instruments={MOCK_INSTRUMENTS} onSelectInstrument={onSelect} />);

    const niftyCard = screen.getByTestId('radar-card-nifty-50');
    fireEvent.click(niftyCard);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].symbol).toBe('NIFTY 50');
  });
});
