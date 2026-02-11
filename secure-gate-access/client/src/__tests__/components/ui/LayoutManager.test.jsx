/**
 * Unit Tests: LayoutManager
 * Validates current LayoutManager contract (auth/responsive/accessibility hooks + interaction behavior)
 */

import React from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';

import { LayoutManager } from '../../../components/ui/LayoutManager';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../../hooks/useResponsive', () => ({
  useResponsive: jest.fn()
}));

jest.mock('../../../hooks/useAccessibility', () => ({
  useAccessibility: jest.fn()
}));

describe('LayoutManager', () => {
  const mockUseAuth = require('../../../contexts/AuthContext').useAuth;
  const mockUseResponsive = require('../../../hooks/useResponsive').useResponsive;
  const mockUseAccessibility = require('../../../hooks/useAccessibility').useAccessibility;

  const announce = jest.fn();

  const oneItemLayout = [
    { i: 'alpha', x: 0, y: 0, w: 3, h: 2 }
  ];

  const twoItemLayout = [
    { i: 'alpha', x: 0, y: 0, w: 3, h: 2 },
    { i: 'beta', x: 3, y: 0, w: 3, h: 2 }
  ];

  const renderLayout = (props = {}, children = null) => render(
    <LayoutManager layout={oneItemLayout} {...props}>
      {children || <div data-testid="widget-alpha">Alpha Widget</div>}
    </LayoutManager>
  );

  beforeEach(() => {
    announce.mockReset();

    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'resident' }
    });

    mockUseResponsive.mockReturnValue({
      breakpoint: 'lg'
    });

    mockUseAccessibility.mockReturnValue({
      isScreenReaderActive: false,
      isReducedMotionMode: false,
      announce
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders layout container and widgets for each layout item', () => {
    const { container } = render(
      <LayoutManager layout={twoItemLayout}>
        <div data-testid="widget-alpha">Alpha Widget</div>
        <div data-testid="widget-beta">Beta Widget</div>
      </LayoutManager>
    );

    expect(container.firstChild).toHaveClass('layout-manager');
    expect(screen.getByTestId('widget-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('widget-beta')).toBeInTheDocument();
    expect(container.querySelectorAll('.layout-item')).toHaveLength(2);
  });

  test('renders only children with matching layout index positions', () => {
    render(
      <LayoutManager layout={oneItemLayout}>
        <div data-testid="widget-alpha">Alpha Widget</div>
        <div data-testid="widget-beta">Beta Widget</div>
      </LayoutManager>
    );

    expect(screen.getByTestId('widget-alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('widget-beta')).not.toBeInTheDocument();
  });

  test('disables dragging when reduced motion mode is active', () => {
    mockUseAccessibility.mockReturnValue({
      isScreenReaderActive: false,
      isReducedMotionMode: true,
      announce
    });

    const { container } = renderLayout();
    const layoutItem = container.querySelector('.layout-item');

    expect(layoutItem).toHaveAttribute('draggable', 'false');
  });

  test('renders resize handles when resizing is enabled and screen-reader mode is off', () => {
    const { container } = renderLayout();

    expect(container.querySelectorAll('.resize-handle')).toHaveLength(3);
  });

  test('hides resize handles and adds keyboard instructions in screen-reader mode', () => {
    mockUseAccessibility.mockReturnValue({
      isScreenReaderActive: true,
      isReducedMotionMode: false,
      announce
    });

    const { container } = renderLayout();
    const layoutItem = container.querySelector('.layout-item');

    expect(container.querySelectorAll('.resize-handle')).toHaveLength(0);
    expect(layoutItem).toHaveAttribute('aria-label', expect.stringContaining('Use arrow keys to move, Ctrl+arrow keys to resize.'));
  });

  test('calls onLayoutChange on keyboard move when screen-reader mode is enabled', () => {
    mockUseAccessibility.mockReturnValue({
      isScreenReaderActive: true,
      isReducedMotionMode: false,
      announce
    });

    const onLayoutChange = jest.fn();
    const { container } = renderLayout({ onLayoutChange });
    const layoutItem = container.querySelector('.layout-item');

    fireEvent.keyDown(layoutItem, { key: 'ArrowRight' });

    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    const [newLayout, source] = onLayoutChange.mock.calls[0];
    expect(source).toBe('keyboard');
    expect(newLayout[0]).toMatchObject({ i: 'alpha', x: 1, y: 0, w: 3, h: 2 });
    expect(announce).toHaveBeenCalledWith('Widget moved to position 1, 0');
  });

  test('does not resize via keyboard shortcuts in screen-reader mode because resize is disabled', () => {
    mockUseAccessibility.mockReturnValue({
      isScreenReaderActive: true,
      isReducedMotionMode: false,
      announce
    });

    const onLayoutChange = jest.fn();
    const { container } = renderLayout({ onLayoutChange });
    const layoutItem = container.querySelector('.layout-item');

    fireEvent.keyDown(layoutItem, { key: 'ArrowDown', ctrlKey: true });

    expect(onLayoutChange).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalledWith('Widget resized to 3 by 3');
  });

  test('prevents drag for restricted roles and announces why', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 7, role: 'guard' }
    });

    const { container } = renderLayout({
      roleRestrictions: {
        guard: { preventDrag: ['alpha'] }
      }
    });
    const layoutItem = container.querySelector('.layout-item');

    const dragStartEvent = createEvent.dragStart(layoutItem);
    dragStartEvent.preventDefault = jest.fn();
    dragStartEvent.dataTransfer = {
      setData: jest.fn(),
      effectAllowed: ''
    };

    fireEvent(layoutItem, dragStartEvent);

    expect(dragStartEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Widget alpha cannot be moved');
  });
});
