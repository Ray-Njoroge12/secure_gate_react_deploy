import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import VisitorHistory from '../../../pages/resident/VisitorHistory';
import api from '../../../utils/apiClient';

const mockNavigate = jest.fn();
const mockConfirm = jest.fn();
const mockToastInfo = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
let lastResponsiveTableColumns = [];

let mockedVisitors = [
  {
    id: 1,
    name: 'Alice Resident Guest',
    status: 'pending',
    created_at: '2026-03-26T10:00:00.000Z'
  }
];

jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({
    toast: {
      info: mockToastInfo,
      error: mockToastError,
      success: mockToastSuccess
    }
  })
}));

jest.mock('../../../components/common/ConfirmationDialog', () => ({
  useConfirmation: () => ({
    confirm: mockConfirm,
    dialogProps: {},
    Dialog: () => null
  })
}));

jest.mock('../../../hooks/useVisitorEvents', () => ({
  VISITOR_EVENTS: {
    INVITED: 'visitor:invited',
    CHECK_IN: 'visitor:check_in',
    SELF_CHECK_IN: 'visitor:self_check_in',
    ARRIVAL: 'visitor:arrival'
  },
  useResidentVisitorEvents: () => ({ isConnected: true })
}));

jest.mock('../../../hooks/useSearch', () => ({
  useSearchData: (data = []) => ({
    data,
    pagination: { totalPages: 1, currentPage: 1 },
    searchTerm: '',
    setSearchTerm: jest.fn(),
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
    setPage: jest.fn(),
    setSort: jest.fn(),
    isSearching: false,
    hasFilters: false,
    hasResults: Array.isArray(data) && data.length > 0
  })
}));

jest.mock('../../../components/ui', () => ({
  Button: ({ children, onClick, ...props }) => (
    <button type="button" onClick={onClick} {...props}>{children}</button>
  ),
  SearchFilter: () => null,
  Pagination: () => null,
  PageHeader: ({ title }) => <h1>{title}</h1>,
  Icon: ({ name }) => <span>{name}</span>,
  ResponsiveTable: ({ data, columns = [], onRowClick }) => {
    lastResponsiveTableColumns = columns;

    return (
      <table>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} onClick={() => onRowClick(row)}>
            {columns.map((column) => (
              <td key={column.key}>
                {column.render
                  ? column.render(row[column.key], row, column)
                  : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      </table>
    );
  }
}));

jest.mock('../../../components/ui/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
      <div>
        <h2>{title}</h2>
        <button type="button" aria-label="close modal" onClick={onClose}>Close</button>
        {children}
      </div>
    );
  }
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('VisitorHistory resident pass and delete actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastResponsiveTableColumns = [];
    mockedVisitors = [
      {
        id: 1,
        name: 'Alice Resident Guest',
        status: 'pending',
        created_at: '2026-03-26T10:00:00.000Z'
      }
    ];

    mockConfirm.mockResolvedValue(true);
    api.delete.mockResolvedValue({ data: { success: true } });
    api.get.mockImplementation(() => Promise.resolve({
      data: {
        success: true,
        data: {
          visitors: mockedVisitors
        }
      }
    }));
  });

  test('opens dedicated resident pass route from shared details-action contract', async () => {
    render(
      <MemoryRouter>
        <VisitorHistory />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/visitors');
    });

    const detailButtons = screen.getAllByTestId('open-visitor-details');
    expect(detailButtons.length).toBeGreaterThan(0);
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('visitor-details-modal')).toBeInTheDocument();
    });

    const passButton = screen.getByRole('button', { name: /view pass \/ qr/i });
    fireEvent.click(passButton);

    expect(mockNavigate).toHaveBeenCalledWith('/resident/visitor-pass/1');
  });

  test('opens pass route from mobile card details action using shared selector', async () => {
    render(
      <MemoryRouter>
        <VisitorHistory />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/visitors');
    });

    const detailButtons = screen.getAllByTestId('open-visitor-details');
    expect(detailButtons.length).toBeGreaterThan(0);
    fireEvent.click(detailButtons[detailButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByTestId('visitor-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view pass \/ qr/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/resident/visitor-pass/1');
  });

  test('shows delete action only for eligible visitors', async () => {
    mockedVisitors = [
      {
        id: 1,
        name: 'Eligible Invite',
        status: 'pending_confirmation',
        created_at: '2026-03-26T10:00:00.000Z'
      },
      {
        id: 2,
        name: 'Checked In Visitor',
        status: 'checked_in',
        created_at: '2026-03-26T09:00:00.000Z'
      }
    ];

    render(
      <MemoryRouter>
        <VisitorHistory />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/visitors');
    });

    const deleteButtons = screen.getAllByTestId('delete-visitor-action');
    const hasEligibleButton = deleteButtons.some(
      (button) => button.getAttribute('data-visitor-id') === '1'
    );
    const hasIneligibleButton = deleteButtons.some(
      (button) => button.getAttribute('data-visitor-id') === '2'
    );

    expect(hasEligibleButton).toBe(true);
    expect(hasIneligibleButton).toBe(false);
  });

  test('keeps actions column visible for responsive table layouts where md shows priority <= 3', async () => {
    render(
      <MemoryRouter>
        <VisitorHistory />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/visitors');
    });

    const actionsColumn = lastResponsiveTableColumns.find((column) => column.key === 'actions');
    expect(actionsColumn).toBeDefined();
    expect(actionsColumn.priority).toBeLessThanOrEqual(3);
  });

  test('deletes an eligible visitor through single confirmation and updates count', async () => {
    mockedVisitors = [
      {
        id: 1,
        name: 'Delete Me',
        status: 'pending',
        created_at: '2026-03-26T10:00:00.000Z'
      },
      {
        id: 2,
        name: 'Keep Me',
        status: 'checked_in',
        created_at: '2026-03-26T11:00:00.000Z'
      }
    ];

    const nativeConfirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);

    render(
      <MemoryRouter>
        <VisitorHistory />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total: 2 visitors')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId('delete-visitor-action');
    const targetDeleteButton = deleteButtons.find(
      (button) => button.getAttribute('data-visitor-id') === '1'
    );
    expect(targetDeleteButton).toBeTruthy();

    fireEvent.click(targetDeleteButton);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });

    expect(nativeConfirmSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/visitors/1');
    });

    await waitFor(() => {
      expect(screen.getByText('Total: 1 visitors')).toBeInTheDocument();
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/deleted/i) })
    );

    nativeConfirmSpy.mockRestore();
  });
});
