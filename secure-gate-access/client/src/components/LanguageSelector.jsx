/**
 * @file LanguageSelector.jsx
 * @description Global language selector component with RTL support
 * Phase V5: Multi-Language & Legal Compliance
 * 
 * Supports: English (en), Kiswahili (sw), French (fr), Arabic (ar)
 * Features: RTL support, accessible dropdown, keyboard navigation
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Language Context
const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Supported languages with RTL information
const supportedLanguages = {
  en: { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: '🇬🇧', 
    dir: 'ltr' 
  },
  sw: { 
    code: 'sw', 
    name: 'Kiswahili', 
    nativeName: 'Kiswahili',
    flag: '🇰🇪', 
    dir: 'ltr' 
  },
  fr: { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français',
    flag: '🇫🇷', 
    dir: 'ltr' 
  },
  ar: { 
    code: 'ar', 
    name: 'Arabic', 
    nativeName: 'العربية',
    flag: '🇸🇦', 
    dir: 'rtl' 
  },
};

// Fallback translations for the language selector itself
const selectorTranslations = {
  en: { selectLanguage: 'Select Language', currentLanguage: 'Current language' },
  sw: { selectLanguage: 'Chagua Lugha', currentLanguage: 'Lugha ya sasa' },
  fr: { selectLanguage: 'Choisir la langue', currentLanguage: 'Langue actuelle' },
  ar: { selectLanguage: 'اختر اللغة', currentLanguage: 'اللغة الحالية' },
};

// Language Provider Component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    // Load from localStorage or default to 'en'
    return localStorage.getItem('app_language') || 'en';
  });
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations for the selected language
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const module = await import(`../i18n/locales/${language}.json`);
        setTranslations(module.default || {});
      } catch (error) {
        console.warn(`Failed to load translations for ${language}:`, error);
        // Fallback to English
        try {
          const fallback = await import('../i18n/locales/en.json');
          setTranslations(fallback.default || {});
        } catch {
          setTranslations({});
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  // Update document direction and language
  useEffect(() => {
    const langConfig = supportedLanguages[language] || supportedLanguages.en;
    
    // Save to localStorage
    localStorage.setItem('app_language', language);
    
    // Update HTML attributes
    document.documentElement.lang = language;
    document.documentElement.dir = langConfig.dir;
    
    // Add/remove RTL class
    if (langConfig.dir === 'rtl') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language]);

  // Translation function with nested key support
  const t = (key, params = {}) => {
    // Support nested keys like "common.welcome"
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
    
    // If no nested key found, try flat key
    if (value === undefined) {
      value = translations[key];
    }
    
    // Return key as fallback
    if (value === undefined) {
      return key;
    }
    
    // Handle pluralization
    if (typeof value === 'object' && params.count !== undefined) {
      const count = params.count;
      if (count === 0 && value.zero) {
        value = value.zero;
      } else if (count === 1 && value.one) {
        value = value.one;
      } else if (value.other) {
        value = value.other;
      }
    }
    
    // Replace parameters
    if (typeof value === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
      });
    }
    
    return value;
  };

  const setLanguage = (langCode) => {
    if (supportedLanguages[langCode]) {
      setLanguageState(langCode);
    } else {
      console.warn(`Language '${langCode}' is not supported`);
    }
  };

  const langConfig = supportedLanguages[language] || supportedLanguages.en;
  const isRTL = langConfig.dir === 'rtl';

  const value = {
    language,
    setLanguage,
    t,
    translations,
    isLoading,
    isRTL,
    direction: langConfig.dir,
    languageConfig: langConfig,
    supportedLanguages: Object.values(supportedLanguages),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Language Selector Component (UI) - Dropdown style
const LanguageSelector = ({ 
  className = '', 
  variant = 'dropdown', // 'dropdown' | 'buttons' | 'minimal'
  showNativeNames = true,
  showFlags = true 
}) => {
  const { language, setLanguage, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const currentLang = supportedLanguages[language] || supportedLanguages.en;
  const selectorText = selectorTranslations[language] || selectorTranslations.en;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleLanguageSelect = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  // Minimal variant - just a simple select
  if (variant === 'minimal') {
    return (
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className={`language-selector-minimal ${className}`}
        aria-label={selectorText.selectLanguage}
        style={{ direction: 'ltr' }}
      >
        {Object.values(supportedLanguages).map((lang) => (
          <option key={lang.code} value={lang.code}>
            {showFlags && lang.flag} {showNativeNames ? lang.nativeName : lang.name}
          </option>
        ))}
      </select>
    );
  }

  // Buttons variant - horizontal button group
  if (variant === 'buttons') {
    return (
      <div 
        className={`language-selector-buttons ${className}`}
        role="radiogroup"
        aria-label={selectorText.selectLanguage}
      >
        {Object.values(supportedLanguages).map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            className={`language-button ${language === lang.code ? 'active' : ''}`}
            role="radio"
            aria-checked={language === lang.code}
            title={lang.name}
          >
            {showFlags && <span className="flag">{lang.flag}</span>}
            <span className="code">{lang.code.toUpperCase()}</span>
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div 
      ref={dropdownRef}
      className={`language-selector-dropdown ${className} ${isOpen ? 'open' : ''}`}
      style={{ direction: 'ltr' }} // Keep dropdown LTR for consistency
    >
      <button
        className="language-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${selectorText.currentLanguage}: ${currentLang.name}`}
      >
        {showFlags && <span className="flag">{currentLang.flag}</span>}
        <span className="name">{showNativeNames ? currentLang.nativeName : currentLang.name}</span>
        <span className="chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path 
              d="M2.5 4.5L6 8L9.5 4.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <ul 
          className="language-dropdown-menu"
          role="listbox"
          aria-label={selectorText.selectLanguage}
        >
          {Object.values(supportedLanguages).map((lang) => (
            <li key={lang.code}>
              <button
                className={`language-option ${language === lang.code ? 'selected' : ''}`}
                onClick={() => handleLanguageSelect(lang.code)}
                role="option"
                aria-selected={language === lang.code}
              >
                {showFlags && <span className="flag">{lang.flag}</span>}
                <span className="name">{showNativeNames ? lang.nativeName : lang.name}</span>
                {lang.dir === 'rtl' && (
                  <span className="rtl-badge" aria-label="Right-to-left language">RTL</span>
                )}
                {language === lang.code && (
                  <span className="check" aria-hidden="true">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .language-selector-dropdown {
          position: relative;
          display: inline-block;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .language-selector-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          transition: all 0.2s ease;
        }

        .language-selector-trigger:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .language-selector-trigger:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
          border-color: #10b981;
        }

        .chevron {
          transition: transform 0.2s ease;
        }

        .language-selector-dropdown.open .chevron {
          transform: rotate(180deg);
        }

        .language-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          padding: 4px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          list-style: none;
          min-width: 180px;
          z-index: 1000;
          animation: slideDown 0.15s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .language-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          border-radius: 6px;
          transition: background-color 0.15s ease;
          text-align: left;
        }

        .language-option:hover {
          background: #f3f4f6;
        }

        .language-option.selected {
          background: #ecfdf5;
          color: #059669;
        }

        .flag {
          font-size: 16px;
        }

        .name {
          flex: 1;
        }

        .rtl-badge {
          font-size: 10px;
          padding: 2px 4px;
          background: #e5e7eb;
          border-radius: 4px;
          color: #6b7280;
        }

        .check {
          color: #10b981;
          font-weight: bold;
        }

        /* Buttons variant styles */
        .language-selector-buttons {
          display: flex;
          gap: 4px;
        }

        .language-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #6b7280;
          transition: all 0.15s ease;
        }

        .language-button:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .language-button.active {
          background: #ecfdf5;
          border-color: #10b981;
          color: #059669;
        }

        .language-button:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
        }

        /* Minimal variant styles */
        .language-selector-minimal {
          padding: 6px 24px 6px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 6px center;
          background-repeat: no-repeat;
          background-size: 16px;
        }

        .language-selector-minimal:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }
      `}</style>
    </div>
  );
};

export default LanguageSelector;
