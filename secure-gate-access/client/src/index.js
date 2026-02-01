import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";

// Phase 4.3: Sentry Error Monitoring
import { initializeSentry } from "./config/sentry.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// PWA Service Worker Registration - Added for Task 4.4
import { register as registerSW } from "./serviceWorkerRegistration.js";

// Initialize Sentry for error tracking
initializeSentry();

const root = ReactDOM.createRoot(document.getElementById("root"));
// React.StrictMode can double-invoke some lifecycle hooks in development which
// may cause confusing duplicate behavior while debugging; disable it temporarily.
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Service worker registration - Enabled for Task 4.4 PWA capabilities
if (process.env.NODE_ENV === 'production') {
  registerSW({
    onSuccess: (registration) => {
      console.log('PWA: Service worker registered successfully');
    },
    onUpdate: (registration) => {
      console.log('PWA: New content available, please refresh');
      // The PWAManager will handle update notifications
    }
  });
} else {
  // Register in development for testing PWA features
  registerSW({
    onSuccess: (registration) => {
      console.log('PWA: Service worker registered in development mode');
    },
    onUpdate: (registration) => {
      console.log('PWA: Service worker updated in development mode');
    }
  });
}