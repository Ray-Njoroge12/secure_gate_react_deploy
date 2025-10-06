// client/src/components/Table.jsx
import React from "react";

export default function Table({ headers = [], rows = [], mobileCardView = true }) {
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
