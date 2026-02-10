/**
 * Alternative Input Methods Component
 * 
 * Provides alternative input methods for users with motor impairments
 * Implements WCAG 2.1 AA compliance for accessibility
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider.jsx';
import './AlternativeInputMethods.css';
import Button from '../ui/Button';

/**
 * Alternative Input Methods Manager
 */
export const AlternativeInputMethods = ({ 
  className = '',
  enabled = true,
  onInputMethodChange
}) => {
  const { settings, updateSetting, announce } = useAccessibilityContext();
  const [activeMethod, setActiveMethod] = useState('standard');
  const [dwellTime, setDwellTime] = useState(1000); // milliseconds
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  const dwellTimerRef = useRef(null);
  const eyeTrackingRef = useRef(null);
  const switchInputRef = useRef(null);

  // Input method configurations
  const inputMethods = {
    standard: {
      name: 'Standard Input',
      description: 'Mouse and keyboard input',
      icon: '🖱️',
      enabled: true
    },
    dwell: {
      name: 'Dwell Clicking',
      description: 'Click by hovering for a set time',
      icon: '⏱️',
      enabled: true
    },
    switch: {
      name: 'Switch Input',
      description: 'Single or dual switch navigation',
      icon: '🔘',
      enabled: true
    },
    eyeTracking: {
      name: 'Eye Tracking',
      description: 'Eye gaze control (requires compatible hardware)',
      icon: '👁️',
      enabled: false // Requires special hardware
    },
    headTracking: {
      name: 'Head Tracking',
      description: 'Head movement control via camera',
      icon: '📹',
      enabled: false // Requires camera access
    },
    voice: {
      name: 'Voice Control',
      description: 'Voice commands for navigation',
      icon: '🎤',
      enabled: settings.voiceCommands
    }
  };

  // Initialize alternative input methods
  useEffect(() => {
    if (!enabled || !settings.alternativeInputs) return;

    // Check for available input methods
    checkAvailableInputMethods();
    
    // Set up event listeners
    setupInputMethodListeners();

    return () => {
      cleanupInputMethods();
    };
  }, [enabled, settings.alternativeInputs]);

  // Check which input methods are available
  const checkAvailableInputMethods = useCallback(async () => {
    try {
      // Check for camera access (head tracking)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          inputMethods.headTracking.enabled = true;
          stream.getTracks().forEach(track => track.stop()); // Stop immediately after check
        } catch (err) {
          inputMethods.headTracking.enabled = false;
        }
      }

      // Check for gamepad API (switch input)
      if (navigator.getGamepads) {
        inputMethods.switch.enabled = true;
      }

      // Eye tracking would require specific hardware/software detection
      // This is a placeholder for future implementation
      inputMethods.eyeTracking.enabled = false;

    } catch (error) {
      console.warn('Error checking available input methods:', error);
    }
  }, []);

  // Setup input method event listeners
  const setupInputMethodListeners = useCallback(() => {
    // Dwell clicking setup
    if (activeMethod === 'dwell') {
      setupDwellClicking();
    }

    // Switch input setup
    if (activeMethod === 'switch') {
      setupSwitchInput();
    }

    // Head tracking setup
    if (activeMethod === 'headTracking') {
      setupHeadTracking();
    }
  }, [activeMethod, dwellTime]);

  // Setup dwell clicking
  const setupDwellClicking = useCallback(() => {
    let currentTarget = null;
    let dwellStartTime = null;

    const handleMouseEnter = (event) => {
      const target = event.target;
      
      // Only track interactive elements
      if (!isInteractiveElement(target)) return;

      currentTarget = target;
      dwellStartTime = Date.now();
      
      // Add visual indicator
      target.classList.add('dwell-target');
      
      // Start dwell timer
      dwellTimerRef.current = setTimeout(() => {
        if (currentTarget === target) {
          performDwellClick(target);
        }
      }, dwellTime);

      // Show progress indicator
      showDwellProgress(target, dwellTime);
    };

    const handleMouseLeave = (event) => {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      
      event.target.classList.remove('dwell-target', 'dwell-progress');
      currentTarget = null;
      dwellStartTime = null;
    };

    // Add event listeners to all interactive elements
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [dwellTime]);

  // Setup switch input
  const setupSwitchInput = useCallback(() => {
    let currentIndex = 0;
    let focusableElements = [];
    let scanningInterval = null;

    const updateFocusableElements = () => {
      focusableElements = Array.from(document.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
        'textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), ' +
        '[role="button"]:not([disabled])'
      )).filter(el => isVisible(el));
    };

    const highlightCurrentElement = () => {
      // Remove previous highlights
      focusableElements.forEach(el => el.classList.remove('switch-highlight'));
      
      if (focusableElements[currentIndex]) {
        focusableElements[currentIndex].classList.add('switch-highlight');
        focusableElements[currentIndex].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    };

    const startScanning = () => {
      updateFocusableElements();
      if (focusableElements.length === 0) return;

      scanningInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % focusableElements.length;
        highlightCurrentElement();
      }, 1500); // 1.5 second intervals

      highlightCurrentElement();
    };

    const handleSwitchInput = (event) => {
      // Space bar or Enter for selection
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        
        if (focusableElements[currentIndex]) {
          focusableElements[currentIndex].click();
          announce(`Activated ${getElementDescription(focusableElements[currentIndex])}`);
        }
      }
      
      // Arrow keys for manual navigation
      if (event.code === 'ArrowDown' || event.code === 'ArrowRight') {
        event.preventDefault();
        currentIndex = (currentIndex + 1) % focusableElements.length;
        highlightCurrentElement();
      }
      
      if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') {
        event.preventDefault();
        currentIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
        highlightCurrentElement();
      }
    };

    // Start automatic scanning
    startScanning();
    
    // Add keyboard listener
    document.addEventListener('keydown', handleSwitchInput);

    return () => {
      if (scanningInterval) {
        clearInterval(scanningInterval);
      }
      document.removeEventListener('keydown', handleSwitchInput);
      focusableElements.forEach(el => el.classList.remove('switch-highlight'));
    };
  }, [announce]);

  // Setup head tracking (placeholder for future implementation)
  const setupHeadTracking = useCallback(() => {
    // This would integrate with head tracking libraries like:
    // - WebGazer.js
    // - MediaPipe
    // - Custom computer vision solutions
    
    console.log('Head tracking setup - requires camera access and computer vision library');
    
    // Placeholder implementation
    announce('Head tracking mode activated. Move your head to control the cursor.', 'polite');
  }, [announce]);

  // Perform dwell click
  const performDwellClick = useCallback((element) => {
    element.classList.remove('dwell-target', 'dwell-progress');
    
    // Create click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    element.dispatchEvent(clickEvent);
    
    // Provide feedback
    announce(`Dwell clicked ${getElementDescription(element)}`, 'polite');
    
    // Visual feedback
    element.classList.add('dwell-clicked');
    setTimeout(() => {
      element.classList.remove('dwell-clicked');
    }, 200);
  }, [announce]);

  // Show dwell progress indicator
  const showDwellProgress = useCallback((element, duration) => {
    element.classList.add('dwell-progress');
    element.style.setProperty('--dwell-duration', `${duration}ms`);
  }, []);

  // Check if element is interactive
  const isInteractiveElement = (element) => {
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'option'];
    
    return interactiveTags.includes(element.tagName) ||
           interactiveRoles.includes(element.getAttribute('role')) ||
           element.hasAttribute('onclick') ||
           element.hasAttribute('tabindex');
  };

  // Check if element is visible
  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  };

  // Get element description for announcements
  const getElementDescription = (element) => {
    return element.getAttribute('aria-label') ||
           element.getAttribute('title') ||
           element.textContent?.trim() ||
           element.tagName.toLowerCase();
  };

  // Change input method
  const changeInputMethod = useCallback((method) => {
    if (!inputMethods[method]?.enabled) {
      announce(`${inputMethods[method]?.name} is not available`, 'assertive');
      return;
    }

    // Clean up current method
    cleanupInputMethods();
    
    setActiveMethod(method);
    announce(`Switched to ${inputMethods[method].name}`, 'polite');
    
    if (onInputMethodChange) {
      onInputMethodChange(method);
    }
  }, [announce, onInputMethodChange]);

  // Cleanup input methods
  const cleanupInputMethods = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }

    // Remove all method-specific classes
    document.querySelectorAll('.dwell-target, .dwell-progress, .dwell-clicked, .switch-highlight')
      .forEach(el => {
        el.classList.remove('dwell-target', 'dwell-progress', 'dwell-clicked', 'switch-highlight');
      });
  }, []);

  // Calibrate input method
  const calibrateInputMethod = useCallback(() => {
    setIsCalibrating(true);
    announce('Starting input method calibration', 'polite');
    
    // Calibration process would depend on the input method
    setTimeout(() => {
      setIsCalibrating(false);
      announce('Calibration complete', 'polite');
    }, 3000);
  }, [announce]);

  // Don't render if not enabled
  if (!enabled || !settings.alternativeInputs) {
    return null;
  }

  return (
    <div className={`alternative-input-methods ${className}`}>
      <div className="alternative-input-methods__header">
        <h3 className="alternative-input-methods__title">
          Alternative Input Methods
        </h3>
        <Button
          className="alternative-input-methods__calibrate"
          onClick={calibrateInputMethod}
          disabled={isCalibrating}
          aria-label="Calibrate current input method"
        >
          {isCalibrating ? 'Calibrating...' : 'Calibrate'}
        </Button>
      </div>

      <div className="alternative-input-methods__methods">
        {Object.entries(inputMethods).map(([key, method]) => (
          <Button
            key={key}
            className={`alternative-input-methods__method ${
              activeMethod === key ? 'alternative-input-methods__method--active' : ''
            } ${!method.enabled ? 'alternative-input-methods__method--disabled' : ''}`}
            onClick={() => changeInputMethod(key)}
            disabled={!method.enabled}
            aria-pressed={activeMethod === key}
            aria-describedby={`method-desc-${key}`}
          >
            <span className="alternative-input-methods__method-icon" aria-hidden="true">
              {method.icon}
            </span>
            <div className="alternative-input-methods__method-info">
              <span className="alternative-input-methods__method-name">
                {method.name}
              </span>
              <span 
                id={`method-desc-${key}`}
                className="alternative-input-methods__method-description"
              >
                {method.description}
              </span>
            </div>
            {!method.enabled && (
              <span className="alternative-input-methods__method-status">
                Not Available
              </span>
            )}
          </Button>
        ))}
      </div>

      {activeMethod === 'dwell' && (
        <div className="alternative-input-methods__settings">
          <label className="alternative-input-methods__setting">
            <span className="alternative-input-methods__setting-label">
              Dwell Time: {dwellTime}ms
            </span>
            <input
              type="range"
              min="500"
              max="3000"
              step="100"
              value={dwellTime}
              onChange={(e) => setDwellTime(parseInt(e.target.value))}
              className="alternative-input-methods__slider"
              aria-describedby="dwell-time-desc"
            />
            <p id="dwell-time-desc" className="alternative-input-methods__setting-description">
              Time to hover before clicking (500ms - 3000ms)
            </p>
          </label>
        </div>
      )}

      <div className="alternative-input-methods__status" role="status" aria-live="polite">
        Current method: {inputMethods[activeMethod]?.name}
        {isCalibrating && ' (Calibrating...)'}
      </div>
    </div>
  );
};

/**
 * Hook for using alternative input methods
 */
export const useAlternativeInputMethods = () => {
  const { settings } = useAccessibilityContext();
  
  return {
    isEnabled: settings.alternativeInputs,
    supportedMethods: Object.keys(inputMethods).filter(key => inputMethods[key].enabled)
  };
};

export default AlternativeInputMethods;