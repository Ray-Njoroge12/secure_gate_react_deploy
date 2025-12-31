import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";

// Phase 4.3: Sentry Error Monitoring
import { initializeSentry } from "./config/sentry.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

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

// Service worker registration is disabled for build testing
// Will be enabled in production deployment