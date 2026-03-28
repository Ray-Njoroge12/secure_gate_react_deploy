/**
 * Cookie Consent Banner Component
 * GDPR-compliant cookie consent management
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import logger from 'utils/logger';

import api from '../utils/apiClient';

import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Checkbox } from './ui/Checkbox';
import Icon from './ui/Icon';
import { Label } from './ui/Label';

const CONSENT_VERSION = '1.1';

const CookieConsentBanner = () => {
  const location = useLocation();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  });
  const [loading, setLoading] = useState(false);
  const isAuthEntryRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/register/') ||
    location.pathname.startsWith('/bulk-register/') ||
    location.pathname.startsWith('/mfa/verify') ||
    location.pathname.startsWith('/mfa/setup');

  useEffect(() => {
    // Check if consent has already been given
    const savedConsent = localStorage.getItem('cookieConsent');
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsedConsent = JSON.parse(savedConsent);
        if (parsedConsent.version !== CONSENT_VERSION) {
          // Privacy policy text has been updated — re-prompt user
          localStorage.removeItem('cookieConsent');
          setShowBanner(true);
        } else {
          setConsent(parsedConsent);
        }
      } catch (error) {
        logger.error('Failed to parse saved consent:', error);
        setShowBanner(true);
      }
    }
  }, []);

  const handleAcceptAll = async () => {
    const allConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    
    await saveConsent(allConsent);
  };

  const handleRejectAll = async () => {
    const minimalConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    
    await saveConsent(minimalConsent);
  };

  const handleSavePreferences = async () => {
    await saveConsent(consent);
  };

  const saveConsent = async (consentData) => {
    try {
      setLoading(true);
      
      // Save to localStorage with version so future policy updates can re-prompt
      localStorage.setItem('cookieConsent', JSON.stringify({ ...consentData, version: CONSENT_VERSION }));
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
      
      // Send to backend if user is authenticated (uses httpOnly cookies)
      try {
        await api.post('/api/compliance/consent', {
            type: 'all',
            granted: true,
            version: '1.0',
            preferences: consentData
          });
      } catch (error) {
        logger.error('Failed to save consent to backend:', error);
      }
      
      setShowBanner(false);
      setShowSettings(false);
      
      // Trigger consent change event
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
        detail: consentData
      }));
      
    } catch (error) {
      logger.error('Failed to save consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = (type, checked) => {
    setConsent(prev => ({
      ...prev,
      [type]: checked
    }));
  };

  if (!showBanner || isAuthEntryRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/50 backdrop-blur-sm">
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Icon name="cookie" className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" aria-hidden="true" />
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Cookie Consent</h3>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content. 
                  By clicking "Accept All", you consent to our use of cookies. You can customize your 
                  preferences or learn more in our{' '}
                  <a href="/privacy-policy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>.
                </p>
              </div>

              {!showSettings ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleAcceptAll}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Icon name="check" className="h-4 w-4 mr-2" aria-hidden="true" />
                    Accept All
                  </Button>
                  
                  <Button
                    onClick={handleRejectAll}
                    disabled={loading}
                    variant="outline"
                  >
                    <Icon name="x" className="h-4 w-4 mr-2" aria-hidden="true" />
                    Reject All
                  </Button>
                  
                  <Button
                    onClick={() => setShowSettings(true)}
                    disabled={loading}
                    variant="outline"
                  >
                    <Icon name="settings" className="h-4 w-4 mr-2" aria-hidden="true" />
                    Customize
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                      <div className="space-y-1">
                        <Label className="font-medium">Necessary Cookies</Label>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Essential for the website to function properly
                        </p>
                      </div>
                      <Checkbox
                        checked={consent.necessary}
                        disabled={true}
                        className="opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                      <div className="space-y-1">
                        <Label className="font-medium">Analytics Cookies</Label>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Help us understand how visitors interact with our website
                        </p>
                      </div>
                      <Checkbox
                        checked={consent.analytics}
                        onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                      <div className="space-y-1">
                        <Label className="font-medium">Marketing Cookies</Label>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Used to deliver relevant advertisements and marketing campaigns
                        </p>
                      </div>
                      <Checkbox
                        checked={consent.marketing}
                        onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                      <div className="space-y-1">
                        <Label className="font-medium">Preference Cookies</Label>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Remember your preferences and settings
                        </p>
                      </div>
                      <Checkbox
                        checked={consent.preferences}
                        onCheckedChange={(checked) => handleConsentChange('preferences', checked)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleSavePreferences}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Icon name="check" className="h-4 w-4 mr-2" aria-hidden="true" />
                      Save Preferences
                    </Button>
                    
                    <Button
                      onClick={() => setShowSettings(false)}
                      disabled={loading}
                      variant="outline"
                    >
                      <Icon name="chevron-up" className="h-4 w-4 mr-2" aria-hidden="true" />
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsentBanner;
