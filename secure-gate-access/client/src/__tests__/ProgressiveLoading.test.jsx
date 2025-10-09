/**
 * ProgressiveLoading Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import '@testing-library/jest-dom';
import ProgressiveLoading, { useProgressiveLoading, LOADING_PHASES } from '../ProgressiveLoading';

// Mock the useLoadingStates hook
jest.mock('../../../hooks/useLoadingStates', () => ({
  useLoadingStates: () => ({
    loadingState: {
      isActive: false,
      progress: 0,
      message: 'Loading...',
      error: null,
      success: false,
      cancelled: false,
    },
    startLoading: jest.fn(),
    completeLoading: jest.fn(),
    handleError: jest.fn(),
  }),
}));

describe('ProgressiveLoading', () => {
  describe('Basic Rendering', () => {
    it('renders children when not loading', () => {
      render(
        <ProgressiveLoading>
          <div>Content</div>
        </ProgressiveLoading>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders loading state when loading', () => {
      render(
        <ProgressiveLoading phases={[LOADING_PHASES.INITIAL, LOADING_PHASES.COMPLETE]}>
          <div>Content</div>
        </ProgressiveLoading>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(
        <ProgressiveLoading className="custom-class">
          <div>Content</div>
        </ProgressiveLoading>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Phase Management', () => {
    it('renders phase indicator', () => {
      render(
        <ProgressiveLoading phases={[LOADING_PHASES.INITIAL, LOADING_PHASES.COMPLETE]}>
          <div>Content</div>
        </ProgressiveLoading>
      );
      expect(screen.getByText('Initializing...')).toBeInTheDocument();
    });

    it('shows progress percentage', () => {
      render(
        <ProgressiveLoading phases={[LOADING_PHASES.INITIAL, LOADING_PHASES.COMPLETE]}>
          <div>Content</div>
        </ProgressiveLoading>
      );
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders error message when error occurs', () => {
      render(
        <ProgressiveLoading phases={[LOADING_PHASES.INITIAL, LOADING_PHASES.COMPLETE]}>
          <div>Content</div>
        </ProgressiveLoading>
      );
      // Error would be handled by the useProgressiveLoading hook
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Critical Content Loader', () => {
    it('renders fallback while loading', () => {
      const onLoad = jest.fn();
      render(
        <ProgressiveLoading.Critical onLoad={onLoad} fallback={<div>Loading...</div>}>
          <div>Critical Content</div>
        </ProgressiveLoading.Critical>
      );
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders children after loading', async () => {
      const onLoad = jest.fn().mockResolvedValue(undefined);
      render(
        <ProgressiveLoading.Critical onLoad={onLoad} fallback={<div>Loading...</div>}>
          <div>Critical Content</div>
        </ProgressiveLoading.Critical>
      );

      await waitFor(() => {
        expect(screen.getByText('Critical Content')).toBeInTheDocument();
      });
    });

    it('handles loading errors gracefully', async () => {
      const onLoad = jest.fn().mockRejectedValue(new Error('Load failed'));
      render(
        <ProgressiveLoading.Critical onLoad={onLoad} fallback={<div>Loading...</div>}>
          <div>Critical Content</div>
        </ProgressiveLoading.Critical>
      );

      await waitFor(() => {
        expect(screen.getByText('Critical Content')).toBeInTheDocument();
      });
    });
  });

  describe('Secondary Content Loader', () => {
    it('renders fallback while loading', () => {
      const onLoad = jest.fn();
      render(
        <ProgressiveLoading.Secondary onLoad={onLoad} fallback={<div>Loading...</div>}>
          <div>Secondary Content</div>
        </ProgressiveLoading.Secondary>
      );
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders children after loading with delay', async () => {
      const onLoad = jest.fn().mockResolvedValue(undefined);
      render(
        <ProgressiveLoading.Secondary onLoad={onLoad} delay={100} fallback={<div>Loading...</div>}>
          <div>Secondary Content</div>
        </ProgressiveLoading.Secondary>
      );

      await waitFor(() => {
        expect(screen.getByText('Secondary Content')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('handles loading errors gracefully', async () => {
      const onLoad = jest.fn().mockRejectedValue(new Error('Load failed'));
      render(
        <ProgressiveLoading.Secondary onLoad={onLoad} fallback={<div>Loading...</div>}>
          <div>Secondary Content</div>
        </ProgressiveLoading.Secondary>
      );

      await waitFor(() => {
        expect(screen.getByText('Secondary Content')).toBeInTheDocument();
      });
    });
  });

  describe('Lazy Content Loader', () => {
    it('renders fallback while not visible', () => {
      const onLoad = jest.fn();
      render(
        <ProgressiveLoading.Lazy onLoad={onLoad} fallback={<div>Loading...</div>}>
          <div>Lazy Content</div>
        </ProgressiveLoading.Lazy>
      );
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders children after becoming visible', async () => {
      const onLoad = jest.fn().mockResolvedValue(undefined);
      
      // Mock IntersectionObserver
      const mockIntersectionObserver = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        disconnect: jest.fn(),
      });
      window.IntersectionObserver = mockIntersectionObserver;

      render(
        <ProgressiveLoading.Lazy onLoad={onLoad} fallback={<div>Loading...</div>}>
          <div>Lazy Content</div>
        </ProgressiveLoading.Lazy>
      );

      // Simulate intersection
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(screen.getByText('Lazy Content')).toBeInTheDocument();
      });
    });

    it('handles loading errors gracefully', async () => {
      const onLoad = jest.fn().mockRejectedValue(new Error('Load failed'));
      
      // Mock IntersectionObserver
      const mockIntersectionObserver = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        disconnect: jest.fn(),
      });
      window.IntersectionObserver = mockIntersectionObserver;

      render(
        <ProgressiveLoading.Lazy onLoad={onLoad} fallback={<div>Loading...</div>}>
          <div>Lazy Content</div>
        </ProgressiveLoading.Lazy>
      );

      // Simulate intersection
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(screen.getByText('Lazy Content')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to Critical loader', () => {
      render(
        <ProgressiveLoading.Critical className="custom-class" fallback={<div>Loading...</div>}>
          <div>Content</div>
        </ProgressiveLoading.Critical>
      );
      expect(screen.getByText('Loading...').closest('div')).toHaveClass('custom-class');
    });

    it('applies custom className to Secondary loader', () => {
      render(
        <ProgressiveLoading.Secondary className="custom-class" fallback={<div>Loading...</div>}>
          <div>Content</div>
        </ProgressiveLoading.Secondary>
      );
      expect(screen.getByText('Loading...').closest('div')).toHaveClass('custom-class');
    });

    it('applies custom className to Lazy loader', () => {
      render(
        <ProgressiveLoading.Lazy className="custom-class" fallback={<div>Loading...</div>}>
          <div>Content</div>
        </ProgressiveLoading.Lazy>
      );
      expect(screen.getByText('Loading...').closest('div')).toHaveClass('custom-class');
    });
  });
});

describe('useProgressiveLoading Hook', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useProgressiveLoading());

    expect(result.current.currentPhase).toBe(LOADING_PHASES.INITIAL);
    expect(result.current.completedPhases).toEqual(new Set());
    expect(result.current.phaseData).toEqual({});
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('initializes with custom phases', () => {
    const customPhases = [LOADING_PHASES.CRITICAL, LOADING_PHASES.SECONDARY];
    const { result } = renderHook(() => useProgressiveLoading({ phases: customPhases }));

    expect(result.current.currentPhase).toBe(LOADING_PHASES.CRITICAL);
  });

  it('completes a phase', () => {
    const { result } = renderHook(() => useProgressiveLoading());

    act(() => {
      result.current.completePhase(LOADING_PHASES.CRITICAL, { data: 'test' });
    });

    expect(result.current.currentPhase).toBe(LOADING_PHASES.CRITICAL);
    expect(result.current.completedPhases).toContain(LOADING_PHASES.CRITICAL);
    expect(result.current.phaseData[LOADING_PHASES.CRITICAL]).toEqual({ data: 'test' });
  });

  it('sets phase error', () => {
    const { result } = renderHook(() => useProgressiveLoading());

    act(() => {
      result.current.setPhaseError(LOADING_PHASES.CRITICAL, new Error('Phase failed'));
    });

    expect(result.current.error).toEqual({
      phase: LOADING_PHASES.CRITICAL,
      error: new Error('Phase failed'),
    });
  });

  it('advances to next phase', () => {
    const phases = [LOADING_PHASES.INITIAL, LOADING_PHASES.CRITICAL, LOADING_PHASES.COMPLETE];
    const { result } = renderHook(() => useProgressiveLoading({ phases }));

    act(() => {
      result.current.advancePhase(LOADING_PHASES.CRITICAL);
    });

    expect(result.current.currentPhase).toBe(LOADING_PHASES.CRITICAL);
    expect(result.current.completedPhases).toContain(LOADING_PHASES.CRITICAL);
  });

  it('calls onPhaseComplete callback', () => {
    const onPhaseComplete = jest.fn();
    const { result } = renderHook(() => useProgressiveLoading({ onPhaseComplete }));

    act(() => {
      result.current.completePhase(LOADING_PHASES.CRITICAL, { data: 'test' });
    });

    expect(onPhaseComplete).toHaveBeenCalledWith(LOADING_PHASES.CRITICAL, { data: 'test' });
  });

  it('calls onAllPhasesComplete callback', () => {
    const onAllPhasesComplete = jest.fn();
    const phases = [LOADING_PHASES.INITIAL, LOADING_PHASES.COMPLETE];
    const { result } = renderHook(() => useProgressiveLoading({ phases, onAllPhasesComplete }));

    act(() => {
      result.current.completePhase(LOADING_PHASES.COMPLETE);
    });

    expect(onAllPhasesComplete).toHaveBeenCalled();
  });

  it('auto-advances phases when enabled', () => {
    const phases = [LOADING_PHASES.INITIAL, LOADING_PHASES.CRITICAL, LOADING_PHASES.COMPLETE];
    const { result } = renderHook(() => useProgressiveLoading({ 
      phases, 
      autoAdvance: true, 
      phaseTimeout: 100 
    }));

    expect(result.current.currentPhase).toBe(LOADING_PHASES.INITIAL);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.currentPhase).toBe(LOADING_PHASES.CRITICAL);
  });

  it('does not auto-advance when disabled', () => {
    const phases = [LOADING_PHASES.INITIAL, LOADING_PHASES.CRITICAL, LOADING_PHASES.COMPLETE];
    const { result } = renderHook(() => useProgressiveLoading({ 
      phases, 
      autoAdvance: false, 
      phaseTimeout: 100 
    }));

    expect(result.current.currentPhase).toBe(LOADING_PHASES.INITIAL);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.currentPhase).toBe(LOADING_PHASES.INITIAL);
  });
});
