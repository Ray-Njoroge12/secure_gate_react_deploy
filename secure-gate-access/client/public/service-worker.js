// SecureGate Service Worker - Enhanced with Push Notifications
const CACHE_NAME = 'secure-gate-v2';
const STATIC_CACHE = 'secure-gate-static-v2';
const DYNAMIC_CACHE = 'secure-gate-dynamic-v2';

const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        console.log('[SW] Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('secure-gate-') && 
                   cacheName !== CACHE_NAME && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE;
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests (don't cache)
  if (event.request.url.includes('/api/')) return;
  
  // Skip WebSocket/SSE connections
  if (event.request.url.includes('/ws/') || event.request.url.includes('/sse/')) return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Clone the response for caching
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(response) {
          if (response) {
            return response;
          }
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ==================== PUSH NOTIFICATIONS ====================

// Push event - handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'SecureGate',
    body: 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'default',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
        data: payload.data || {}
      };
    }
  } catch (e) {
    console.warn('[SW] Error parsing push data:', e);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'secure-gate-notification',
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
    data: {
      ...data.data,
      url: data.data?.url || '/',
      notificationId: data.data?.id || Date.now()
    },
    actions: data.actions || getDefaultActions(data.type)
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Get default actions based on notification type
function getDefaultActions(type) {
  switch (type) {
    case 'visitor_arrival':
      return [
        { action: 'approve', title: '✓ Approve', icon: '/icons/approve.png' },
        { action: 'deny', title: '✕ Deny', icon: '/icons/deny.png' }
      ];
    case 'visitor_checkin':
      return [
        { action: 'view', title: 'View Details', icon: '/icons/view.png' }
      ];
    case 'security_alert':
      return [
        { action: 'acknowledge', title: 'Acknowledge', icon: '/icons/ack.png' },
        { action: 'escalate', title: 'Escalate', icon: '/icons/escalate.png' }
      ];
    case 'approval_request':
      return [
        { action: 'approve', title: '✓ Approve', icon: '/icons/approve.png' },
        { action: 'deny', title: '✕ Deny', icon: '/icons/deny.png' }
      ];
    default:
      return [
        { action: 'view', title: 'View', icon: '/icons/view.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
      ];
  }
}

// Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.action);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle different actions
  if (action === 'approve' || action === 'deny') {
    // Handle visitor approval/denial
    event.waitUntil(
      handleVisitorAction(action, data)
        .then(() => focusOrOpenWindow(data.url || '/'))
    );
    return;
  }

  if (action === 'acknowledge') {
    // Acknowledge security alert
    event.waitUntil(
      acknowledgeAlert(data.alertId)
        .then(() => focusOrOpenWindow('/dashboard/guard'))
    );
    return;
  }

  if (action === 'escalate') {
    event.waitUntil(
      escalateAlert(data.alertId)
        .then(() => focusOrOpenWindow('/dashboard/admin/incidents'))
    );
    return;
  }

  // Default: open the notification URL
  event.waitUntil(focusOrOpenWindow(data.url || '/'));
});

// Notification close event
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed');
  // Track notification dismissal for analytics
  const data = event.notification.data || {};
  if (data.notificationId) {
    trackNotificationDismissal(data.notificationId);
  }
});

// Focus existing window or open new one
async function focusOrOpenWindow(url) {
  const urlToOpen = new URL(url, self.location.origin).href;
  
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Check if there's already a window open
  for (const client of windowClients) {
    if (client.url === urlToOpen && 'focus' in client) {
      return client.focus();
    }
  }

  // Check if there's any window we can navigate
  for (const client of windowClients) {
    if ('navigate' in client && 'focus' in client) {
      await client.navigate(urlToOpen);
      return client.focus();
    }
  }

  // Open new window
  if (self.clients.openWindow) {
    return self.clients.openWindow(urlToOpen);
  }
}

// Handle visitor approval/denial action
async function handleVisitorAction(action, data) {
  try {
    const response = await fetch(`/api/visitors/${data.visitorId}/quick-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: action === 'approve' ? 'approve' : 'deny',
        notificationId: data.notificationId
      })
    });
    
    if (!response.ok) {
      throw new Error('Action failed');
    }
    
    // Show confirmation notification
    await self.registration.showNotification(
      action === 'approve' ? 'Visitor Approved' : 'Visitor Denied',
      {
        body: `Action completed successfully`,
        icon: '/favicon.ico',
        tag: 'action-confirmation',
        requireInteraction: false
      }
    );
  } catch (error) {
    console.error('[SW] Error handling visitor action:', error);
    await self.registration.showNotification('Action Failed', {
      body: 'Please try again from the app',
      icon: '/favicon.ico',
      tag: 'action-error'
    });
  }
}

// Acknowledge security alert
async function acknowledgeAlert(alertId) {
  if (!alertId) return;
  
  try {
    await fetch(`/api/incidents/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
  } catch (error) {
    console.error('[SW] Error acknowledging alert:', error);
  }
}

// Escalate security alert
async function escalateAlert(alertId) {
  if (!alertId) return;
  
  try {
    await fetch(`/api/incidents/${alertId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
  } catch (error) {
    console.error('[SW] Error escalating alert:', error);
  }
}

// Track notification dismissal
async function trackNotificationDismissal(notificationId) {
  try {
    await fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        notificationId,
        action: 'dismissed',
        timestamp: Date.now()
      })
    });
  } catch (error) {
    // Silent fail for analytics
    console.debug('[SW] Failed to track notification dismissal');
  }
}

// ==================== BACKGROUND SYNC ====================

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-visitor-actions') {
    event.waitUntil(syncVisitorActions());
  }
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Sync queued visitor actions
async function syncVisitorActions() {
  try {
    const db = await openDatabase();
    const actions = await getQueuedActions(db);
    
    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
          credentials: 'include'
        });
        
        if (response.ok) {
          await removeQueuedAction(db, action.id);
        }
      } catch (error) {
        console.warn('[SW] Failed to sync action:', action.id);
      }
    }
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// Sync notification preferences
async function syncNotifications() {
  // Placeholder for notification sync logic
  console.log('[SW] Syncing notifications...');
}

// Simple IndexedDB helpers
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SecureGateOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getQueuedActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['actions'], 'readonly');
    const store = transaction.objectStore('actions');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

function removeQueuedAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ==================== MESSAGE HANDLING ====================

// Handle messages from the main app
self.addEventListener('message', function(event) {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service worker loaded - Version:', CACHE_NAME);