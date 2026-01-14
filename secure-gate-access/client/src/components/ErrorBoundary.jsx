/**
 * Error Boundary Component
 * Phase 4.3: React Error Handling with Sentry Integration
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors to Sentry, and displays a fallback UI.
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React from 'react';
import * as Sentry from '@sentry/react';
import { captureException, showReportDialog } from '../config/sentry';
import { navigateTo } from '../utils/appNavigation';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to Sentry
    const eventId = captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.props.name || 'ErrorBoundary',
      },
      tags: {
        errorBoundary: this.props.name || 'default',
      },
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      eventId,
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleReportFeedback = () => {
    if (this.state.eventId) {
      showReportDialog(this.state.eventId);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          eventId: this.state.eventId,
          resetError: this.handleReset,
          reportFeedback: this.handleReportFeedback,
        });
      }

      // Default fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <svg
                style={styles.icon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 style={styles.title}>Oops! Something went wrong</h1>

            <p style={styles.message}>
              We're sorry for the inconvenience. Our team has been automatically notified
              and is working to fix the issue.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Development Only)</summary>
                <div style={styles.errorContainer}>
                  <p style={styles.errorName}>{this.state.error.toString()}</p>
                  <pre style={styles.errorStack}>
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <pre style={styles.errorStack}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div style={styles.buttonContainer}>
              <button
                onClick={this.handleReset}
                style={styles.primaryButton}
              >
                Try Again
              </button>

              {this.state.eventId && (
                <button
                  onClick={this.handleReportFeedback}
                  style={styles.secondaryButton}
                >
                  Report Feedback
                </button>
              )}

              <button
                onClick={() => navigateTo('/')}
                style={styles.secondaryButton}
              >
                Go to Home
              </button>
            </div>

            {this.state.eventId && (
              <p style={styles.eventId}>
                Error ID: {this.state.eventId}
              </p>
            )}
          </div>
        </div>
      );
    }

    // No error, render children
    return this.props.children;
  }
}

// Styles
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '1rem',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    textAlign: 'center',
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  icon: {
    width: '64px',
    height: '64px',
    color: '#ef4444',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '1rem',
  },
  message: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  details: {
    marginTop: '1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    padding: '1rem',
    borderRadius: '6px',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  errorContainer: {
    marginTop: '1rem',
  },
  errorName: {
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: '0.5rem',
  },
  errorStack: {
    fontSize: '0.875rem',
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    padding: '1rem',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '300px',
    marginTop: '0.5rem',
  },
  buttonContainer: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1.5rem',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: '#3b82f6',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: '1px solid #3b82f6',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  eventId: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: '1.5rem',
    fontFamily: 'monospace',
  },
};

// Also export Sentry's ErrorBoundary HOC for advanced usage
export const SentryErrorBoundary = Sentry.ErrorBoundary;

export default ErrorBoundary;
