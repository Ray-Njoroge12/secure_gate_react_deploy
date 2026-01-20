import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VisitorInvitePage from '../../pages/public/VisitorInvitePage';
import { useVisitorInvite } from '../../hooks/useVisitorInvite';

// Mock the hook
jest.mock('../../hooks/useVisitorInvite');

// Mock components that might cause issues or aren't focus of this test
jest.mock('qrcode.react', () => ({
    QRCodeSVG: () => <div data-testid="qr-code">QR Code</div>
}));
jest.mock('../../components/visitor/VisitorDirections', () => () => <div>Directions</div>);

describe('VisitorInvitePage Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderPage = (token = 'test-token') => {
        return render(
            <MemoryRouter initialEntries={[`/v/${token}`]}>
                <Routes>
                    <Route path="/v/:token" element={<VisitorInvitePage />} />
                </Routes>
            </MemoryRouter>
        );
    };

    test('renders loading state initially', () => {
        useVisitorInvite.mockReturnValue({
            loading: true,
            error: null,
            visitor: null
        });

        renderPage();
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('renders error state', () => {
        useVisitorInvite.mockReturnValue({
            loading: false,
            error: 'Invite expired',
            visitor: null
        });

        renderPage();
        expect(screen.getByText(/Invite Not Available/i)).toBeInTheDocument(); // Header check
        expect(screen.getByText('Invite expired')).toBeInTheDocument();
    });

    test('renders valid visitor invite details', () => {
        const mockVisitor = {
            id: 1,
            name: 'John Doe',
            status: 'approved',
            dateOfVisit: '2025-10-10T10:00:00Z',
            tokenExpiresAt: '2025-10-11T10:00:00Z',
            resident: { name: 'Host User' },
            consent_given: true
        };
        const mockEstate = { name: 'Safe Estate' };

        useVisitorInvite.mockReturnValue({
            loading: false,
            error: null,
            visitor: mockVisitor,
            estateInfo: mockEstate,
            expiryCountdown: { expired: false, text: '24h remaining', color: 'green' },
            fetchVisitorDetails: jest.fn()
        });

        renderPage();

        expect(screen.getByText(/Welcome, John Doe/i)).toBeInTheDocument();
        expect(screen.getByText('Safe Estate')).toBeInTheDocument();
        expect(screen.getByTestId('qr-code')).toBeInTheDocument();
        expect(screen.getByText(/Visit Approved/i)).toBeInTheDocument();
    });

    test('renders confirmation flow for pending confirmation', () => {
        const mockVisitor = {
            id: 1,
            name: 'Jane Doe',
            status: 'pending_confirmation',
            consent_given: false
        };

        useVisitorInvite.mockReturnValue({
            loading: false,
            error: null,
            visitor: mockVisitor,
            fetchVisitorDetails: jest.fn()
        });

        renderPage();

        expect(screen.getByText(/You're Invited/i)).toBeInTheDocument();
        expect(screen.getByText(/Confirm & Get My Pass/i)).toBeInTheDocument();
    });
});
