/**
 * @file httpInterceptor.js - Secure HTTP Interceptor
 * 
 * ✅ SECURE IMPLEMENTATION (Phase A0 - Nov 20, 2025)
 * Uses httpOnly cookies for authentication - resistant to XSS attacks
 * 
 * SECURITY FEATURES:
 * 1. NO localStorage/sessionStorage token access
 * 2. httpOnly cookies sent automatically via credentials: 'include'
 * 3. Server-side session management only
 * 4. Automatic 401 handling without client-side token clearing
 * 
 * OWASP Compliance: A07:2021 - Identification and Authentication Failures ✓
 */

// Secure HTTP interceptor using httpOnly cookies
class SecureHttpInterceptor {
  constructor() {
    this.originalFetch = window.fetch.bind(window);
    this.setupInterceptor();
  }

  setupInterceptor() {
    const self = this;
    window.fetch = async function(url, options = {}) {
      // For API calls, ensure credentials are included to send httpOnly cookies
      if (url.startsWith('/api') || url.includes('/api')) {
        options = {
          ...options,
          credentials: 'include', // Send httpOnly cookies automatically
          headers: {
            'Content-Type': 'application/json',
            ...options.headers // Allow override
          }
        };
      }

      // Ensure content-type for POST/PUT/PATCH requests if not already set
      if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
        if (!options.headers || (!options.headers['Content-Type'] && !options.headers['content-type'])) {
          options.headers = {
            ...options.headers,
            'Content-Type': 'application/json'
          };
        }
      }

      try {
        const response = await self.originalFetch(url, options);
        
        // Handle 401 responses (server will clear httpOnly cookie)
        if (response.status === 401) {
          // Server has already cleared the httpOnly cookie
          // Just redirect to login if not already there
          if (!window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/register') &&
              !url.includes('/auth/login')) { // Don't redirect if this IS the login request
            
            // Dispatch custom event for AuthContext to handle
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            
            // Small delay to allow AuthContext to update state
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
        }
        
        return response;
      } catch (error) {
        // Log error but don't expose sensitive details
        if (process.env.NODE_ENV === 'development') {
          console.error('HTTP Request failed:', error);
        }
        throw error;
      }
    };
  }

  // Method to restore original fetch if needed
  restore() {
    window.fetch = this.originalFetch;
  }
}

// ✅ SAFE TO INSTANTIATE - Uses httpOnly cookies only
// Create and export singleton instance
const secureHttpInterceptor = new SecureHttpInterceptor();

export default secureHttpInterceptor;
