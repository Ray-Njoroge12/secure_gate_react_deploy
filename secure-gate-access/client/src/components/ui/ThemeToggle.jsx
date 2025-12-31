/**
 * Theme Toggle Component
 * Allows users to switch between light, dark, and system themes
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = ({ showLabel = false, variant = 'icon', className = '' }) => {
  const { theme, setTheme, isDark, THEMES } = useTheme();

  const themes = [
    { value: THEMES.LIGHT, icon: Sun, label: 'Light' },
    { value: THEMES.DARK, icon: Moon, label: 'Dark' },
    { value: THEMES.SYSTEM, icon: Monitor, label: 'System' }
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const Icon = currentTheme.icon;

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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${className}`}
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        color: 'var(--color-text-primary)'
      }}
      aria-label={`Theme: ${currentTheme.label}`}
      title={`Current theme: ${currentTheme.label}`}
    >
      <Icon className="w-5 h-5" />
      {showLabel && <span className="text-sm">{currentTheme.label}</span>}
    </button>
  );
};

export default ThemeToggle;
