/**
 * @file UndoContext.jsx
 * @description Global undo/redo system for recoverable actions
 * Phase 4: UI/UX Improvement - Gap 5
 * 
 * Features:
 * - History stack for undo operations
 * - Future stack for redo operations
 * - Action expiration (30 seconds)
 * - Integration with toast notifications
 * - Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
 * 
 * Supported Actions:
 * - Visitor revocation
 * - Invite deletion
 * - Rule deletion (auto-approval)
 * - Settings changes
 * - Bulk operations
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// Action types
export const ACTION_TYPES = {
  DELETE_VISITOR: 'DELETE_VISITOR',
  REVOKE_PASS: 'REVOKE_PASS',
  DELETE_INVITE: 'DELETE_INVITE',
  DELETE_RULE: 'DELETE_RULE',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  BULK_DELETE: 'BULK_DELETE',
  BULK_REVOKE: 'BULK_REVOKE',
};

// Default expiration time (30 seconds)
const DEFAULT_EXPIRATION_MS = 30000;

// Generate unique ID
let actionId = 0;
const generateActionId = () => `action-${++actionId}-${Date.now()}`;

// Create context
const UndoContext = createContext(null);

/**
 * Undo Provider Component
 */
export const UndoProvider = ({ 
  children, 
  maxHistory = 10,
  expirationMs = DEFAULT_EXPIRATION_MS,
  onUndo,
  onRedo,
}) => {
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const expirationTimers = useRef({});

  // Clean up expired actions
  const cleanupExpired = useCallback(() => {
    const now = Date.now();
    setHistory(prev => prev.filter(action => {
      if (action.expiresAt && action.expiresAt < now) {
        // Clean up timer
        if (expirationTimers.current[action.id]) {
          clearTimeout(expirationTimers.current[action.id]);
          delete expirationTimers.current[action.id];
        }
        return false;
      }
      return true;
    }));
  }, []);

  // Run cleanup periodically
  useEffect(() => {
    const interval = setInterval(cleanupExpired, 5000);
    return () => clearInterval(interval);
  }, [cleanupExpired]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(expirationTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Add a new undoable action
  const addAction = useCallback((action) => {
    const id = generateActionId();
    const now = Date.now();
    
    const newAction = {
      id,
      timestamp: now,
      expiresAt: action.noExpiration ? null : now + expirationMs,
      ...action,
    };

    // Set up expiration timer
    if (!action.noExpiration) {
      expirationTimers.current[id] = setTimeout(() => {
        setHistory(prev => prev.filter(a => a.id !== id));
        delete expirationTimers.current[id];
      }, expirationMs);
    }

    setHistory(prev => {
      const updated = [newAction, ...prev].slice(0, maxHistory);
      return updated;
    });

    // Clear future on new action
    setFuture([]);

    return id;
  }, [maxHistory, expirationMs]);

  // Undo the last action
  const undo = useCallback(async () => {
    if (history.length === 0 || isProcessing) return false;

    const action = history[0];
    
    // Check if expired
    if (action.expiresAt && action.expiresAt < Date.now()) {
      setHistory(prev => prev.slice(1));
      return false;
    }

    setIsProcessing(true);

    try {
      // Execute undo
      if (action.undo && typeof action.undo === 'function') {
        await action.undo();
      }

      // Move to future stack
      setHistory(prev => prev.slice(1));
      setFuture(prev => [action, ...prev].slice(0, maxHistory));

      // Clear expiration timer
      if (expirationTimers.current[action.id]) {
        clearTimeout(expirationTimers.current[action.id]);
        delete expirationTimers.current[action.id];
      }

      // Callback
      onUndo?.(action);

      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [history, isProcessing, maxHistory, onUndo]);

  // Redo the last undone action
  const redo = useCallback(async () => {
    if (future.length === 0 || isProcessing) return false;

    const action = future[0];
    setIsProcessing(true);

    try {
      // Execute redo
      if (action.redo && typeof action.redo === 'function') {
        await action.redo();
      }

      // Move back to history
      setFuture(prev => prev.slice(1));
      setHistory(prev => [action, ...prev].slice(0, maxHistory));

      // Callback
      onRedo?.(action);

      return true;
    } catch (error) {
      console.error('Redo failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [future, isProcessing, maxHistory, onRedo]);

  // Remove a specific action from history
  const removeAction = useCallback((actionId) => {
    if (expirationTimers.current[actionId]) {
      clearTimeout(expirationTimers.current[actionId]);
      delete expirationTimers.current[actionId];
    }
    setHistory(prev => prev.filter(a => a.id !== actionId));
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    Object.values(expirationTimers.current).forEach(clearTimeout);
    expirationTimers.current = {};
    setHistory([]);
    setFuture([]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Cmd/Ctrl + Shift + Z = Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Cmd/Ctrl + Y = Redo (Windows style)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const value = {
    history,
    future,
    canUndo: history.length > 0 && !isProcessing,
    canRedo: future.length > 0 && !isProcessing,
    isProcessing,
    addAction,
    undo,
    redo,
    removeAction,
    clearHistory,
    lastAction: history[0] || null,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
};

/**
 * Hook to use undo/redo functionality
 */
export const useUndo = () => {
  const context = useContext(UndoContext);
  
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  
  return context;
};

/**
 * Hook to create undoable actions easily
 */
export const useUndoableAction = () => {
  const { addAction } = useUndo();

  const createUndoable = useCallback((options) => {
    const {
      type,
      description,
      execute,
      undo,
      redo,
      data,
      noExpiration = false,
    } = options;

    return async () => {
      // Execute the action first
      const result = await execute();

      // Add to undo stack
      addAction({
        type,
        description,
        data: { ...data, result },
        undo,
        redo: redo || execute,
        noExpiration,
      });

      return result;
    };
  }, [addAction]);

  return { createUndoable };
};

export default UndoContext;
