/**
 * @fileoverview Theme Toggle Component
 * @description A beautiful, accessible toggle button for switching between light/dark themes
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo } from 'react';
import { useTheme, THEMES } from '../../contexts/ThemeContext.jsx';
import './ThemeToggle.css';

/**
 * Theme Toggle Button Component
 * 
 * @description Provides a sleek, animated toggle for switching themes.
 * Supports three modes: Light, Dark, and System (auto-detect).
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size variant: 'small', 'medium', 'large'
 * @param {boolean} [props.showLabel=false] - Show text label next to icon
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} Theme toggle button
 * 
 * @example
 * // Simple usage
 * <ThemeToggle />
 * 
 * // With label
 * <ThemeToggle showLabel />
 * 
 * // Custom size
 * <ThemeToggle size="large" />
 */
const ThemeToggle = memo(function ThemeToggle({ 
  size = 'medium', 
  showLabel = false,
  className = '' 
}) {
  const { theme, resolvedTheme, toggleTheme, setTheme, isDark, THEMES: ThemeOptions } = useTheme();

  const sizeClasses = {
    small: 'theme-toggle--small',
    medium: 'theme-toggle--medium',
    large: 'theme-toggle--large'
  };

  const handleClick = () => {
    toggleTheme();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  };

  // Get display label based on current theme
  const getLabel = () => {
    switch (theme) {
      case ThemeOptions.DARK:
        return 'Dark mode';
      case ThemeOptions.LIGHT:
        return 'Light mode';
      case ThemeOptions.SYSTEM:
        return `System (${resolvedTheme})`;
      default:
        return 'Toggle theme';
    }
  };

  return (
    <button
      type="button"
      className={`theme-toggle ${sizeClasses[size]} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode. Currently: ${getLabel()}`}
      aria-pressed={isDark}
      title={getLabel()}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {/* Sun Icon */}
          <svg 
            className={`theme-toggle__icon theme-toggle__icon--sun ${!isDark ? 'active' : ''}`}
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          
          {/* Moon Icon */}
          <svg 
            className={`theme-toggle__icon theme-toggle__icon--moon ${isDark ? 'active' : ''}`}
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>
      </span>
      
      {showLabel && (
        <span className="theme-toggle__label">
          {getLabel()}
        </span>
      )}
    </button>
  );
});

/**
 * Theme Dropdown Component
 * 
 * @description Provides a dropdown selector for choosing between
 * Light, Dark, and System theme options.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} Theme dropdown selector
 */
export const ThemeDropdown = memo(function ThemeDropdown({ className = '' }) {
  const { theme, setTheme, THEMES: ThemeOptions } = useTheme();

  const options = [
    { value: ThemeOptions.LIGHT, label: 'Light', icon: '☀️' },
    { value: ThemeOptions.DARK, label: 'Dark', icon: '🌙' },
    { value: ThemeOptions.SYSTEM, label: 'System', icon: '💻' }
  ];

  return (
    <div className={`theme-dropdown ${className}`}>
      <label htmlFor="theme-select" className="theme-dropdown__label">
        Theme
      </label>
      <select
        id="theme-select"
        className="theme-dropdown__select"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        aria-label="Select theme"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

/**
 * Theme Radio Group Component
 * 
 * @description Provides radio buttons for theme selection,
 * ideal for settings pages.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.name='theme'] - Radio group name
 * @returns {JSX.Element} Theme radio group
 */
export const ThemeRadioGroup = memo(function ThemeRadioGroup({ 
  className = '',
  name = 'theme'
}) {
  const { theme, setTheme, THEMES: ThemeOptions } = useTheme();

  const options = [
    { 
      value: ThemeOptions.LIGHT, 
      label: 'Light', 
      description: 'Always use light theme',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )
    },
    { 
      value: ThemeOptions.DARK, 
      label: 'Dark', 
      description: 'Always use dark theme',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )
    },
    { 
      value: ThemeOptions.SYSTEM, 
      label: 'System', 
      description: 'Follow system preference',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    }
  ];

  return (
    <fieldset className={`theme-radio-group ${className}`}>
      <legend className="theme-radio-group__legend">Appearance</legend>
      <div className="theme-radio-group__options">
        {options.map(option => (
          <label 
            key={option.value} 
            className={`theme-radio-group__option ${theme === option.value ? 'active' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={theme === option.value}
              onChange={(e) => setTheme(e.target.value)}
              className="theme-radio-group__input"
            />
            <span className="theme-radio-group__icon">{option.icon}</span>
            <span className="theme-radio-group__content">
              <span className="theme-radio-group__label">{option.label}</span>
              <span className="theme-radio-group__description">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
});

export default ThemeToggle;
