// client/src/components/StatsCard.jsx
import React, { useEffect, useRef } from "react";
import { Card } from "./ui";

export default function StatsCard({ title, value, trend, icon, variant = "default" }) {
  const statsRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space or Enter to activate clickable stats
      if ((e.key === ' ' || e.key === 'Enter') && statsRef.current?.onClick) {
        e.preventDefault();
        statsRef.current.click();
      }
      // Escape to clear focus
      if (e.key === 'Escape' && statsRef.current) {
        statsRef.current.blur();
      }
      // Arrow keys to navigate between stats cards
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const statsCards = document.querySelectorAll('.stats-card');
        if (statsCards && statsCards.length > 0) {
          const currentIndex = Array.from(statsCards).indexOf(document.activeElement);
          let nextIndex;
          if (e.key === 'ArrowRight') {
            nextIndex = currentIndex < statsCards.length - 1 ? currentIndex + 1 : 0;
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : statsCards.length - 1;
          }
          statsCards[nextIndex]?.focus();
        }
      }
      // Home key to go to first stats card
      if (e.key === 'Home') {
        e.preventDefault();
        const firstCard = document.querySelector('.stats-card:first-child');
        if (firstCard) {
          firstCard.focus();
        }
      }
      // End key to go to last stats card
      if (e.key === 'End') {
        e.preventDefault();
        const lastCard = document.querySelector('.stats-card:last-child');
        if (lastCard) {
          lastCard.focus();
        }
      }
    };

    const stats = statsRef.current;
    if (stats) {
      stats.addEventListener('keydown', handleKeyDown);
      return () => stats.removeEventListener('keydown', handleKeyDown);
    }
  }, []);
  const variantClasses = {
    default: "text-gray-900 dark:text-slate-200",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400"
  };

  return (
    <Card ref={statsRef} className="stats-card text-center hover:border-gray-300 dark:hover:border-slate-600 transition-colors" tabIndex={0}>
      <div className="flex items-center justify-between mb-2">
        {icon && <span className="text-gray-500 dark:text-slate-400">{icon}</span>}
        {trend && (
          <span className={`text-xs ${trend > 0 ? 'text-green-600 dark:text-green-400' : trend < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${variantClasses[variant]} mb-1`}>
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-slate-400">
        {title}
      </div>
    </Card>
  );
}
