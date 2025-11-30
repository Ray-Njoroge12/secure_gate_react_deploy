/**
 * @file i18n/index.js
 * @description Enhanced internationalization system with RTL support
 * Phase 4: i18n Expansion
 * 
 * Features:
 * - Multiple languages (EN, SW, FR, AR)
 * - RTL support for Arabic
 * - Pluralization
 * - Date/time formatting
 * - Number formatting
 * - Lazy loading of translations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Supported languages configuration
export const SUPPORTED_LANGUAGES = {
  en: { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: '🇬🇧', 
    dir: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
  },
  sw: { 
    code: 'sw', 
    name: 'Swahili', 
    nativeName: 'Kiswahili',
    flag: '🇰🇪', 
    dir: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  fr: { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français',
    flag: '🇫🇷', 
    dir: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  ar: { 
    code: 'ar', 
    name: 'Arabic', 
    nativeName: 'العربية',
    flag: '🇸🇦', 
    dir: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
};

// Default language
const DEFAULT_LANGUAGE = 'en';

// Storage key
const STORAGE_KEY = 'app_language';

// Create context
const I18nContext = createContext(null);

/**
 * Hook to access i18n functionality
 */
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Alias for backward compatibility
export const useLanguage = useI18n;

/**
 * Translation loader - loads translations for a language
 */
const loadTranslations = async (langCode) => {
  // In a production app, these would be loaded from separate JSON files
  // For now, we include them inline for simplicity
  const translations = {
    en: await import('./locales/en.json').then(m => m.default).catch(() => ({})),
    sw: await import('./locales/sw.json').then(m => m.default).catch(() => ({})),
    fr: await import('./locales/fr.json').then(m => m.default).catch(() => ({})),
    ar: await import('./locales/ar.json').then(m => m.default).catch(() => ({})),
  };
  
  return translations[langCode] || translations[DEFAULT_LANGUAGE];
};

/**
 * I18n Provider Component
 */
export const I18nProvider = ({ children, defaultLanguage = DEFAULT_LANGUAGE }) => {
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || defaultLanguage;
    }
    return defaultLanguage;
  });
  
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState('ltr');

  // Load translations when language changes
  useEffect(() => {
    const loadLang = async () => {
      setIsLoading(true);
      try {
        const trans = await loadTranslations(language);
        setTranslations(trans);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fall back to inline translations if loading fails
        setTranslations({});
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLang();
  }, [language]);

  // Update document attributes when language changes
  useEffect(() => {
    const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
    const dir = langConfig.dir;
    
    setDirection(dir);
    
    // Update HTML attributes
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    
    // Add RTL class for styling
    if (dir === 'rtl') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  // Set language function
  const setLanguage = useCallback((langCode) => {
    if (SUPPORTED_LANGUAGES[langCode]) {
      setLanguageState(langCode);
    } else {
      console.warn(`Language '${langCode}' is not supported`);
    }
  }, []);

  // Translation function
  const t = useCallback((key, params = {}) => {
    let translation = translations[key];
    
    // If translation not found, return key
    if (!translation) {
      return key;
    }
    
    // Handle pluralization
    if (typeof translation === 'object' && params.count !== undefined) {
      const count = params.count;
      if (count === 0 && translation.zero) {
        translation = translation.zero;
      } else if (count === 1 && translation.one) {
        translation = translation.one;
      } else if (translation.other) {
        translation = translation.other;
      }
    }
    
    // Replace parameters
    if (typeof translation === 'string') {
      Object.entries(params).forEach(([key, value]) => {
        translation = translation.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
    }
    
    return translation || key;
  }, [translations]);

  // Format date according to locale
  const formatDate = useCallback((date, options = {}) => {
    const langConfig = SUPPORTED_LANGUAGES[language];
    const locale = language === 'ar' ? 'ar-SA' : language;
    
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
      }).format(new Date(date));
    } catch {
      return date?.toString() || '';
    }
  }, [language]);

  // Format time according to locale
  const formatTime = useCallback((date, options = {}) => {
    const locale = language === 'ar' ? 'ar-SA' : language;
    
    try {
      return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        ...options,
      }).format(new Date(date));
    } catch {
      return date?.toString() || '';
    }
  }, [language]);

  // Format number according to locale
  const formatNumber = useCallback((number, options = {}) => {
    const locale = language === 'ar' ? 'ar-SA' : language;
    
    try {
      return new Intl.NumberFormat(locale, options).format(number);
    } catch {
      return number?.toString() || '';
    }
  }, [language]);

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = useCallback((date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const locale = language === 'ar' ? 'ar-SA' : language;
    
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      
      if (diffDays > 0) return rtf.format(-diffDays, 'day');
      if (diffHours > 0) return rtf.format(-diffHours, 'hour');
      if (diffMins > 0) return rtf.format(-diffMins, 'minute');
      return rtf.format(-diffSecs, 'second');
    } catch {
      // Fallback
      if (diffDays > 0) return `${diffDays} days ago`;
      if (diffHours > 0) return `${diffHours} hours ago`;
      if (diffMins > 0) return `${diffMins} minutes ago`;
      return 'Just now';
    }
  }, [language]);

  // Get current language config
  const languageConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  const value = {
    language,
    setLanguage,
    t,
    translations,
    isLoading,
    direction,
    isRTL: direction === 'rtl',
    languageConfig,
    supportedLanguages: Object.values(SUPPORTED_LANGUAGES),
    formatDate,
    formatTime,
    formatNumber,
    formatRelativeTime,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

/**
 * Language Selector Component
 */
export const LanguageSelector = ({ 
  className = '', 
  showFlags = true, 
  showNativeName = false,
  variant = 'dropdown' // dropdown | buttons | pills
}) => {
  const { language, setLanguage, supportedLanguages, isRTL } = useI18n();

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''} ${className}`}>
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors
              ${language === lang.code
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            aria-pressed={language === lang.code}
            aria-label={`Switch to ${lang.name}`}
          >
            {showFlags && <span className="mr-1">{lang.flag}</span>}
            {showNativeName ? lang.nativeName : lang.name}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={`inline-flex bg-gray-100 rounded-full p-1 ${className}`}>
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`
              px-3 py-1 rounded-full text-sm font-medium
              transition-colors
              ${language === lang.code
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
            aria-pressed={language === lang.code}
          >
            {showFlags && lang.flag}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown
  return (
    <div className={`relative ${className}`}>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="
          appearance-none
          px-3 py-2 pr-8
          bg-white border border-gray-300 rounded-lg
          text-sm font-medium text-gray-700
          cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
        "
        aria-label="Select Language"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {showFlags ? `${lang.flag} ` : ''}
            {showNativeName ? lang.nativeName : lang.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

/**
 * RTL-aware component wrapper
 */
export const RTLWrapper = ({ children, className = '' }) => {
  const { isRTL } = useI18n();
  
  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'} ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
};

/**
 * Translated text component
 */
export const Trans = ({ i18nKey, params = {}, as: Component = 'span', className = '' }) => {
  const { t } = useI18n();
  
  return (
    <Component className={className}>
      {t(i18nKey, params)}
    </Component>
  );
};

export default I18nProvider;
