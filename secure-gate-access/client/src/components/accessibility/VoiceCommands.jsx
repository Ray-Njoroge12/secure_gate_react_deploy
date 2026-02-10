/**
 * Voice Commands Component
 * 
 * Provides voice control for hands-free operation
 * Implements alternative input methods for accessibility
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider.jsx';
import './VoiceCommands.css';
import Button from '../ui/Button';

/**
 * Voice command definitions
 */
const VOICE_COMMANDS = {
  // Navigation commands
  'go to dashboard': () => window.location.href = '/dashboard',
  'go to visitors': () => window.location.href = '/visitors',
  'go to settings': () => window.location.href = '/settings',
  'go home': () => window.location.href = '/',
  
  // Action commands
  'create visitor': () => {
    const createButton = document.querySelector('[data-action="create-visitor"]');
    createButton?.click();
  },
  'save form': () => {
    const saveButton = document.querySelector('[type="submit"], [data-action="save"]');
    saveButton?.click();
  },
  'cancel': () => {
    const cancelButton = document.querySelector('[data-action="cancel"], [aria-label*="cancel"]');
    cancelButton?.click();
  },
  
  // Accessibility commands
  'increase text size': () => {
    const event = new CustomEvent('voice-command', { 
      detail: { command: 'increase-text-size' } 
    });
    document.dispatchEvent(event);
  },
  'decrease text size': () => {
    const event = new CustomEvent('voice-command', { 
      detail: { command: 'decrease-text-size' } 
    });
    document.dispatchEvent(event);
  },
  'toggle high contrast': () => {
    const event = new CustomEvent('voice-command', { 
      detail: { command: 'toggle-high-contrast' } 
    });
    document.dispatchEvent(event);
  },
  
  // Help commands
  'help': () => {
    const event = new CustomEvent('voice-command', { 
      detail: { command: 'show-help' } 
    });
    document.dispatchEvent(event);
  },
  'what can I say': () => {
    const event = new CustomEvent('voice-command', { 
      detail: { command: 'show-commands' } 
    });
    document.dispatchEvent(event);
  }
};

/**
 * Voice Commands Component
 */
export const VoiceCommands = ({ 
  className = '',
  enabled = true,
  continuous = true,
  language = 'en-US'
}) => {
  const { settings, announce } = useAccessibilityContext();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      setupRecognition();
    }
  }, []);

  // Setup speech recognition
  const setupRecognition = useCallback(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      announce('Voice commands activated', 'polite');
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript('');
      setConfidence(0);
    };

    recognition.onerror = (event) => {
      setError(event.error);
      setIsListening(false);
      
      let errorMessage = 'Voice recognition error';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not available';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied';
          break;
        case 'network':
          errorMessage = 'Network error occurred';
          break;
        default:
          errorMessage = `Voice recognition error: ${event.error}`;
      }
      
      announce(errorMessage, 'assertive');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
          setConfidence(result[0].confidence);
        } else {
          interimTranscript += transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
      
      if (finalTranscript) {
        processCommand(finalTranscript.toLowerCase().trim());
      }
    };
  }, [continuous, language, announce]);

  // Process voice command
  const processCommand = useCallback((command) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Find matching command
    const matchedCommand = Object.keys(VOICE_COMMANDS).find(cmd => 
      command.includes(cmd) || cmd.includes(command)
    );

    if (matchedCommand) {
      try {
        VOICE_COMMANDS[matchedCommand]();
        announce(`Executed command: ${matchedCommand}`, 'polite');
        setError(null);
      } catch (err) {
        setError('Command execution failed');
        announce('Command execution failed', 'assertive');
      }
    } else {
      // Try partial matches
      const partialMatch = Object.keys(VOICE_COMMANDS).find(cmd => {
        const cmdWords = cmd.split(' ');
        const inputWords = command.split(' ');
        return cmdWords.some(word => inputWords.includes(word));
      });

      if (partialMatch) {
        announce(`Did you mean: ${partialMatch}?`, 'polite');
      } else {
        announce('Command not recognized. Say "help" for available commands.', 'polite');
      }
    }

    // Auto-clear transcript after processing
    timeoutRef.current = setTimeout(() => {
      setTranscript('');
      setConfidence(0);
    }, 3000);
  }, [announce]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !enabled || !settings.voiceCommands) return;

    try {
      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start voice recognition');
      announce('Failed to start voice recognition', 'assertive');
    }
  }, [enabled, settings.voiceCommands, announce]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('Error stopping voice recognition:', err);
    }
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Handle voice command events
  useEffect(() => {
    const handleVoiceCommand = (event) => {
      const { command } = event.detail;
      
      switch (command) {
        case 'show-help':
          announce('Voice commands help opened', 'polite');
          break;
        case 'show-commands':
          const commandList = Object.keys(VOICE_COMMANDS).join(', ');
          announce(`Available commands: ${commandList}`, 'polite');
          break;
        default:
          break;
      }
    };

    document.addEventListener('voice-command', handleVoiceCommand);
    return () => document.removeEventListener('voice-command', handleVoiceCommand);
  }, [announce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      stopListening();
    };
  }, [stopListening]);

  // Don't render if not supported or not enabled
  if (!isSupported || !enabled || !settings.voiceCommands) {
    return null;
  }

  return (
    <div className={`voice-commands ${className}`}>
      <Button
        className={`voice-commands__toggle ${isListening ? 'voice-commands__toggle--active' : ''}`}
        onClick={toggleListening}
        aria-label={isListening ? 'Stop voice commands' : 'Start voice commands'}
        aria-pressed={isListening}
        title="Voice Commands (Alt+V)"
      >
        <span className="voice-commands__icon" aria-hidden="true">
          {isListening ? '🎤' : '🎙️'}
        </span>
        <span className="voice-commands__label">
          {isListening ? 'Listening...' : 'Voice Commands'}
        </span>
      </Button>

      {isListening && (
        <div className="voice-commands__status" role="status" aria-live="polite">
          {transcript && (
            <div className="voice-commands__transcript">
              <span className="voice-commands__transcript-label">Heard:</span>
              <span className="voice-commands__transcript-text">{transcript}</span>
              {confidence > 0 && (
                <span className="voice-commands__confidence">
                  ({Math.round(confidence * 100)}% confident)
                </span>
              )}
            </div>
          )}
          
          <div className="voice-commands__indicator">
            <div className="voice-commands__wave"></div>
            <div className="voice-commands__wave"></div>
            <div className="voice-commands__wave"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="voice-commands__error" role="alert">
          <span className="voice-commands__error-icon" aria-hidden="true">⚠️</span>
          <span className="voice-commands__error-text">{error}</span>
        </div>
      )}

      <div className="voice-commands__help">
        <details className="voice-commands__help-details">
          <summary className="voice-commands__help-summary">
            Available Voice Commands
          </summary>
          <ul className="voice-commands__help-list">
            {Object.keys(VOICE_COMMANDS).map((command, index) => (
              <li key={index} className="voice-commands__help-item">
                "{command}"
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
};

/**
 * Voice Commands Hook
 */
export const useVoiceCommands = () => {
  const { settings } = useAccessibilityContext();
  
  const registerCommand = useCallback((command, callback, description) => {
    VOICE_COMMANDS[command.toLowerCase()] = callback;
  }, []);

  const unregisterCommand = useCallback((command) => {
    delete VOICE_COMMANDS[command.toLowerCase()];
  }, []);

  return {
    isEnabled: settings.voiceCommands,
    registerCommand,
    unregisterCommand,
    availableCommands: Object.keys(VOICE_COMMANDS)
  };
};

export default VoiceCommands;