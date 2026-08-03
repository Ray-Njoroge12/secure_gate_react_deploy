/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceCommands, { useVoiceCommands } from '../../components/accessibility/VoiceCommands.jsx';
import { renderHook, act } from '@testing-library/react';

// Mock AccessibilityProvider context
const mockAccessibilityContext = {
  settings: {
    voiceCommands: true
  },
  announce: jest.fn()
};

jest.mock('../../components/accessibility/AccessibilityProvider.jsx', () => ({
  useAccessibilityContext: () => mockAccessibilityContext
}));

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null
};

const mockSpeechRecognitionConstructor = jest.fn(() => mockSpeechRecognition);

beforeEach(() => {
  // Mock SpeechRecognition
  Object.defineProperty(window, 'SpeechRecognition', {
    writable: true,
    value: mockSpeechRecognitionConstructor
  });
  
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    writable: true,
    value: mockSpeechRecognitionConstructor
  });

  // Reset mocks
  jest.clearAllMocks();
  mockSpeechRecognition.start.mockClear();
  mockSpeechRecognition.stop.mockClear();
  
  // Mock window.location
  delete window.location;
  window.location = { href: '' };
});

afterEach(() => {
  // Clean up any event listeners
  document.removeEventListener('voice-command', jest.fn());
});

