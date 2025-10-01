// client/src/components/StatsCard.jsx
import React from "react";
import { Card } from "./ui";

export default function StatsCard({ title, value, trend, icon, variant = "default" }) {
  const variantClasses = {
    default: "text-slate-200",
    success: "text-green-400",
    warning: "text-yellow-400",
    danger: "text-red-400"
  };

  return (
    <Card className="text-center hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        {trend && (
          <span className={`text-xs ${trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${variantClasses[variant]} mb-1`}>
        {value}
      </div>
      <div className="text-sm text-slate-400">
        {title}
      </div>
    </Card>
  );
}
