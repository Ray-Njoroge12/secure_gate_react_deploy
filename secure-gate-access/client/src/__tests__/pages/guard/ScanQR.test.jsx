import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScanQR from '../../../pages/guard/ScanQR';
import { AppNavContext } from '../../../contexts/NavigationContext';

// Mock UI components if they are complex (but they seem simple enough to render usually, unless they use context)
// PageHeader uses navigateTo, let's mock it
jest.mock('../../../components/ui', () => ({
    Card: ({ children, className, ...props }) => <div className={`card ${className}`} {...props}>{children}</div>,
    Button: ({ children, onClick, ...props }) => <button onClick={onClick} {...props}>{children}</button>,
    PageHeader: ({ title, actions }) => <div><h1>{title}</h1>{actions}</div>
}));
// Card.Content is sub-component
const { Card } = require('../../../components/ui');
Card.Content = ({ children, className }) => <div className={className}>{children}</div>;
Card.Header = ({ children }) => <div>{children}</div>;
Card.Title = ({ children }) => <h3>{children}</h3>;


jest.mock('../../../components/QRScanner', () => ({ onScan, onClose }) => (
    <div data-testid="qr-scanner-mock">
        <button onClick={() => onScan('PASS-123')}>Simulate Scan</button>
        <button onClick={onClose}>Close</button>
    </div>
));

describe('ScanQR Page', () => {
    let mockFetch;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch = jest.fn().mockImplementation(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
        }));
        global.fetch = mockFetch;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders initial state', () => {
        render(<ScanQR />);
        expect(screen.getByText(/Scan QR Code/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Start Scan/i })).toBeInTheDocument();
    });

    test('activates scanner on button click', () => {
        render(<ScanQR />);
        fireEvent.click(screen.getByRole('button', { name: /Start Scan/i }));
        expect(screen.getByTestId('qr-scanner-mock')).toBeInTheDocument();
    });

    test('processes successful scan', async () => {
        render(<ScanQR />);
        fireEvent.click(screen.getByRole('button', { name: /Start Scan/i }));

        // Simulate scan from mock component
        fireEvent.click(screen.getByText('Simulate Scan'));

        expect(fetch).toHaveBeenCalledWith('/api/visitors/123/check-in', expect.any(Object));

        await waitFor(() => {
            // Use specific test ID to avoid matching description text
            expect(screen.getByTestId('scan-result-status')).toHaveTextContent('Visitor Checked In');
        });
    });

    test('handles scan error from api', async () => {
        mockFetch.mockImplementationOnce(() => Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ message: 'Invalid Pass' })
        }));

        render(<ScanQR />);
        fireEvent.click(screen.getByRole('button', { name: /Start Scan/i }));
        fireEvent.click(screen.getByText('Simulate Scan'));

        await waitFor(() => {
            expect(screen.getByText(/Check-in Failed/i)).toBeInTheDocument();
            expect(screen.getByText('Invalid Pass')).toBeInTheDocument();
        });
    });

    test('handles closing scanner', () => {
        render(<ScanQR />);
        fireEvent.click(screen.getByRole('button', { name: /Start Scan/i }));
        expect(screen.getByTestId('qr-scanner-mock')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByTestId('qr-scanner-mock')).not.toBeInTheDocument();
    });
});
