// PWA Manager Component - Orchestrates all PWA capabilities
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import backgroundSyncService from '../../services/backgroundSyncService';
import offlineService from '../../services/offlineService';
import pushNotificationService from '../../services/pushNotificationService';
import Button from '../ui/Button';

const PWAManager = ({ children }) => {
  const location = useLocation();
  const [pwaStatus, setPwaStatus] = useState({
    isOnline: navigator.onLine,
    isInstallable: false,
    isInstalled: false,
    hasNotificationPermission: false,
    hasPendingSyncs: false,
    offlineCapabilities: null
  });

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showSyncStatus, setShowSyncStatus] = useState(false);
  const [notificationPromptDismissed, setNotificationPromptDismissed] = useState(
    () => localStorage.getItem('notification-prompt-dismissed') === 'true'
  );
  const isAuthEntryRoute =
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/register/') ||
    location.pathname.startsWith('/bulk-register/') ||
    location.pathname.startsWith('/mfa/verify') ||
    location.pathname.startsWith('/mfa/setup');

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    initializePWA();
    setupEventListeners();
    
    return () => {
      cleanupEventListeners();
    };
    // Intentionally initialize once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializePWA = async () => {
    try {
      // Check installation status
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;

      // Get offline capabilities
      const offlineCapabilities = await offlineService.getOfflineCapabilities();

      // Get notification permission status
      const notificationStatus = pushNotificationService.getStatus();

      // Get sync status
      const syncStatus = await backgroundSyncService.getSyncStatus();

      setPwaStatus(prev => ({
        ...prev,
        isInstalled,
        hasNotificationPermission: notificationStatus.isPermissionGranted,
        hasPendingSyncs: syncStatus.totalPending > 0,
        offlineCapabilities
      }));

      // Show install banner if not installed and installable
      if (!isInstalled && !localStorage.getItem('pwa-install-dismissed')) {
        setTimeout(() => setShowInstallBanner(true), 5000);
      }

    } catch (error) {
      console.error('Error initializing PWA:', error);
    }
  };

  // ==================== EVENT LISTENERS ====================

  const setupEventListeners = () => {
    // Install prompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // App installed event
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Visibility change for sync
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Service worker events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Offline service events
    const removeOfflineListener = offlineService.addConnectionListener(handleConnectionChange);
    
    // Push notification events
    const removePushListener = pushNotificationService.addListener(handlePushEvent);
    
    // Background sync events
    const removeSyncListener = backgroundSyncService.addListener(handleSyncEvent);

    // Store cleanup functions
    window.pwaCleanup = () => {
      removeOfflineListener();
      removePushListener();
      removeSyncListener();
    };
  };

  const cleanupEventListeners = () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    }

    if (window.pwaCleanup) {
      window.pwaCleanup();
    }
  };

  // ==================== EVENT HANDLERS ====================

  const handleBeforeInstallPrompt = useCallback((event) => {
    event.preventDefault();
    setInstallPrompt(event);
    setPwaStatus(prev => ({ ...prev, isInstallable: true }));
  }, []);

  const handleAppInstalled = useCallback(() => {
    setInstallPrompt(null);
    setShowInstallBanner(false);
    setPwaStatus(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
    
    // Track installation
    if (window.gtag) {
      window.gtag('event', 'pwa_installed', {
        event_category: 'PWA',
        event_label: 'App Installation'
      });
    }
  }, []);

  const handleOnline = useCallback(() => {
    setPwaStatus(prev => ({ ...prev, isOnline: true }));
    setShowOfflineBanner(false);
    
    // Trigger sync when coming back online
    backgroundSyncService.checkPendingSyncs();
  }, []);

  const handleOffline = useCallback(() => {
    setPwaStatus(prev => ({ ...prev, isOnline: false }));
    setShowOfflineBanner(true);
    
    // Auto-hide offline banner after 5 seconds
    setTimeout(() => setShowOfflineBanner(false), 5000);
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && navigator.onLine) {
      // App became visible and online - check for syncs
      backgroundSyncService.checkPendingSyncs();
    }
  }, []);

  const handleServiceWorkerMessage = useCallback((event) => {
    const { type } = event.data || {};
    
    if (type === 'CACHE_UPDATED') {
      // Show update available notification
      showUpdateNotification();
    }
  }, []);

  const handleConnectionChange = useCallback((event, isOnline) => {
    setPwaStatus(prev => ({ ...prev, isOnline }));
    
    if (event === 'offline') {
      setShowOfflineBanner(true);
      setTimeout(() => setShowOfflineBanner(false), 5000);
    }
  }, []);

  const handlePushEvent = useCallback((event, _data) => {
    if (event === 'subscribed') {
      setPwaStatus(prev => ({ ...prev, hasNotificationPermission: true }));
    } else if (event === 'unsubscribed') {
      setPwaStatus(prev => ({ ...prev, hasNotificationPermission: false }));
    }
  }, []);

  const handleSyncEvent = useCallback((event, _data) => {
    if (event === 'sync_registered' || event === 'sync_failed') {
      setPwaStatus(prev => ({ ...prev, hasPendingSyncs: true }));
      setShowSyncStatus(true);
      setTimeout(() => setShowSyncStatus(false), 3000);
    } else if (event === 'sync_completed') {
      // Check if there are still pending syncs
      backgroundSyncService.getSyncStatus().then(status => {
        setPwaStatus(prev => ({ ...prev, hasPendingSyncs: status.totalPending > 0 }));
      });
    }
  }, []);

  // ==================== PWA ACTIONS ====================

  const installApp = async () => {
    if (!installPrompt) return;

    try {
      const result = await installPrompt.prompt();
      
      if (result.outcome === 'accepted') {
        setInstallPrompt(null);
        setShowInstallBanner(false);
      }
    } catch (error) {
      console.error('Error installing app:', error);
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const enableNotifications = async () => {
    try {
      const permission = await pushNotificationService.requestPermission();
      setPwaStatus(prev => ({ 
        ...prev, 
        hasNotificationPermission: permission === 'granted' 
      }));
    } catch (error) {
      console.error('Error enabling notifications:', error);
    }
  };

  const showUpdateNotification = () => {
    if ('serviceWorker' in navigator) {
      // Show update available banner
      const updateBanner = document.createElement('div');
      updateBanner.className = 'pwa-update-banner';

      const content = document.createElement('div');
      content.className = 'pwa-banner-content';

      const message = document.createElement('span');
      message.textContent = 'New version available!';

      const updateBtn = document.createElement('button');
      updateBtn.type = 'button';
      updateBtn.className = 'pwa-btn pwa-btn-primary';
      updateBtn.textContent = 'Update';
      updateBtn.addEventListener('click', () => window.location.reload());

      const dismissBtn = document.createElement('button');
      dismissBtn.type = 'button';
      dismissBtn.className = 'pwa-btn pwa-btn-secondary';
      dismissBtn.textContent = '×';
      dismissBtn.addEventListener('click', () => updateBanner.remove());

      content.appendChild(message);
      content.appendChild(updateBtn);
      content.appendChild(dismissBtn);
      updateBanner.appendChild(content);
      document.body.appendChild(updateBanner);
    }
  };

  // ==================== RENDER HELPERS ====================

  const renderInstallBanner = () => {
    if (isAuthEntryRoute) return null;
    if (!showInstallBanner || !pwaStatus.isInstallable) return null;

    return (
      <div className="pwa-install-banner">
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">📱</div>
          <div className="pwa-banner-text">
            <strong>Install SecureGate</strong>
            <p>Get quick access and offline features</p>
          </div>
          <div className="pwa-banner-actions">
            <Button 
              className="pwa-btn pwa-btn-primary" 
              onClick={installApp}
            >
              Install
            </Button>
            <Button 
              className="pwa-btn pwa-btn-secondary" 
              onClick={dismissInstallBanner}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderOfflineBanner = () => {
    if (isAuthEntryRoute) return null;
    if (!showOfflineBanner) return null;

    return (
      <div className="pwa-offline-banner">
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">📡</div>
          <div className="pwa-banner-text">
            <strong>You're offline</strong>
            <p>Some features are still available</p>
          </div>
          <Button 
            className="pwa-btn pwa-btn-outline" 
            onClick={() => setShowOfflineBanner(false)}
          >
            ×
          </Button>
        </div>
      </div>
    );
  };

  const renderSyncStatus = () => {
    if (isAuthEntryRoute) return null;
    if (!showSyncStatus || !pwaStatus.hasPendingSyncs) return null;

    return (
      <div className="pwa-sync-status">
        <div className="pwa-sync-content">
          <div className="pwa-sync-spinner"></div>
          <span>Syncing data...</span>
        </div>
      </div>
    );
  };

  const renderNotificationPrompt = () => {
    if (isAuthEntryRoute) return null;
    if (pwaStatus.hasNotificationPermission || notificationPromptDismissed) {
      return null;
    }

    return (
      <div className="pwa-notification-prompt">
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">🔔</div>
          <div className="pwa-banner-text">
            <strong>Stay updated</strong>
            <p>Get notified about visitor arrivals</p>
          </div>
          <div className="pwa-banner-actions">
            <Button 
              className="pwa-btn pwa-btn-primary" 
              onClick={enableNotifications}
            >
              Enable
            </Button>
            <Button 
              className="pwa-btn pwa-btn-secondary" 
              onClick={() => {
                localStorage.setItem('notification-prompt-dismissed', 'true');
                setNotificationPromptDismissed(true);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <div className="pwa-manager">
      {/* PWA Status Context */}
      <PWAContext.Provider value={{ pwaStatus, installApp, enableNotifications }}>
        {children}
      </PWAContext.Provider>

      {/* PWA UI Elements */}
      {renderInstallBanner()}
      {renderOfflineBanner()}
      {renderSyncStatus()}
      {renderNotificationPrompt()}

      {/* PWA Styles */}
      <style>{`
        .pwa-install-banner,
        .pwa-offline-banner,
        .pwa-notification-prompt {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, var(--color-info, #667eea) 0%, var(--color-brand-accent, #764ba2) 100%);
          color: white;
          z-index: 9999;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          animation: slideDown 0.3s ease-out;
        }

        .pwa-offline-banner {
          background: linear-gradient(135deg, var(--color-error, #ff6b6b) 0%, var(--color-error-dark, #ee5a24) 100%);
        }

        .pwa-banner-content {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          max-width: 1200px;
          margin: 0 auto;
          gap: 12px;
        }

        .pwa-banner-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .pwa-banner-text {
          flex: 1;
          min-width: 0;
        }

        .pwa-banner-text strong {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .pwa-banner-text p {
          font-size: 12px;
          opacity: 0.9;
          margin: 0;
        }

        .pwa-banner-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .pwa-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pwa-btn-primary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .pwa-btn-primary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .pwa-btn-secondary {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .pwa-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .pwa-btn-outline {
          background: transparent;
          color: white;
          border: none;
          font-size: 18px;
          padding: 4px 8px;
        }

        .pwa-sync-status {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          z-index: 9998;
          animation: fadeIn 0.3s ease-out;
        }

        .pwa-sync-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .pwa-sync-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .pwa-banner-content {
            padding: 10px 12px;
            gap: 8px;
          }

          .pwa-banner-actions {
            flex-direction: column;
            gap: 4px;
          }

          .pwa-btn {
            font-size: 11px;
            padding: 5px 10px;
          }

          .pwa-sync-status {
            bottom: 10px;
            right: 10px;
            left: 10px;
          }
        }
      `}</style>
    </div>
  );
};

// PWA Context for child components
export const PWAContext = React.createContext({
  pwaStatus: {
    isOnline: true,
    isInstallable: false,
    isInstalled: false,
    hasNotificationPermission: false,
    hasPendingSyncs: false,
    offlineCapabilities: null
  },
  installApp: () => {},
  enableNotifications: () => {}
});

export default PWAManager;
