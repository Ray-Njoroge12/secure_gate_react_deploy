# SecureGate Access Control System
## Implementation Guide for System Improvements

**Document Version:** 1.0  
**Created:** November 26, 2025  
**Purpose:** Step-by-step implementation guide for all planned improvements

---

## Quick Reference: Priority Matrix

| Priority | Feature | User Role | Effort | Impact |
|----------|---------|-----------|--------|--------|
| 🔴 P1 | Dark Mode | All | 2-3 days | High (Guards on night shift) |
| 🔴 P1 | Favorite Visitors | Resident | 3-5 days | High (Repeat visitor efficiency) |
| 🔴 P1 | WebSocket Full Integration | All | 3-4 days | High (Real-time UX) |
| 🔴 P1 | Push Notifications | Resident | 3-4 days | High (Mobile engagement) |
| 🟡 P2 | Enhanced QR Scanning | Guard | 2-3 days | Medium |
| 🟡 P2 | Admin Analytics Dashboard | Admin | 5-7 days | Medium |
| 🟡 P2 | Incident Reporting Enhancement | Guard | 3-4 days | Medium |
| 🟡 P2 | Session Management UI | All | 2-3 days | Medium |
| 🟢 P3 | Pre-Approval Rules | Resident | 4-6 days | Low-Medium |
| 🟢 P3 | Shift Handover | Guard | 4-5 days | Medium |
| 🟢 P3 | Gate Management | Admin | 3-4 days | Low |
| 🟢 P3 | Internationalization | All | 5-7 days | Low |

---

## Part 1: Priority 1 Implementations

### 1.1 Dark Mode Implementation

**Files to Create:**
1. `/client/src/contexts/ThemeContext.jsx`
2. `/client/src/components/ui/ThemeToggle.jsx`
3. `/client/src/styles/dark-theme.css`

**Files to Modify:**
1. `/client/src/styles/design-system.css` - Add dark theme variables
2. `/client/src/App.js` - Wrap with ThemeProvider
3. `/client/src/layouts/AppShell.jsx` - Add ThemeToggle to header
4. `/client/src/pages/*/Settings.jsx` - Add theme preference

#### Step 1: Create ThemeContext.jsx

```jsx
// /client/src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('sg-theme');
    if (saved) return saved;
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('sg-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = theme === 'dark' ? '#111827' : '#F9FAFB';
    }
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('sg-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
```

#### Step 2: Add Dark Theme CSS Variables

Add to `/client/src/styles/design-system.css` after the `:root` section:

```css
/* ============================================
   DARK THEME
   ============================================ */

[data-theme="dark"] {
  /* Background Colors */
  --color-bg-primary: #0F172A;      /* slate-900 */
  --color-bg-secondary: #1E293B;    /* slate-800 */
  --color-bg-tertiary: #334155;     /* slate-700 */
  --color-bg-hover: #334155;        /* slate-700 */
  --color-bg-subtle: #1E293B;       /* slate-800 */
  
  /* Text Colors */
  --color-text-primary: #F8FAFC;    /* slate-50 */
  --color-text-secondary: #CBD5E1;  /* slate-300 */
  --color-text-tertiary: #94A3B8;   /* slate-400 */
  --color-text-muted: #64748B;      /* slate-500 */
  --color-text-disabled: #475569;   /* slate-600 */
  
  /* Border Colors */
  --color-border-primary: #334155;  /* slate-700 */
  --color-border-secondary: #475569;/* slate-600 */
  --color-border-focus: #10B981;    /* green-500 (unchanged) */
  
  /* Semantic Colors - Slightly adjusted for dark backgrounds */
  --color-success-bg: rgba(16, 185, 129, 0.1);
  --color-error-bg: rgba(239, 68, 68, 0.1);
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-info-bg: rgba(59, 130, 246, 0.1);
  
  /* Shadows - Darker for dark mode */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
}

/* Specific component overrides for dark mode */
[data-theme="dark"] .card,
[data-theme="dark"] .bg-white {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-border-primary);
}

[data-theme="dark"] input,
[data-theme="dark"] select,
[data-theme="dark"] textarea {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border-primary);
  color: var(--color-text-primary);
}

[data-theme="dark"] input::placeholder {
  color: var(--color-text-muted);
}
```

#### Step 3: Create ThemeToggle Component

```jsx
// /client/src/components/ui/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle({ variant = 'icon' }) {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  if (variant === 'dropdown') {
    return (
      <div className="relative group">
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Theme settings"
        >
          {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
          <button
            onClick={() => setTheme('light')}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Sun size={16} /> Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Moon size={16} /> Dark
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('sg-theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              setTheme(prefersDark ? 'dark' : 'light');
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Monitor size={16} /> System
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={20} className="text-gray-600" />
      ) : (
        <Sun size={20} className="text-yellow-400" />
      )}
    </button>
  );
}
```

