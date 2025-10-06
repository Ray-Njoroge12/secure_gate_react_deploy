// client/src/components/Table.jsx
import React, { useEffect } from "react";

export default function Table({ headers = [], rows = [], mobileCardView = true }) {
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

  // If no data, show empty state
  if (rows.length === 0) {
    return (
      <div className="panel">
        <div className="text-center py-8 text-slate-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-slate-700/50 transition-colors">
                {r.map((c, ci) => (
                  <td key={ci} className="px-4 py-3 text-sm text-slate-200">
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
        <div className="md:hidden space-y-3">
          {rows.map((r, ri) => (
            <div key={ri} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <div className="space-y-2">
                {headers.map((header, hi) => (
                  <div key={hi} className="flex justify-between items-start">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {header}
                    </span>
                    <span className="text-sm text-slate-200 text-right max-w-[60%] break-words">
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