describe('VoiceCommands Component', () => {
  describe('Rendering', () => {
    test('renders voice commands toggle when supported and enabled', () => {
      render(<VoiceCommands enabled={true} />);
      
      expect(screen.getByRole('button', { name: /start voice commands/i })).toBeInTheDocument();
      expect(screen.getByText('Voice Commands')).toBeInTheDocument();
    });

    test('does not render when not supported', () => {
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;
      
      const { container } = render(<VoiceCommands enabled={true} />);
      
      expect(container.firstChild).toBeNull();
    });

    test('does not render when disabled', () => {
      const { container } = render(<VoiceCommands enabled={false} />);
      
      expect(container.firstChild).toBeNull();
    });

    test('does not render when voice commands setting disabled', () => {
      mockAccessibilityContext.settings.voiceCommands = false;
      
      const { container } = render(<VoiceCommands enabled={true} />);
      
      expect(container.firstChild).toBeNull();
    });

    test('applies custom className', () => {
      const { container } = render(<VoiceCommands className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('voice-commands', 'custom-class');
    });

    test('shows help section with available commands', () => {
      render(<VoiceCommands />);
      
      expect(screen.getByText('Available Voice Commands')).toBeInTheDocument();
      expect(screen.getByText('"go to dashboard"')).toBeInTheDocument();
      expect(screen.getByText('"create visitor"')).toBeInTheDocument();
      expect(screen.getByText('"help"')).toBeInTheDocument();
    });
  });

  describe('Speech Recognition Setup', () => {
    test('configures speech recognition with correct settings', () => {
      render(<VoiceCommands continuous={true} language="en-GB" />);
      
      expect(mockSpeechRecognitionConstructor).toHaveBeenCalled();
      expect(mockSpeechRecognition.continuous).toBe(true);
      expect(mockSpeechRecognition.interimResults).toBe(true);
      expect(mockSpeechRecognition.lang).toBe('en-GB');
      expect(mockSpeechRecognition.maxAlternatives).toBe(1);
    });

    test('sets up event handlers', () => {
      render(<VoiceCommands />);
      
      expect(mockSpeechRecognition.onstart).toBeDefined();
      expect(mockSpeechRecognition.onend).toBeDefined();
      expect(mockSpeechRecognition.onerror).toBeDefined();
      expect(mockSpeechRecognition.onresult).toBeDefined();
    });
  });

  describe('Voice Recognition Control', () => {
    test('starts listening when toggle clicked', async () => {
      const user = userEvent.setup();
      render(<VoiceCommands />);
      
      const toggleButton = screen.getByRole('button', { name: /start voice commands/i });
      await user.click(toggleButton);
      
      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    test('stops listening when toggle clicked while active', async () => {
      const user = userEvent.setup();
      render(<VoiceCommands />);
      
      const toggleButton = screen.getByRole('button', { name: /start voice commands/i });
      
      // Start listening
      await user.click(toggleButton);
      
      // Simulate recognition starting
      act(() => {
        mockSpeechRecognition.onstart();
      });
      
      // Stop listening
      await user.click(toggleButton);
      
      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });

    test('updates UI when listening starts', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onstart();
      });
      
      expect(screen.getByRole('button', { name: /stop voice commands/i })).toBeInTheDocument();
      expect(screen.getByText('Listening...')).toBeInTheDocument();
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Voice commands activated', 'polite');
    });

    test('updates UI when listening ends', () => {
      render(<VoiceCommands />);
      
      // Start listening
      act(() => {
        mockSpeechRecognition.onstart();
      });
      
      // End listening
      act(() => {
        mockSpeechRecognition.onend();
      });
      
      expect(screen.getByRole('button', { name: /start voice commands/i })).toBeInTheDocument();
      expect(screen.getByText('Voice Commands')).toBeInTheDocument();
    });

    test('shows listening indicator when active', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onstart();
      });
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('🎤')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles no-speech error', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onerror({ error: 'no-speech' });
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('No speech detected', 'assertive');
    });

    test('handles audio-capture error', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onerror({ error: 'audio-capture' });
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Microphone not available', 'assertive');
    });

    test('handles not-allowed error', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onerror({ error: 'not-allowed' });
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Microphone permission denied', 'assertive');
    });

    test('handles network error', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onerror({ error: 'network' });
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Network error occurred', 'assertive');
    });

    test('handles unknown error', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onerror({ error: 'unknown-error' });
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Voice recognition error: unknown-error', 'assertive');
    });

    test('displays error message in UI', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onerror({ error: 'no-speech' });
      });
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('No speech detected')).toBeInTheDocument();
    });

    test('handles start recognition failure', async () => {
      const user = userEvent.setup();
      mockSpeechRecognition.start.mockImplementation(() => {
        throw new Error('Start failed');
      });
      
      render(<VoiceCommands />);
      
      const toggleButton = screen.getByRole('button', { name: /start voice commands/i });
      await user.click(toggleButton);
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Failed to start voice recognition', 'assertive');
    });
  });

  describe('Speech Recognition Results', () => {
    test('processes interim results', () => {
      render(<VoiceCommands />);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'go to dash', confidence: 0.8 },
          isFinal: false
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      expect(screen.getByText('go to dash')).toBeInTheDocument();
    });

    test('processes final results and executes commands', () => {
      // Mock querySelector for navigation command
      const mockElement = { click: jest.fn() };
      document.querySelector = jest.fn(() => mockElement);
      
      render(<VoiceCommands />);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'go to dashboard', confidence: 0.9 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      expect(window.location.href).toBe('/dashboard');
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Executed command: go to dashboard', 'polite');
    });

    test('shows confidence level for results', () => {
      render(<VoiceCommands />);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'test command', confidence: 0.85 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      expect(screen.getByText('(85% confident)')).toBeInTheDocument();
    });

    test('handles unrecognized commands', () => {
      render(<VoiceCommands />);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'unknown command', confidence: 0.9 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith(
        'Command not recognized. Say "help" for available commands.',
        'polite'
      );
    });

    test('suggests partial matches for similar commands', () => {
      render(<VoiceCommands />);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'go dashboard', confidence: 0.9 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Did you mean: go to dashboard?', 'polite');
    });
  });

  describe('Voice Commands', () => {
    test('executes navigation commands', () => {
      render(<VoiceCommands />);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'go to visitors', confidence: 0.9 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      expect(window.location.href).toBe('/visitors');
    });

    test('executes action commands', () => {
      const mockElement = { click: jest.fn() };
      document.querySelector = jest.fn(() => mockElement);
      
      render(<VoiceCommands />);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'create visitor', confidence: 0.9 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      expect(document.querySelector).toHaveBeenCalledWith('[data-action="create-visitor"]');
      expect(mockElement.click).toHaveBeenCalled();
    });

    test('executes accessibility commands', () => {
      render(<VoiceCommands />);
      
      const eventListener = jest.fn();
      document.addEventListener('voice-command', eventListener);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'increase text size', confidence: 0.9 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { command: 'increase-text-size' }
        })
      );
    });

    test('handles command execution errors', () => {
      // Mock querySelector to return null
      document.querySelector = jest.fn(() => null);
      
      render(<VoiceCommands />);
      
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'create visitor', confidence: 0.9 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      // Should still announce successful execution even if element not found
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Executed command: create visitor', 'polite');
    });
  });

  describe('Voice Command Events', () => {
    test('handles show-help command event', () => {
      render(<VoiceCommands />);
      
      act(() => {
        const event = new CustomEvent('voice-command', {
          detail: { command: 'show-help' }
        });
        document.dispatchEvent(event);
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Voice commands help opened', 'polite');
    });

    test('handles show-commands event', () => {
      render(<VoiceCommands />);
      
      act(() => {
        const event = new CustomEvent('voice-command', {
          detail: { command: 'show-commands' }
        });
        document.dispatchEvent(event);
      });
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith(
        expect.stringContaining('Available commands:'),
        'polite'
      );
    });
  });

  describe('Cleanup', () => {
    test('stops recognition on unmount', () => {
      const { unmount } = render(<VoiceCommands />);
      
      // Start listening
      act(() => {
        mockSpeechRecognition.onstart();
      });
      
      unmount();
      
      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });

    test('clears timeouts on unmount', () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount } = render(<VoiceCommands />);
      
      // Trigger a command to set timeout
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'go to dashboard', confidence: 0.9 },
          isFinal: true
        }]
      };
      
      act(() => {
        mockSpeechRecognition.onresult(mockEvent);
      });
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Accessibility Features', () => {
    test('has proper ARIA attributes', () => {
      render(<VoiceCommands />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Start voice commands');
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('title', 'Voice Commands (Alt+V)');
    });

    test('updates ARIA attributes when listening', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onstart();
      });
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Stop voice commands');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    test('has live region for status updates', () => {
      render(<VoiceCommands />);
      
      act(() => {
        mockSpeechRecognition.onstart();
      });
      
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });
});