---

### 1.2 Favorite Visitors Feature

**Database Migration:**

```sql
-- Migration: 001_create_favorite_visitors.sql
CREATE TABLE IF NOT EXISTS favorite_visitors (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  category VARCHAR(50) DEFAULT 'general',
  notes TEXT,
  photo_url VARCHAR(500),
  visit_count INTEGER DEFAULT 0,
  last_visit_date TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_favorite_visitors_resident ON favorite_visitors(resident_id);
CREATE INDEX idx_favorite_visitors_category ON favorite_visitors(category);
CREATE INDEX idx_favorite_visitors_active ON favorite_visitors(resident_id, is_active);

-- Categories enum for reference
COMMENT ON COLUMN favorite_visitors.category IS 'Values: general, family, friend, contractor, delivery, service';
```

**Backend Service:**

```javascript
// /server/src/services/favoriteVisitorService.js
import db from '../database/databaseService.js';
import { AppError } from '../middleware/standardizedErrorHandler.js';

class FavoriteVisitorService {
  /**
   * Get all favorites for a resident
   */
  async getFavorites(residentId, options = {}) {
    const { category, search, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT id, name, phone, email, category, notes, photo_url, 
             visit_count, last_visit_date, created_at
      FROM favorite_visitors
      WHERE resident_id = $1 AND is_active = TRUE
    `;
    const params = [residentId];
    let paramCount = 2;
    
    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ` ORDER BY visit_count DESC, name ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Add a new favorite visitor
   */
  async addFavorite(residentId, data) {
    const { name, phone, email, category = 'general', notes, photo_url } = data;
    
    if (!name) {
      throw new AppError('Visitor name is required', 400, 'VALIDATION_ERROR');
    }
    
    // Check for duplicates
    const existing = await db.query(
      'SELECT id FROM favorite_visitors WHERE resident_id = $1 AND (phone = $2 OR email = $3) AND is_active = TRUE',
      [residentId, phone, email]
    );
    
    if (existing.rows.length > 0) {
      throw new AppError('This visitor already exists in your favorites', 409, 'DUPLICATE_ENTRY');
    }
    
    const result = await db.query(`
      INSERT INTO favorite_visitors (resident_id, name, phone, email, category, notes, photo_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [residentId, name, phone, email, category, notes, photo_url]);
    
    return result.rows[0];
  }

  /**
   * Update a favorite visitor
   */
  async updateFavorite(residentId, favoriteId, data) {
    const { name, phone, email, category, notes, photo_url } = data;
    
    const result = await db.query(`
      UPDATE favorite_visitors
      SET name = COALESCE($3, name),
          phone = COALESCE($4, phone),
          email = COALESCE($5, email),
          category = COALESCE($6, category),
          notes = COALESCE($7, notes),
          photo_url = COALESCE($8, photo_url),
          updated_at = NOW()
      WHERE id = $1 AND resident_id = $2 AND is_active = TRUE
      RETURNING *
    `, [favoriteId, residentId, name, phone, email, category, notes, photo_url]);
    
    if (result.rows.length === 0) {
      throw new AppError('Favorite visitor not found', 404, 'NOT_FOUND');
    }
    
    return result.rows[0];
  }

  /**
   * Remove a favorite (soft delete)
   */
  async removeFavorite(residentId, favoriteId) {
    const result = await db.query(`
      UPDATE favorite_visitors
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND resident_id = $2
      RETURNING id
    `, [favoriteId, residentId]);
    
    if (result.rows.length === 0) {
      throw new AppError('Favorite visitor not found', 404, 'NOT_FOUND');
    }
    
    return { success: true };
  }

  /**
   * Quick invite from favorite
   */
  async quickInviteFromFavorite(residentId, favoriteId, visitDetails) {
    const { dateOfVisit, timeOfVisit, purpose } = visitDetails;
    
    // Get favorite details
    const favorite = await db.query(
      'SELECT * FROM favorite_visitors WHERE id = $1 AND resident_id = $2 AND is_active = TRUE',
      [favoriteId, residentId]
    );
    
    if (favorite.rows.length === 0) {
      throw new AppError('Favorite visitor not found', 404, 'NOT_FOUND');
    }
    
    const fav = favorite.rows[0];
    
    // Create visitor invite
    const visitor = await db.query(`
      INSERT INTO visitors (name, phone, email, host_id, date_of_visit, time_of_visit, purpose, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')
      RETURNING *
    `, [fav.name, fav.phone, fav.email, residentId, dateOfVisit, timeOfVisit, purpose || 'Regular visit']);
    
    // Update favorite stats
    await db.query(`
      UPDATE favorite_visitors
      SET visit_count = visit_count + 1, last_visit_date = NOW()
      WHERE id = $1
    `, [favoriteId]);
    
    return visitor.rows[0];
  }
}

