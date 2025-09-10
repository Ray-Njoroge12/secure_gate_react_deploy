import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./styles.css";


const root = ReactDOM.createRoot(document.getElementById("root"));
// React.StrictMode can double-invoke some lifecycle hooks in development which
// may cause confusing duplicate behavior while debugging; disable it temporarily.
root.render(
  <App />
);
