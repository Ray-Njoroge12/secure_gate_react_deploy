/**
 * Unit Tests for useTutorial Hook
 * 
 * Tests tutorial state management, progress tracking, and just-in-time help system.
 * 
 * Validates: Requirements 1.2, 1.3, 1.5, 1.6
 */

import { jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

import { AuthContext } from '../../contexts/AuthContext';
import useTutorial from '../../hooks/useTutorial';

// Mock dependencies
const mockAnalytics = {
  track: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
});

// Test data
const mockUser = {
  id: 1,
  role: 'resident',
  email: 'test@example.com',
  verified: true,
  created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
};

const mockNewUser = {
  id: 2,
  role: 'guard',
  email: 'newuser@example.com',
  verified: true,
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago (new user)
};

// Test wrapper
const createWrapper = (user = mockUser) => {
  const authContextValue = {
    user,
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn()
  };

  return ({ children }) => (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

describe('useTutorial Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.window = global.window || {};
    global.window.analytics = mockAnalytics;
    global.localStorage = localStorageMock;
    global.IntersectionObserver = mockIntersectionObserver;
    
    // Mock DOM methods
    document.querySelectorAll = jest.fn(() => []);
    document.querySelector = jest.fn(() => null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.currentTutorial).toBe(null);
      expect(result.current.completedTutorials).toEqual([]);
      expect(result.current.tutorialProgress).toEqual({});
      expect(result.current.justInTimeHelp).toBe(null);
    });

    test('should load saved progress from localStorage', () => {
      const savedProgress = {
        'dashboard-tutorial': {
          completedSteps: ['step-1', 'step-2'],
          completedAt: '2025-01-01T00:00:00.000Z'
        }
      };
      const savedCompleted = ['dashboard-tutorial'];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'tutorial_progress_1') {
          return JSON.stringify(savedProgress);
        }
        if (key === 'completed_tutorials_1') {
          return JSON.stringify(savedCompleted);
        }
        return null;
      });

      const { result } = renderHook(() => useTutorial({ persistProgress: true }), {
        wrapper: createWrapper()
      });

      expect(result.current.tutorialProgress).toEqual(savedProgress);
      expect(result.current.completedTutorials).toEqual(savedCompleted);
    });

    test('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useTutorial({ persistProgress: true }), {
        wrapper: createWrapper()
      });

      expect(result.current.tutorialProgress).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load tutorial progress:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Tutorial Management', () => {
    test('should start tutorial for valid context and role', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      act(() => {
        const started = result.current.startTutorial('dashboard', 'resident');
        expect(started).toBe(true);
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.currentTutorial).toEqual(
        expect.objectContaining({
          id: 'resident-dashboard',
          title: 'Your Resident Dashboard'
        })
      );

      expect(mockAnalytics.track).toHaveBeenCalledWith('Tutorial Started', {
        tutorialId: 'resident-dashboard',
        context: 'dashboard',
        role: 'resident',
        userId: 1
      });
    });

    test('should not start tutorial for invalid context', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      act(() => {
        const started = result.current.startTutorial('invalid-context', 'resident');
        expect(started).toBe(false);
      });

      expect(result.current.isActive).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('No tutorial found for context: invalid-context, role: resident');

      consoleSpy.mockRestore();
    });

    test('should not start already completed tutorial', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'completed_tutorials_1') {
          return JSON.stringify(['resident-dashboard']);
        }
        return null;
      });

      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      act(() => {
        const started = result.current.startTutorial('dashboard', 'resident');
        expect(started).toBe(false);
      });

      expect(result.current.isActive).toBe(false);
    });

    test('should complete tutorial and save progress', () => {
      const { result } = renderHook(() => useTutorial({ persistProgress: true }), {
        wrapper: createWrapper()
      });

      const tutorialData = {
        tutorialId: 'resident-dashboard',
        completedSteps: ['step-1', 'step-2', 'step-3'],
        totalSteps: 3
      };

      act(() => {
        result.current.completeTutorial(tutorialData);
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.currentTutorial).toBe(null);
      expect(result.current.completedTutorials).toContain('resident-dashboard');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tutorial_progress_1',
        expect.stringContaining('resident-dashboard')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'completed_tutorials_1',
        expect.stringContaining('resident-dashboard')
      );

      expect(mockAnalytics.track).toHaveBeenCalledWith('Tutorial Completed', {
        ...tutorialData,
        userId: 1
      });
    });

    test('should skip tutorial and track analytics', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      const tutorialData = {
        tutorialId: 'resident-dashboard',
        currentStep: 1,
        completedSteps: ['step-1']
      };

      act(() => {
        result.current.skipTutorial(tutorialData);
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.currentTutorial).toBe(null);

      expect(mockAnalytics.track).toHaveBeenCalledWith('Tutorial Skipped', {
        ...tutorialData,
        userId: 1
      });
    });

    test('should check if tutorial is completed', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'completed_tutorials_1') {
          return JSON.stringify(['resident-dashboard']);
        }
        return null;
      });

      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      expect(result.current.isTutorialCompleted('dashboard', 'resident')).toBe(true);
      expect(result.current.isTutorialCompleted('visitor-invite', 'resident')).toBe(false);
      expect(result.current.isTutorialCompleted('invalid-context', 'resident')).toBe(true); // Returns true for invalid contexts
    });

    test('should get tutorial progress', () => {
      const savedProgress = {
        'resident-dashboard': {
          completedSteps: ['step-1', 'step-2'],
          completedAt: '2025-01-01T00:00:00.000Z'
        }
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'tutorial_progress_1') {
          return JSON.stringify(savedProgress);
        }
        return null;
      });

      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      const progress = result.current.getTutorialProgress('resident-dashboard');
      expect(progress).toEqual(savedProgress['resident-dashboard']);
    });
  });

  describe('Auto-Start Functionality', () => {
    test('should auto-start tutorial for new users', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useTutorial({ 
        autoStart: true, 
        tutorialId: 'dashboard' 
      }), {
        wrapper: createWrapper(mockNewUser)
      });

      // Fast-forward past the 2-second delay
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.currentTutorial).toEqual(
        expect.objectContaining({
          id: 'guard-dashboard',
          title: 'Security Guard Dashboard'
        })
      );

      jest.useRealTimers();
    });

    test('should not auto-start for existing users', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useTutorial({ 
        autoStart: true, 
        tutorialId: 'dashboard' 
      }), {
        wrapper: createWrapper(mockUser) // User created 12 hours ago
      });

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      expect(result.current.isActive).toBe(false);

      jest.useRealTimers();
    });

    test('should not auto-start if tutorial already completed', () => {
      jest.useFakeTimers();

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'completed_tutorials_2') {
          return JSON.stringify(['guard-dashboard']);
        }
        return null;
      });

      const { result } = renderHook(() => useTutorial({ 
        autoStart: true, 
        tutorialId: 'dashboard' 
      }), {
        wrapper: createWrapper(mockNewUser)
      });

      act(() => {
        jest.advanceTimersByTime(2500);
      });

      expect(result.current.isActive).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Just-in-Time Help System', () => {
    test('should trigger just-in-time help', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      const mockElement = document.createElement('div');
      const helpContent = {
        id: 'help-1',
        title: 'Need help?',
        content: 'This is helpful information.',
        action: 'Click here to continue'
      };

      act(() => {
        result.current.triggerJustInTimeHelp(mockElement, helpContent);
      });

      expect(result.current.justInTimeHelp).toEqual({
        element: mockElement,
        content: helpContent,
        timestamp: expect.any(Number)
      });

      expect(mockAnalytics.track).toHaveBeenCalledWith('Just In Time Help Triggered', {
        helpId: 'help-1',
        userId: 1
      });
    });

    test('should auto-dismiss just-in-time help after timeout', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      const mockElement = document.createElement('div');
      const helpContent = {
        id: 'help-1',
        title: 'Need help?',
        content: 'This is helpful information.'
      };

      act(() => {
        result.current.triggerJustInTimeHelp(mockElement, helpContent);
      });

      expect(result.current.justInTimeHelp).not.toBe(null);

      // Fast-forward past the 10-second timeout
      act(() => {
        jest.advanceTimersByTime(10500);
      });

      expect(result.current.justInTimeHelp).toBe(null);

      jest.useRealTimers();
    });

    test('should set up intersection observer for help elements', () => {
      const mockElements = [
        { getAttribute: jest.fn(() => 'help-1') },
        { getAttribute: jest.fn(() => 'help-2') }
      ];

      document.querySelectorAll = jest.fn(() => mockElements);

      renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      expect(mockIntersectionObserver).toHaveBeenCalled();
      expect(mockIntersectionObserver().observe).toHaveBeenCalledTimes(2);
    });
  });

  describe('Utility Functions', () => {
    test('should reset tutorials', () => {
      const { result } = renderHook(() => useTutorial({ persistProgress: true }), {
        wrapper: createWrapper()
      });

      // Set some initial state
      act(() => {
        result.current.completeTutorial({
          tutorialId: 'test-tutorial',
          completedSteps: ['step-1'],
          totalSteps: 1
        });
      });

      expect(result.current.completedTutorials).toContain('test-tutorial');

      // Reset tutorials
      act(() => {
        result.current.resetTutorials();
      });

      expect(result.current.completedTutorials).toEqual([]);
      expect(result.current.tutorialProgress).toEqual({});
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tutorial_progress_1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('completed_tutorials_1');
    });

    test('should handle onComplete callback', () => {
      const mockOnComplete = jest.fn();

      const { result } = renderHook(() => useTutorial({ onComplete: mockOnComplete }), {
        wrapper: createWrapper()
      });

      const tutorialData = {
        tutorialId: 'test-tutorial',
        completedSteps: ['step-1'],
        totalSteps: 1
      };

      act(() => {
        result.current.completeTutorial(tutorialData);
      });

      expect(mockOnComplete).toHaveBeenCalledWith(tutorialData);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing user gracefully', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper(null)
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.completedTutorials).toEqual([]);
    });

    test('should handle localStorage save errors', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useTutorial({ persistProgress: true }), {
        wrapper: createWrapper()
      });

      act(() => {
        result.current.completeTutorial({
          tutorialId: 'test-tutorial',
          completedSteps: ['step-1'],
          totalSteps: 1
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save tutorial progress:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    test('should handle missing analytics gracefully', () => {
      global.window.analytics = undefined;

      const { result } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      act(() => {
        const started = result.current.startTutorial('dashboard', 'resident');
        expect(started).toBe(true);
      });

      // Should not throw error
      expect(result.current.isActive).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should disconnect intersection observer on unmount', () => {
      const { unmount } = renderHook(() => useTutorial(), {
        wrapper: createWrapper()
      });

      unmount();

      expect(mockIntersectionObserver().disconnect).toHaveBeenCalled();
    });
  });
});