export default new FavoriteVisitorService();
```

**Backend Routes:**

```javascript
// Add to /server/src/routes/residentRoutes.js

import favoriteVisitorService from '../services/favoriteVisitorService.js';

// Get all favorites
router.get('/favorites', authenticateToken, asyncHandler(async (req, res) => {
  const { category, search, limit, offset } = req.query;
  const favorites = await favoriteVisitorService.getFavorites(
    req.user.id,
    { category, search, limit: Number(limit) || 50, offset: Number(offset) || 0 }
  );
  successResponse(res, { favorites }, 'Favorites retrieved successfully');
}));

// Add favorite
router.post('/favorites', authenticateToken, asyncHandler(async (req, res) => {
  const favorite = await favoriteVisitorService.addFavorite(req.user.id, req.body);
  createdResponse(res, { favorite }, 'Favorite added successfully');
}));

// Update favorite
router.put('/favorites/:id', authenticateToken, asyncHandler(async (req, res) => {
  const favorite = await favoriteVisitorService.updateFavorite(
    req.user.id, 
    req.params.id, 
    req.body
  );
  successResponse(res, { favorite }, 'Favorite updated successfully');
}));

// Delete favorite
router.delete('/favorites/:id', authenticateToken, asyncHandler(async (req, res) => {
  await favoriteVisitorService.removeFavorite(req.user.id, req.params.id);
  successResponse(res, {}, 'Favorite removed successfully');
}));

// Quick invite from favorite
router.post('/favorites/:id/invite', authenticateToken, asyncHandler(async (req, res) => {
  const visitor = await favoriteVisitorService.quickInviteFromFavorite(
    req.user.id,
    req.params.id,
    req.body
  );
  createdResponse(res, { visitor }, 'Invitation sent successfully');
}));
```

**Frontend Component:**

```jsx
// /client/src/pages/resident/FavoriteVisitors.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Input, Modal, EmptyState } from '../../components/ui';
import { Star, Plus, Edit2, Trash2, Send, User, Phone, Mail, Tag } from 'lucide-react';

const CATEGORIES = [
  { id: 'general', label: 'General', color: 'gray' },
  { id: 'family', label: 'Family', color: 'green' },
  { id: 'friend', label: 'Friend', color: 'blue' },
  { id: 'contractor', label: 'Contractor', color: 'orange' },
  { id: 'delivery', label: 'Delivery', color: 'purple' },
  { id: 'service', label: 'Service', color: 'teal' }
];

