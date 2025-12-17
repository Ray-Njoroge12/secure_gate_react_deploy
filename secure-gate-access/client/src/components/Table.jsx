// client/src/components/Table.jsx
import React, { useEffect } from "react";

export default function Table({ headers = [], rows = [], mobileCardView = true, loading = false, variant = 'auto' }) {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + F to focus search (if available)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Escape to clear search (if available)
      if (e.key === 'Escape') {
        const searchInput = document.querySelector('input[type="search"], input[type="text"]');
        if (searchInput && searchInput.value) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      // Arrow keys to navigate table rows
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const tableRows = document.querySelectorAll('tbody tr');
        if (tableRows && tableRows.length > 0) {
          const currentIndex = Array.from(tableRows).indexOf(document.activeElement);
          let nextIndex;
          if (e.key === 'ArrowDown') {
            nextIndex = currentIndex < tableRows.length - 1 ? currentIndex + 1 : 0;
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : tableRows.length - 1;
          }
          tableRows[nextIndex]?.focus();
        }
      }
      // Home key to go to first row
      if (e.key === 'Home') {
        e.preventDefault();
        const firstRow = document.querySelector('tbody tr:first-child');
        if (firstRow) {
          firstRow.focus();
        }
      }
      // End key to go to last row
      if (e.key === 'End') {
        e.preventDefault();
        const lastRow = document.querySelector('tbody tr:last-child');
        if (lastRow) {
          lastRow.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme-aware class mappings
  const themeClasses = {
    panel: 'bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden',
    headerCell: 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-900/50',
    bodyDivider: 'divide-y divide-gray-200 dark:divide-slate-700',
    row: 'hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors',
    cell: 'px-4 py-3 text-sm text-gray-700 dark:text-slate-200',
    mobileCard: 'bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 border border-gray-200 dark:border-slate-600',
    mobileLabel: 'text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider',
    mobileValue: 'text-sm text-gray-900 dark:text-slate-200 text-right max-w-[60%] break-words',
    emptyText: 'text-gray-500 dark:text-slate-400',
  };

  // Loading state
  if (loading) {
    return (
      <div className={themeClasses.panel}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-100 dark:bg-slate-700"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 border-t border-gray-200 dark:border-slate-700">
              <div className="h-full flex items-center px-4 gap-4">
                {headers.map((_, j) => (
                  <div key={j} className="h-4 bg-gray-100 dark:bg-slate-700 rounded flex-1"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no data, show empty state
  if (rows.length === 0) {
    return (
      <div className={themeClasses.panel}>
        <div className={`text-center py-8 ${themeClasses.emptyText}`}>
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className={themeClasses.panel}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={themeClasses.headerCell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={themeClasses.bodyDivider}>
            {rows.map((r, ri) => (
              <tr key={ri} className={themeClasses.row} tabIndex={0}>
                {r.map((c, ci) => (
                  <td key={ci} className={themeClasses.cell}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView && (
        <div className="md:hidden space-y-3 p-4">
          {rows.map((r, ri) => (
            <div key={ri} className={themeClasses.mobileCard}>
              <div className="space-y-2">
                {headers.map((header, hi) => (
                  <div key={hi} className="flex justify-between items-start">
                    <span className={themeClasses.mobileLabel}>
                      {header}
                    </span>
                    <span className={themeClasses.mobileValue}>
                      {r[hi]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
