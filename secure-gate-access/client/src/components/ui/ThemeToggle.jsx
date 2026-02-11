/**
 * Theme Toggle Component
 * Allows users to switch between light, dark, and system themes
 */

import React from 'react';
import Icon from './Icon.jsx';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = ({ showLabel = false, variant = 'icon', className = '' }) => {
  const { theme, setTheme, isDark, THEMES } = useTheme();

  const themes = [
    { value: THEMES.LIGHT, iconName: 'sun', label: 'Light' },
    { value: THEMES.DARK, iconName: 'moon', label: 'Dark' },
    { value: THEMES.SYSTEM, iconName: 'monitor', label: 'System' }
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[0];

  const handleToggle = () => {
    const currentIndex = themes.findIndex(t => t.value === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].value);
  };

  if (variant === 'dropdown') {
    return (
      <div className={className}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="px-4 py-2 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-input-bg)',
            borderColor: 'var(--color-input-border)',
            color: 'var(--color-text-primary)'
          }}
        >
          {themes.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all min-h-[44px] min-w-[44px] ${className}`}
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        color: 'var(--color-text-primary)'
      }}
      aria-label={`Theme: ${currentTheme.label}`}
      title={`Current theme: ${currentTheme.label}`}
    >
      <Icon name={currentTheme.iconName} className="w-5 h-5" />
      {showLabel && <span className="text-sm font-medium">{currentTheme.label}</span>}
    </button>
  );
};

// Named export variants for different use cases
export const ThemeDropdown = (props) => <ThemeToggle variant="dropdown" {...props} />;

export const ThemeRadioGroup = ({ className = '' }) => {
  const { theme, setTheme, THEMES } = useTheme();

  const themes = [
    { value: THEMES.LIGHT, iconName: 'Sun', label: 'Light', description: 'Light mode with bright colors' },
    { value: THEMES.DARK, iconName: 'Moon', label: 'Dark', description: 'Dark mode with muted colors' },
    { value: THEMES.SYSTEM, iconName: 'Monitor', label: 'System', description: 'Follow system preference' }
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {themes.map(({ value, iconName, label, description }) => (
        <label
          key={value}
          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
            theme === value
              ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 dark:border-brand-600'
              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
          }`}
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={(e) => setTheme(e.target.value)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon name={iconName} className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              <span className="font-medium text-gray-900 dark:text-white">
                {label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          </div>
        </label>
      ))}
    </div>
  );
};

export default ThemeToggle;