export default function FavoriteVisitors() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFavorites();
  }, [filter]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('category', filter);
      if (search) params.append('search', search);
      
      const res = await fetch(`/api/residents/favorites?${params}`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success) {
        setFavorites(data.data.favorites || []);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInvite = async (favorite) => {
    setSelectedFavorite(favorite);
    setShowInviteModal(true);
  };

  const handleSendInvite = async (inviteData) => {
    try {
      const res = await fetch(`/api/residents/favorites/${selectedFavorite.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(inviteData)
      });
      
      const data = await res.json();
      if (data.success) {
        setShowInviteModal(false);
        setSelectedFavorite(null);
        // Show success notification
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Favorite Visitors
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quickly invite your frequent visitors
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={20} className="mr-2" />
          Add Favorite
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === cat.id 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Favorites Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-700 rounded-xl h-48" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No favorites yet"
          description="Add your frequent visitors for quick one-tap invitations"
          action={
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={20} className="mr-2" />
              Add Your First Favorite
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map(favorite => (
            <FavoriteCard
              key={favorite.id}
              favorite={favorite}
              onInvite={() => handleQuickInvite(favorite)}
              onEdit={() => {/* Edit handler */}}
              onDelete={() => {/* Delete handler */}}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {/* Quick Invite Modal */}
    </div>
  );
}

// Favorite Card Component
function FavoriteCard({ favorite, onInvite, onEdit, onDelete }) {
  const category = CATEGORIES.find(c => c.id === favorite.category) || CATEGORIES[0];
  
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <User size={24} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{favorite.name}</h3>
            <Badge variant={category.color} size="sm">{category.label}</Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
            <Edit2 size={16} className="text-gray-500" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      </div>
      
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4">
        {favorite.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} />
            <span>{favorite.phone}</span>
          </div>
        )}
        {favorite.email && (
          <div className="flex items-center gap-2">
            <Mail size={14} />
            <span>{favorite.email}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {favorite.visit_count} visits
        </span>
        <Button size="sm" onClick={onInvite}>
          <Send size={14} className="mr-1" />
          Quick Invite
        </Button>
      </div>
    </Card>
  );
}
```

---

### 1.3 WebSocket Full Integration

**Frontend Hook:**

```javascript
// /client/src/hooks/useWebSocket.js
import { useEffect, useCallback, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const SOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';

export const useWebSocket = (config = {}) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const handlersRef = useRef({});

  // Initialize connection
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
      
      // Join role-based room
      socket.emit('join:role', { role: user.role, userId: user.id });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setConnectionError(error.message);
    });

    // Generic message handler
    socket.onAny((event, data) => {
      setLastMessage({ event, data, timestamp: Date.now() });
      
      // Call registered handlers
      if (handlersRef.current[event]) {
        handlersRef.current[event].forEach(handler => handler(data));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Register event handler
  const on = useCallback((event, handler) => {
    if (!handlersRef.current[event]) {
      handlersRef.current[event] = [];
    }
    handlersRef.current[event].push(handler);

    // Return unsubscribe function
    return () => {
      handlersRef.current[event] = handlersRef.current[event].filter(h => h !== handler);
    };
  }, []);

  // Emit event
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Join specific room
  const joinRoom = useCallback((room) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:room', { room });
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback((room) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:room', { room });
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    lastMessage,
    on,
    emit,
    joinRoom,
    leaveRoom
  };
};

// Specialized hooks for different user roles
export const useResidentWebSocket = () => {
  const ws = useWebSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!ws.isConnected || !user) return;

    // Register resident-specific handlers
    const handlers = [
      ws.on('visitor.checked_in', (data) => {
        if (data.residentId === user.id) {
          // Show notification
          console.log('Visitor arrived:', data.visitorName);
        }
      }),
      ws.on('visitor.walk_in_pending', (data) => {
        if (data.residentId === user.id) {
          // Show approval modal
          console.log('Walk-in pending approval:', data);
        }
      }),
      ws.on('visitor.checked_out', (data) => {
        if (data.residentId === user.id) {
          console.log('Visitor left:', data.visitorName);
        }
      })
    ];

    return () => {
      handlers.forEach(unsubscribe => unsubscribe());
    };
  }, [ws.isConnected, user]);

  return ws;
};

export const useGuardWebSocket = () => {
  const ws = useWebSocket();

  useEffect(() => {
    if (!ws.isConnected) return;

    const handlers = [
      ws.on('visitor.new_arrival', (data) => {
        console.log('New visitor arrival:', data);
      }),
      ws.on('incident.new', (data) => {
        console.log('New incident:', data);
      }),
      ws.on('gate.status_change', (data) => {
        console.log('Gate status changed:', data);
      })
    ];

    return () => {
      handlers.forEach(unsubscribe => unsubscribe());
    };
  }, [ws.isConnected]);

  return ws;
};
```

---

## Part 2: Priority 2 Implementations

### 2.1 Enhanced QR Scanning with Offline Support

```jsx
// /client/src/pages/guard/ScanQR.jsx - Enhanced version
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QrReader } from 'react-qr-reader';
import { Camera, WifiOff, Volume2, VolumeX, Flashlight, RotateCcw } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { useWebSocket } from '../../hooks/useWebSocket';

// IndexedDB for offline storage
const DB_NAME = 'securegate_offline';
const STORE_NAME = 'pending_scans';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export default function EnhancedScanQR() {
  const [scanning, setScanning] = useState(true);
  const [lastScan, setLastScan] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [processing, setProcessing] = useState(false);
  
  const audioSuccess = useRef(new Audio('/sounds/success.mp3'));
  const audioError = useRef(new Audio('/sounds/error.mp3'));
  const ws = useWebSocket();

  // Online/offline handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline queue on mount
  useEffect(() => {
    loadOfflineQueue();
  }, []);

  const loadOfflineQueue = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        setOfflineQueue(request.result || []);
      };
    } catch (err) {
      console.error('Error loading offline queue:', err);
    }
  };

  const addToOfflineQueue = async (scanData) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      await store.add({
        ...scanData,
        timestamp: Date.now(),
        synced: false
      });
      
      loadOfflineQueue();
    } catch (err) {
      console.error('Error adding to offline queue:', err);
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    const db = await openDB();
    
    for (const scan of offlineQueue) {
      try {
        await processScan(scan.qrData, true);
        
        // Remove from IndexedDB
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await store.delete(scan.id);
      } catch (err) {
        console.error('Error syncing scan:', err);
      }
    }
    
    loadOfflineQueue();
  };

  const processScan = async (qrData, isSync = false) => {
    try {
      const response = await fetch('/api/visitors/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ qrCode: qrData })
      });

      const result = await response.json();
      
      if (result.success) {
        playSound('success');
        setLastScan({ status: 'success', data: result.data });
        setScanHistory(prev => [
          { ...result.data, status: 'success', time: new Date() },
          ...prev.slice(0, 9)
        ]);
      } else {
        playSound('error');
        setLastScan({ status: 'error', message: result.message });
      }

      return result;
    } catch (err) {
      if (!isSync && !isOnline) {
        // Save for later sync
        await addToOfflineQueue({ qrData });
        setLastScan({ status: 'queued', message: 'Saved for sync when online' });
      } else {
        throw err;
      }
    }
  };

  const handleScan = useCallback(async (result) => {
    if (!result || processing) return;
    
    setProcessing(true);
    const qrData = result.getText();
    
    try {
      await processScan(qrData);
    } catch (err) {
      setLastScan({ status: 'error', message: err.message });
    } finally {
      setProcessing(false);
    }
  }, [processing, isOnline]);

  const playSound = (type) => {
    if (!soundEnabled) return;
    const audio = type === 'success' ? audioSuccess.current : audioError.current;
    audio.play().catch(() => {});
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <WifiOff size={16} />
              Offline ({offlineQueue.length} queued)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={toggleCamera}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Switch camera"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* Scanner */}
      <Card className="overflow-hidden">
        <div className="relative aspect-square bg-black">
          {scanning && (
            <QrReader
              key={facingMode}
              onResult={handleScan}
              constraints={{ facingMode }}
              containerStyle={{ width: '100%', height: '100%' }}
              videoStyle={{ objectFit: 'cover' }}
            />
          )}
          
          {/* Scan overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-2 border-white/30 m-16 rounded-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-green-500 rounded-2xl" />
          </div>
          
          {/* Processing indicator */}
          {processing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {/* Last Scan Result */}
        {lastScan && (
          <div className={`p-4 ${
            lastScan.status === 'success' ? 'bg-green-50 dark:bg-green-900/30' :
            lastScan.status === 'queued' ? 'bg-amber-50 dark:bg-amber-900/30' :
            'bg-red-50 dark:bg-red-900/30'
          }`}>
            {lastScan.status === 'success' && (
              <div className="text-green-800 dark:text-green-200">
                <p className="font-bold text-lg">✅ {lastScan.data.name}</p>
                <p className="text-sm">Checked in successfully</p>
              </div>
            )}
            {lastScan.status === 'queued' && (
              <div className="text-amber-800 dark:text-amber-200">
                <p className="font-medium">📥 Saved for sync</p>
                <p className="text-sm">{lastScan.message}</p>
              </div>
            )}
            {lastScan.status === 'error' && (
              <div className="text-red-800 dark:text-red-200">
                <p className="font-bold">❌ Invalid QR Code</p>
                <p className="text-sm">{lastScan.message}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Recent Scans */}
      {scanHistory.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="font-semibold mb-3">Recent Scans</h3>
            <div className="space-y-2">
              {scanHistory.map((scan, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={scan.status === 'success' ? 'text-green-500' : 'text-red-500'}>
                      {scan.status === 'success' ? '✅' : '❌'}
                    </span>
                    <span>{scan.name || 'Unknown'}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {scan.time.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
```

---

## Implementation Checklist

### Week 1
- [ ] Create ThemeContext and ThemeToggle components
- [ ] Add dark theme CSS variables
- [ ] Integrate ThemeProvider in App.js
- [ ] Add theme toggle to all Settings pages
- [ ] Test dark mode on all pages

### Week 2
- [ ] Create favorite_visitors database table
- [ ] Implement FavoriteVisitorService
- [ ] Add API routes for favorites
- [ ] Create FavoriteVisitors.jsx component
- [ ] Add favorites section to ResidentDashboard

### Week 3
- [ ] Create useWebSocket hook
- [ ] Enhance backend websocketService
- [ ] Integrate WebSocket in ResidentDashboard
- [ ] Integrate WebSocket in GuardDashboard
- [ ] Add connection status indicators

### Week 4
- [ ] Enhance ScanQR with offline support
- [ ] Add IndexedDB for offline queue
- [ ] Implement auto-sync on reconnection
- [ ] Add sound effects and camera controls
- [ ] Test offline scenarios

---

*This implementation guide should be followed sequentially to ensure proper integration of all components.*
