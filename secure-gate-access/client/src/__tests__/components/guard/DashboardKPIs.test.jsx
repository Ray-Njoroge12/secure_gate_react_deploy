import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DashboardKPIs from '../../../components/guard/DashboardKPIs';
import { fetchDashboardKPIs } from '../../../services/guardService';

jest.mock('../../../services/guardService', () => ({
  fetchDashboardKPIs: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('DashboardKPIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and renders KPI totals from guardService', async () => {
    fetchDashboardKPIs.mockResolvedValue({
      onPremise: 3,
      arrivingToday: 5,
      pendingApproval: 2,
      deniedToday: 1
    });

    render(<DashboardKPIs onFilterClick={jest.fn()} />);

    await waitFor(() => {
      expect(fetchDashboardKPIs).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Currently On-site')).toBeInTheDocument();
    expect(screen.getByText('Arriving Today')).toBeInTheDocument();
    expect(screen.getByText('Pending Checks')).toBeInTheDocument();
    expect(screen.getByText('Denied Entry')).toBeInTheDocument();
  });

  it('sends the correct filter id when a KPI card is clicked', async () => {
    const onFilterClick = jest.fn();
    fetchDashboardKPIs.mockResolvedValue({
      onPremise: 0,
      arrivingToday: 0,
      pendingApproval: 0,
      deniedToday: 0
    });

    render(<DashboardKPIs onFilterClick={onFilterClick} />);

    await waitFor(() => {
      expect(fetchDashboardKPIs).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('Pending Checks'));
    expect(onFilterClick).toHaveBeenCalledWith('pending');
  });
});
