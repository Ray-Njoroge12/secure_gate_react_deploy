import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PanicButton from '../../../components/guard/PanicButton';
import emergencyService from '../../../services/emergencyService';
import notificationService from '../../../services/notificationService';

// Mock services
jest.mock('../../../services/emergencyService');
jest.mock('../../../services/notificationService');
jest.mock('../../../utils/logger'); // Silence logs

describe('PanicButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mocks
        emergencyService.triggerPanicButton.mockResolvedValue({
            success: true,
            data: { emergencyId: 123, cancelWindow: 30 }
        });
        emergencyService.cancelPanicAlert.mockResolvedValue({
            success: true
        });
        emergencyService.getCurrentLocation.mockResolvedValue({ lat: 0, lng: 0 });
        emergencyService.getPanicPrivacyInfo.mockResolvedValue({
            lastUpdated: '2023-01-01',
            policies: [{ item: 'Location', description: 'Captured once' }]
        });
    });

    test('renders idle state correctly', async () => {
        render(<PanicButton />);

        // Use waitFor to handle the useEffect privacy info fetch
        await waitFor(() => {
            expect(screen.getByLabelText(/Emergency Panic Button/i)).toBeInTheDocument();
        });
        expect(screen.queryByText(/Emergency Alert/i)).not.toBeInTheDocument();
    });

    test('opens confirmation modal on click', async () => {
        render(<PanicButton />);

        const button = await screen.findByLabelText(/Emergency Panic Button/i);
        fireEvent.click(button);

        expect(screen.getByText(/Emergency Alert/i)).toBeInTheDocument();
        expect(screen.getByText(/SEND ALERT/i)).toBeInTheDocument();
    });

    test('triggers panic alert on confirmation', async () => {
        render(<PanicButton gateId={99} />);

        // Open modal
        const button = await screen.findByLabelText(/Emergency Panic Button/i);
        fireEvent.click(button);

        // Confirm
        const confirmBtn = screen.getByText(/SEND ALERT/i);
        fireEvent.click(confirmBtn);

        // Check loading state
        expect(screen.getByText(/Sending emergency alert/i)).toBeInTheDocument();

        // Check triggered state after async
        await waitFor(() => {
            expect(screen.getByText(/ALERT SENT/i)).toBeInTheDocument();
        });

        expect(emergencyService.triggerPanicButton).toHaveBeenCalled();
        // first arg is location, second is gateId
        expect(emergencyService.triggerPanicButton).toHaveBeenCalledWith(
            expect.anything(),
            99
        );
    });

    test('handles trigger failure', async () => {
        emergencyService.triggerPanicButton.mockResolvedValue({
            success: false,
            message: 'Network error'
        });

        render(<PanicButton />);

        // Open and confirm
        fireEvent.click(await screen.findByLabelText(/Emergency Panic Button/i));
        fireEvent.click(screen.getByText(/SEND ALERT/i));

        await waitFor(() => {
            expect(screen.getByText(/Alert Failed/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
        expect(notificationService.error).toHaveBeenCalled();
    });

    test('allows cancellation within window', async () => {
        render(<PanicButton />);

        // Trigger flow
        fireEvent.click(await screen.findByLabelText(/Emergency Panic Button/i));
        fireEvent.click(screen.getByText(/SEND ALERT/i));

        await waitFor(() => {
            expect(screen.getByText(/ALERT SENT/i)).toBeInTheDocument();
        });

        // Click cancel
        const cancelBtn = screen.getAllByText(/Cancel/i).find(el => el.tagName === 'BUTTON');
        fireEvent.click(cancelBtn);

        expect(emergencyService.cancelPanicAlert).toHaveBeenCalledWith(123);

        await waitFor(() => {
            expect(screen.queryByText(/ALERT SENT/i)).not.toBeInTheDocument();
        });
        expect(notificationService.success).toHaveBeenCalled();
    });
});
