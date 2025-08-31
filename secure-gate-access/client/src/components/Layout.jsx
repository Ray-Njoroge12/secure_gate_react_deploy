import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ title, right, children }) {
  return (
    <div className="app-grid">
      <Sidebar />
      <div>
        <Topbar title={title} right={right} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
