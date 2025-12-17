/**
 * DEPRECATED: This file is kept for backward compatibility.
 * All auth functionality now uses httpOnly cookies instead of localStorage.
 * 
 * Import from '../contexts/AuthContext' instead for the secure implementation.
 */

// Re-export everything from the secure AuthContext
export { AuthContext, AuthProvider, useAuth } from '../contexts/AuthContext';
