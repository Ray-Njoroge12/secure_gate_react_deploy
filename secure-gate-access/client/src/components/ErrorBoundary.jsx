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

import * as Sentry from '@sentry/react';
import React from 'react';

import { captureException, showReportDialog } from '../config/sentry';
import { navigateTo } from '../utils/appNavigation';

import Button from './ui/Button';

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

  static getDerivedStateFromError(_error) {
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
              <Button
                onClick={this.handleReset}
                style={styles.primaryButton}
              >
                Try Again
              </Button>

              {this.state.eventId && (
                <Button
                  onClick={this.handleReportFeedback}
                  style={styles.secondaryButton}
                >
                  Report Feedback
                </Button>
              )}

              <Button
                onClick={() => navigateTo('/')}
                style={styles.secondaryButton}
              >
                Go to Home
              </Button>
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

// Styles — using CSS custom properties from design-system.css for theme awareness
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-primary, #f9fafb)',
    padding: '1rem',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    backgroundColor: 'var(--color-bg-secondary, white)',
    borderRadius: 'var(--radius-lg, 8px)',
    boxShadow: 'var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1))',
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
    color: 'var(--color-error, #ef4444)',
  },
  title: {
    fontSize: 'var(--font-size-3xl, 1.875rem)',
    fontWeight: 'var(--font-weight-bold, bold)',
    color: 'var(--color-text-primary, #111827)',
    marginBottom: '1rem',
  },
  message: {
    fontSize: 'var(--font-size-base, 1rem)',
    color: 'var(--color-text-secondary, #6b7280)',
    marginBottom: '1.5rem',
    lineHeight: 'var(--line-height-relaxed, 1.5)',
  },
  details: {
    marginTop: '1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'left',
    backgroundColor: 'var(--color-bg-tertiary, #f9fafb)',
    padding: '1rem',
    borderRadius: 'var(--radius-md, 6px)',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 'var(--font-weight-semibold, 600)',
    color: 'var(--color-text-primary, #374151)',
    marginBottom: '0.5rem',
  },
  errorContainer: {
    marginTop: '1rem',
  },
  errorName: {
    fontWeight: 'var(--font-weight-semibold, 600)',
    color: 'var(--color-error, #ef4444)',
    marginBottom: '0.5rem',
  },
  errorStack: {
    fontSize: 'var(--font-size-sm, 0.875rem)',
    backgroundColor: 'var(--color-bg-tertiary, #1f2937)',
    color: 'var(--color-text-primary, #f9fafb)',
    padding: '1rem',
    borderRadius: 'var(--radius-sm, 4px)',
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
    backgroundColor: 'var(--color-brand-primary, #10b981)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-md, 6px)',
    border: 'none',
    fontSize: 'var(--font-size-base, 1rem)',
    fontWeight: 'var(--font-weight-medium, 500)',
    cursor: 'pointer',
    minHeight: '44px',
    transition: 'background-color var(--transition-base, 0.2s)',
  },
  secondaryButton: {
    backgroundColor: 'var(--color-bg-secondary, white)',
    color: 'var(--color-brand-primary, #10b981)',
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-md, 6px)',
    border: '1px solid var(--color-brand-primary, #10b981)',
    fontSize: 'var(--font-size-base, 1rem)',
    fontWeight: 'var(--font-weight-medium, 500)',
    cursor: 'pointer',
    minHeight: '44px',
    transition: 'all var(--transition-base, 0.2s)',
  },
  eventId: {
    fontSize: 'var(--font-size-xs, 0.75rem)',
    color: 'var(--color-text-muted, #9ca3af)',
    marginTop: '1.5rem',
    fontFamily: 'monospace',
  },
};

// Also export Sentry's ErrorBoundary HOC for advanced usage
export const SentryErrorBoundary = Sentry.ErrorBoundary;

export default ErrorBoundary;