describe('useVoiceCommands Hook', () => {
  test('returns voice commands state and functions', () => {
    const { result } = renderHook(() => useVoiceCommands());
    
    expect(result.current.isEnabled).toBe(true);
    expect(typeof result.current.registerCommand).toBe('function');
    expect(typeof result.current.unregisterCommand).toBe('function');
    expect(Array.isArray(result.current.availableCommands)).toBe(true);
  });

  test('reflects settings state', () => {
    mockAccessibilityContext.settings.voiceCommands = false;
    
    const { result } = renderHook(() => useVoiceCommands());
    
    expect(result.current.isEnabled).toBe(false);
  });

  test('registers new commands', () => {
    const { result } = renderHook(() => useVoiceCommands());
    const mockCallback = jest.fn();
    
    act(() => {
      result.current.registerCommand('test command', mockCallback, 'Test description');
    });
    
    expect(result.current.availableCommands).toContain('test command');
  });

  test('unregisters commands', () => {
    const { result } = renderHook(() => useVoiceCommands());
    const mockCallback = jest.fn();
    
    act(() => {
      result.current.registerCommand('test command', mockCallback);
    });
    
    expect(result.current.availableCommands).toContain('test command');
    
    act(() => {
      result.current.unregisterCommand('test command');
    });
    
    expect(result.current.availableCommands).not.toContain('test command');
  });

  test('handles case insensitive command registration', () => {
    const { result } = renderHook(() => useVoiceCommands());
    const mockCallback = jest.fn();
    
    act(() => {
      result.current.registerCommand('Test Command', mockCallback);
    });
    
    expect(result.current.availableCommands).toContain('test command');
  });
});