import { useState, useEffect, useCallback } from 'react';
import logger from 'utils/logger';

/**
 * Custom hook for managing localStorage with React state synchronization
 * @param {string} key - The localStorage key
 * @param {*} initialValue - Initial value if key doesn't exist
 * @returns {[any, function, function]} [value, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue = null) => {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}"`, { error, key });
      return initialValue;
    }
  });

  // Set value in both state and localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function for state-like updates
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (valueToStore === null || valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      logger.error(`Error setting localStorage key "${key}"`, error, { key, value });
    }
  }, [key, storedValue]);

  // Remove value from both state and localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(null);
      window.localStorage.removeItem(key);
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}"`, error, { key });
    }
  }, [key]);

  // Listen for changes to this key from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : null;
          setStoredValue(newValue);
        } catch (error) {
          logger.warn(`Error parsing localStorage value for key "${key}"`, { error, key });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
};

/**
 * Hook for managing user preferences/settings
 * @param {string} preferenceKey - Specific preference key
 * @param {*} defaultValue - Default value for the preference
 * @returns {[any, function, function]} [preference, setPreference, removePreference]
 */
export const useUserPreference = (preferenceKey, defaultValue = null) => {
  const [preferences, setPreferences] = useLocalStorage('userPreferences', {});

  const preference = preferences[preferenceKey] ?? defaultValue;

  const setPreference = useCallback((value) => {
    setPreferences(prev => ({
      ...prev,
      [preferenceKey]: value
    }));
  }, [preferenceKey, setPreferences]);

  const removePreference = useCallback(() => {
    setPreferences(prev => {
      const newPrefs = { ...prev };
      delete newPrefs[preferenceKey];
      return newPrefs;
    });
  }, [preferenceKey, setPreferences]);

  return [preference, setPreference, removePreference];
};

export default useLocalStorage;
