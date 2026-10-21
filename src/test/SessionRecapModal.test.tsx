import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionRecapModal } from '../components/SessionRecapModal';
import { MOCK_INSTRUMENTS } from '../data/mockData';

describe('SessionRecapModal Component', () => {
  it('renders daily session recap modal with audit statistics', () => {
    const onClose = vi.fn();
    render(<SessionRecapModal isOpen={true} onClose={onClose} instruments={MOCK_INSTRUMENTS} />);

    expect(screen.getByTestId('session-recap-modal')).toBeInTheDocument();
    expect(screen.getByText(/Daily Institutional GEX Session Recap/i)).toBeInTheDocument();
    expect(screen.getByText(/GEX Wall Respect Rate/i)).toBeInTheDocument();
    expect(screen.getByText('NIFTY 50')).toBeInTheDocument();
  });

  it('triggers window.print on print button click', () => {
    const originalPrint = window.print;
    window.print = vi.fn();

    const onClose = vi.fn();
    render(<SessionRecapModal isOpen={true} onClose={onClose} instruments={MOCK_INSTRUMENTS} />);

    const printBtn = screen.getByTestId('print-recap-btn');
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalled();
    window.print = originalPrint;
  });

  it('exports JSON on export button click without crashing', () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    const onClose = vi.fn();
    render(<SessionRecapModal isOpen={true} onClose={onClose} instruments={MOCK_INSTRUMENTS} />);

    const exportBtn = screen.getByTestId('export-recap-json-btn');
    fireEvent.click(exportBtn);

    expect(URL.createObjectURL).toHaveBeenCalled();

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });
});
