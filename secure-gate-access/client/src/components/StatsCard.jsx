// client/src/components/StatsCard.jsx
import React from "react";
export default function StatsCard({ title, value }) {
  return (
    <div className="panel">
      <div className="kpi">{value}</div>
      <div className="kpi-sub">{title}</div>
    </div>
  );
}
