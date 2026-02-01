/**
 * Accessibility Settings Component
 * 
 * Provides user interface for managing accessibility preferences
 * Implements WCAG 2.1 AA compliance features
 */

import React, { useState } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider.jsx';
import './AccessibilitySettings.css';

/**
 * Accessibility Settings Panel
 */
export const AccessibilitySettings = ({ 
  className = '',
  showAdvanced = false,
  onClose 
}) => {
  const {
    settings,
    updateSetting,
    toggleSetting,
    announce,
    checkColorContrast
  } = useAccessibilityContext();

  const [activeTab, setActiveTab] = useState('visual');
  const [testColors, setTestColors] = useState({
    foreground: '#000000',
    background: '#ffffff'
  });

  const tabs = [
    { id: 'visual', label: 'Visual', icon: '👁️' },
    { id: 'navigation', label: 'Navigation', icon: '⌨️' },
    { id: 'audio', label: 'Audio', icon: '🔊' },
    { id: 'interaction', label: 'Interaction', icon: '🖱️' }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    announce(`Switched to ${tabs.find(t => t.id === tabId)?.label} settings`);
  };

  const handleTextScaleChange = (value) => {
    const percentage = parseInt(value);
    updateSetting('textScaling', percentage);
    announce(`Text scaling set to ${percentage}%`);
  };

  const testColorContrast = () => {
    const ratio = checkColorContrast(testColors.foreground, testColors.background);
    const passes = ratio >= 4.5;
    
    announce(
      `Color contrast ratio is ${ratio.toFixed(2)}:1. ${passes ? 'Passes' : 'Fails'} WCAG AA standards`,
      'assertive'
    );
    
    return { ratio, passes };
  };

  return (
    <div className={`accessibility-settings ${className}`} role="dialog" aria-labelledby="accessibility-settings-title">
      <div className="accessibility-settings__header">
        <h2 id="accessibility-settings-title" className="accessibility-settings__title">
          Accessibility Settings
        </h2>
        {onClose && (
          <button
            className="accessibility-settings__close"
            onClick={onClose}
            aria-label="Close accessibility settings"
          >
            ✕
          </button>
        )}
      </div>

      <div className="accessibility-settings__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`accessibility-settings__tab ${activeTab === tab.id ? 'accessibility-settings__tab--active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="accessibility-settings__tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="accessibility-settings__content">
        {/* Visual Settings */}
        {activeTab === 'visual' && (
          <div id="panel-visual" role="tabpanel" aria-labelledby="tab-visual">
            <div className="accessibility-settings__section">
              <h3>Display Preferences</h3>
              
              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.highContrast}
                    onChange={() => toggleSetting('highContrast')}
                    aria-describedby="high-contrast-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">High Contrast Mode</span>
                </label>
                <p id="high-contrast-desc" className="accessibility-settings__description">
                  Increases color contrast for better visibility
                </p>
              </div>

              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={() => toggleSetting('reducedMotion')}
                    aria-describedby="reduced-motion-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Reduce Motion</span>
                </label>
                <p id="reduced-motion-desc" className="accessibility-settings__description">
                  Minimizes animations and transitions
                </p>
              </div>

              <div className="accessibility-settings__control">
                <label htmlFor="text-scaling" className="accessibility-settings__label">
                  Text Size: {settings.textScaling}%
                </label>
                <input
                  id="text-scaling"
                  type="range"
                  min="100"
                  max="200"
                  step="10"
                  value={settings.textScaling}
                  onChange={(e) => handleTextScaleChange(e.target.value)}
                  className="accessibility-settings__slider"
                  aria-describedby="text-scaling-desc"
                />
                <p id="text-scaling-desc" className="accessibility-settings__description">
                  Adjust text size from 100% to 200%
                </p>
              </div>
            </div>

            {showAdvanced && (
              <div className="accessibility-settings__section">
                <h3>Color Contrast Tester</h3>
                <div className="accessibility-settings__color-tester">
                  <div className="accessibility-settings__color-inputs">
                    <label>
                      Foreground:
                      <input
                        type="color"
                        value={testColors.foreground}
                        onChange={(e) => setTestColors(prev => ({ ...prev, foreground: e.target.value }))}
                      />
                    </label>
                    <label>
                      Background:
                      <input
                        type="color"
                        value={testColors.background}
                        onChange={(e) => setTestColors(prev => ({ ...prev, background: e.target.value }))}
                      />
                    </label>
                  </div>
                  <button onClick={testColorContrast} className="accessibility-settings__test-button">
                    Test Contrast
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Settings */}
        {activeTab === 'navigation' && (
          <div id="panel-navigation" role="tabpanel" aria-labelledby="tab-navigation">
            <div className="accessibility-settings__section">
              <h3>Keyboard Navigation</h3>
              
              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.keyboardNavigation}
                    onChange={() => toggleSetting('keyboardNavigation')}
                    aria-describedby="keyboard-nav-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Enhanced Keyboard Navigation</span>
                </label>
                <p id="keyboard-nav-desc" className="accessibility-settings__description">
                  Enables keyboard shortcuts and improved focus management
                </p>
              </div>

              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.skipLinks}
                    onChange={() => toggleSetting('skipLinks')}
                    aria-describedby="skip-links-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Skip Links</span>
                </label>
                <p id="skip-links-desc" className="accessibility-settings__description">
                  Shows navigation shortcuts for keyboard users
                </p>
              </div>

              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.focusIndicators}
                    onChange={() => toggleSetting('focusIndicators')}
                    aria-describedby="focus-indicators-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Enhanced Focus Indicators</span>
                </label>
                <p id="focus-indicators-desc" className="accessibility-settings__description">
                  Makes focus outlines more visible for keyboard navigation
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Audio Settings */}
        {activeTab === 'audio' && (
          <div id="panel-audio" role="tabpanel" aria-labelledby="tab-audio">
            <div className="accessibility-settings__section">
              <h3>Screen Reader Support</h3>
              
              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.screenReaderSupport}
                    onChange={() => toggleSetting('screenReaderSupport')}
                    aria-describedby="screen-reader-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Screen Reader Optimization</span>
                </label>
                <p id="screen-reader-desc" className="accessibility-settings__description">
                  Optimizes interface for screen reader users
                </p>
              </div>

              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.announcements}
                    onChange={() => toggleSetting('announcements')}
                    aria-describedby="announcements-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Live Announcements</span>
                </label>
                <p id="announcements-desc" className="accessibility-settings__description">
                  Announces important changes and updates
                </p>
              </div>

              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.descriptiveText}
                    onChange={() => toggleSetting('descriptiveText')}
                    aria-describedby="descriptive-text-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Descriptive Text</span>
                </label>
                <p id="descriptive-text-desc" className="accessibility-settings__description">
                  Provides additional context and descriptions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Interaction Settings */}
        {activeTab === 'interaction' && (
          <div id="panel-interaction" role="tabpanel" aria-labelledby="tab-interaction">
            <div className="accessibility-settings__section">
              <h3>Input & Timing</h3>
              
              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.extendedTimeouts}
                    onChange={() => toggleSetting('extendedTimeouts')}
                    aria-describedby="extended-timeouts-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Extended Timeouts</span>
                </label>
                <p id="extended-timeouts-desc" className="accessibility-settings__description">
                  Provides more time for form completion and interactions
                </p>
              </div>

              {settings.extendedTimeouts && (
                <div className="accessibility-settings__control">
                  <label htmlFor="timeout-extension-level" className="accessibility-settings__label">
                    Timeout Extension Level:
                  </label>
                  <select
                    id="timeout-extension-level"
                    value={settings.timeoutExtensionLevel}
                    onChange={(e) => updateSetting('timeoutExtensionLevel', e.target.value)}
                    className="accessibility-settings__select"
                  >
                    <option value="none">None (1x)</option>
                    <option value="moderate">Moderate (2x)</option>
                    <option value="extended">Extended (5x)</option>
                    <option value="unlimited">Unlimited (No timeout)</option>
                  </select>
                </div>
              )}

              <div className="accessibility-settings__control">
                <label className="accessibility-settings__toggle">
                  <input
                    type="checkbox"
                    checked={settings.alternativeInputs}
                    onChange={() => toggleSetting('alternativeInputs')}
                    aria-describedby="alternative-inputs-desc"
                  />
                  <span className="accessibility-settings__toggle-slider"></span>
                  <span className="accessibility-settings__toggle-label">Alternative Input Methods</span>
                </label>
                <p id="alternative-inputs-desc" className="accessibility-settings__description">
                  Enables alternative ways to interact with the interface
                </p>
              </div>

              {settings.alternativeInputs && (
                <div className="accessibility-settings__subsection">
                  <div className="accessibility-settings__control">
                    <label className="accessibility-settings__toggle">
                      <input
                        type="checkbox"
                        checked={settings.dwellClickingEnabled}
                        onChange={() => toggleSetting('dwellClickingEnabled')}
                        aria-describedby="dwell-clicking-desc"
                      />
                      <span className="accessibility-settings__toggle-slider"></span>
                      <span className="accessibility-settings__toggle-label">Dwell Clicking</span>
                    </label>
                    <p id="dwell-clicking-desc" className="accessibility-settings__description">
                      Click by hovering for a set time
                    </p>
                  </div>

                  {settings.dwellClickingEnabled && (
                    <div className="accessibility-settings__control">
                      <label htmlFor="dwell-time" className="accessibility-settings__label">
                        Dwell Time: {settings.dwellClickingTime}ms
                      </label>
                      <input
                        id="dwell-time"
                        type="range"
                        min="500"
                        max="3000"
                        step="100"
                        value={settings.dwellClickingTime}
                        onChange={(e) => updateSetting('dwellClickingTime', parseInt(e.target.value))}
                        className="accessibility-settings__slider"
                      />
                    </div>
                  )}

                  <div className="accessibility-settings__control">
                    <label className="accessibility-settings__toggle">
                      <input
                        type="checkbox"
                        checked={settings.switchInputEnabled}
                        onChange={() => toggleSetting('switchInputEnabled')}
                        aria-describedby="switch-input-desc"
                      />
                      <span className="accessibility-settings__toggle-slider"></span>
                      <span className="accessibility-settings__toggle-label">Switch Input</span>
                    </label>
                    <p id="switch-input-desc" className="accessibility-settings__description">
                      Single or dual switch navigation
                    </p>
                  </div>

                  {settings.switchInputEnabled && (
                    <div className="accessibility-settings__control">
                      <label htmlFor="switch-speed" className="accessibility-settings__label">
                        Scanning Speed: {settings.switchScanningSpeed}ms
                      </label>
                      <input
                        id="switch-speed"
                        type="range"
                        min="500"
                        max="5000"
                        step="100"
                        value={settings.switchScanningSpeed}
                        onChange={(e) => updateSetting('switchScanningSpeed', parseInt(e.target.value))}
                        className="accessibility-settings__slider"
                      />
                    </div>
                  )}
                </div>
              )}

              {showAdvanced && (
                <div className="accessibility-settings__control">
                  <label className="accessibility-settings__toggle">
                    <input
                      type="checkbox"
                      checked={settings.voiceCommands}
                      onChange={() => toggleSetting('voiceCommands')}
                      aria-describedby="voice-commands-desc"
                    />
                    <span className="accessibility-settings__toggle-slider"></span>
                    <span className="accessibility-settings__toggle-label">Voice Commands (Beta)</span>
                  </label>
                  <p id="voice-commands-desc" className="accessibility-settings__description">
                    Experimental voice control for hands-free operation
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="accessibility-settings__footer">
        <p className="accessibility-settings__info">
          These settings are saved locally and will persist across sessions.
        </p>
      </div>
    </div>
  );
};

export default AccessibilitySettings;