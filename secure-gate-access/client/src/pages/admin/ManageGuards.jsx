import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import { getAllGuards } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import logger from 'utils/logger';

export default function Guards() {
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadGuards() {
      try {
        const data = await getAllGuards();
        setGuards(data || []);
      } catch (e) {
        const errorMsg = handleApiError(e);
        setError(errorMsg);
        logger.error('Failed to load guards:', e);
      } finally {
        setLoading(false);
      }
    }
    loadGuards();
  }, []);

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      <Sidebar />
      <div>
        <Topbar title="Guards" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="flex-1 overflow-y-auto bg-slate-900 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <Table 
            headers={["ID","Name","Post","Status","Actions"]} 
            rows={guards.map(g=>[g.id,g.name,g.post,g.status,"Edit | Remove"])}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}
