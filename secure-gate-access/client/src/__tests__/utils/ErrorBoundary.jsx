/**
 * Test Error Boundary for testing component error handling
 */
import React from 'react';

class TestErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          {this.props.fallback || 'Something went wrong'}
        </div>
      );
    }

    return this.props.children;
  }
}

export default TestErrorBoundary;