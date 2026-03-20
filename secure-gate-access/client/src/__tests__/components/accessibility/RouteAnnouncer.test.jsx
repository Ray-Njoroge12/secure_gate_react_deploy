import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RouteAnnouncer from '../../../components/accessibility/RouteAnnouncer';

describe('RouteAnnouncer', () => {
  it('renders an element with role="status"', () => {
    render(
      <MemoryRouter>
        <RouteAnnouncer />
      </MemoryRouter>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(
      <MemoryRouter>
        <RouteAnnouncer />
      </MemoryRouter>
    );
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-atomic="true"', () => {
    render(
      <MemoryRouter>
        <RouteAnnouncer />
      </MemoryRouter>
    );
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-atomic', 'true');
  });

  it('has class sr-only', () => {
    render(
      <MemoryRouter>
        <RouteAnnouncer />
      </MemoryRouter>
    );
    const el = screen.getByRole('status');
    expect(el).toHaveClass('sr-only');
  });
});
