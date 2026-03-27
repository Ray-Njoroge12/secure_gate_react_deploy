import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { initializeSentry } from "./config/sentry.js";
import "./index.css";
// PWA Service Worker Registration - Added for Task 4.4
import { register as registerSW, unregister as unregisterSW } from "./serviceWorkerRegistration.js";

// Initialize Sentry for error tracking
initializeSentry();

const root = ReactDOM.createRoot(document.getElementById("root"));

const shouldRegisterServiceWorker =
  process.env.NODE_ENV === 'production' || process.env.REACT_APP_ENABLE_SW_DEV === 'true';

const renderApp = () => {
  // React.StrictMode can double-invoke some lifecycle hooks in development which
  // may cause confusing duplicate behavior while debugging; disable it temporarily.
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

const clearSecureGateCaches = async () => {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith("secure-gate-"))
      .map((key) => caches.delete(key))
  );
};

const cleanupDevServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(
    registrations.map((registration) => registration.unregister().catch(() => false))
  );
  await clearSecureGateCaches();

  if (hadController && !sessionStorage.getItem("securegate-sw-dev-reset")) {
    sessionStorage.setItem("securegate-sw-dev-reset", "1");
    window.location.reload();
    return;
  }

  sessionStorage.removeItem("securegate-sw-dev-reset");
};

// Service worker registration:
// - production: enabled
// - development: disabled by default (to avoid stale chunk cache / ChunkLoadError)
const initializeApp = async () => {
  if (!shouldRegisterServiceWorker) {
    unregisterSW();

    try {
      await cleanupDevServiceWorkers();
    } catch {
      // Continue boot even if cleanup fails in dev.
    }

    // If cleanup triggered a reload, stop this boot cycle.
    if (sessionStorage.getItem("securegate-sw-dev-reset") === "1" && navigator.serviceWorker?.controller) {
      return;
    }
  }

  renderApp();

  if (!shouldRegisterServiceWorker) {
    return;
  }

  registerSW({
    onSuccess: (_registration) => {
      console.log(
        process.env.NODE_ENV === "production"
          ? "PWA: Service worker registered successfully"
          : "PWA: Service worker registered in development mode"
      );
    },
    onUpdate: (_registration) => {
      console.log(
        process.env.NODE_ENV === "production"
          ? "PWA: New content available, please refresh"
          : "PWA: Service worker updated in development mode"
      );
      // The PWAManager will handle update notifications
    }
  });
};

initializeApp();
