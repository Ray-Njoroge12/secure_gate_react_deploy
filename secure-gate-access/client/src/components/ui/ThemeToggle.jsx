/**
 * Theme Toggle Component
 * Allows users to switch between light, dark, and system themes
 */

import React from 'react';
import Icon from './Icon.jsx';
import { useTheme, THEME_DENSITY } from '../../contexts/ThemeContext';

const buildThemeOptions = (THEMES) => ([
  { value: THEMES.LIGHT, iconName: 'sun', label: 'Light', description: 'Light mode with bright surfaces' },
  { value: THEMES.DARK, iconName: 'moon', label: 'Dark', description: 'Dark mode for lower-light environments' },
  { value: THEMES.SYSTEM, iconName: 'monitor', label: 'System', description: 'Follow your device preference' },
  { value: THEMES.HIGH_CONTRAST, iconName: 'accessibility', label: 'High Contrast', description: 'High-contrast light theme' },
  { value: THEMES.HIGH_CONTRAST_DARK, iconName: 'accessibility', label: 'High Contrast Dark', description: 'High-contrast dark theme' }
]);

const densityOptions = [
  { value: THEME_DENSITY.COMPACT, label: 'Compact', description: 'Fits more information in less space' },
  { value: THEME_DENSITY.COMFORTABLE, label: 'Comfortable', description: 'Balanced spacing for daily use' },
  { value: THEME_DENSITY.SPACIOUS, label: 'Spacious', description: 'More breathing room and larger targets' }
];

const sizeClasses = {
  sm: 'px-2.5 py-2 text-sm',
  md: 'px-3 py-2',
};

const ThemeToggle = ({ showLabel = false, variant = 'icon', className = '', size = 'md' }) => {
  const { theme, setTheme, isDark, THEMES } = useTheme();
  const themes = buildThemeOptions(THEMES);

  const currentTheme = themes.find((option) => option.value === theme) || themes[0];

  const handleToggle = () => {
    const currentIndex = themes.findIndex((option) => option.value === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].value);
  };

  if (variant === 'dropdown') {
    return (
      <div className={className}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="px-4 py-2 rounded-lg border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
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
      className={`flex items-center gap-2 rounded-lg transition-all min-h-[44px] min-w-[44px] ${sizeClasses[size] || sizeClasses.md} ${className}`}
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
  const { theme, setTheme, density, setDensity, THEMES, THEME_DENSITY } = useTheme();
  const themes = buildThemeOptions(THEMES);

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

      <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="layout-dashboard" className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">Layout Density</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {densityOptions.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDensity(value)}
              className={`rounded-lg border p-3 text-left transition-all ${
                density === value
                  ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-500 dark:bg-brand-900/20 dark:text-brand-100'
                  : 'border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200'
              }`}
              aria-pressed={density === value}
            >
              <span className="block font-medium">{label}</span>
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
              {value === THEME_DENSITY.SPACIOUS && (
                <span className="mt-2 inline-block text-[11px] font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  Best for accessibility
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeToggle;
