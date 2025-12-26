/**
 * useContactPicker Hook
 * P6: Browser Contact Picker API integration with graceful fallback
 * 
 * Supported: Chrome Android 80+, Edge Android
 * Fallback: Manual entry on unsupported browsers
 */

import { useState, useCallback } from 'react';

const useContactPicker = () => {
  const [isSupported, setIsSupported] = useState(() => {
    return 'contacts' in navigator && 'ContactsManager' in window;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pickContact = useCallback(async (options = {}) => {
    const {
      properties = ['name', 'tel'],
      multiple = false
    } = options;

    if (!isSupported) {
      setError('Contact picker not supported on this device/browser');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const contacts = await navigator.contacts.select(properties, { multiple });

      if (!contacts || contacts.length === 0) {
        return null;
      }

      // Format the contact(s)
      const formatted = contacts.map(contact => ({
        name: contact.name?.[0] || '',
        phone: contact.tel?.[0] || '',
        email: contact.email?.[0] || ''
      }));

      return multiple ? formatted : formatted[0];
    } catch (err) {
      if (err.name === 'SecurityError') {
        setError('Permission denied to access contacts');
      } else if (err.name === 'InvalidStateError') {
        setError('Contact picker is already open');
      } else if (err.name === 'TypeError') {
        setError('Invalid contact properties requested');
      } else {
        setError(err.message || 'Failed to pick contact');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSupported,
    pickContact,
    loading,
    error,
    clearError
  };
};

export default useContactPicker;
