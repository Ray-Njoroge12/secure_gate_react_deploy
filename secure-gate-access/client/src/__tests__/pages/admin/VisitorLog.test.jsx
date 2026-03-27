import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import VisitorLog from '../../../pages/admin/VisitorLog';

jest.mock('../../../contexts/ErrorContext', () => ({
  useError: () => ({
    handleError: jest.fn(),
    handleSuccess: jest.fn()
  })
}));

jest.mock('../../../services/adminService', () => ({
  getVisitorLogs: jest.fn().mockResolvedValue({ data: [] }),
  checkInVisitor: jest.fn(),
  checkOutVisitor: jest.fn()
}));

jest.mock('../../../components/ui', () => ({
  ResponsiveTable: ({ emptyMessage }) => <div>{emptyMessage}</div>,
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Input: (props) => <input {...props} />
}));

jest.mock('../../../components/common/ConfirmationDialog', () => () => null);

describe('VisitorLog', () => {
  test('renders visitors tab without crashing when no dialog action is selected', async () => {
    render(<VisitorLog estateId={null} />);

    await waitFor(() => {
      expect(screen.getByText('No visitor logs found.')).toBeInTheDocument();
    });
  });
});
