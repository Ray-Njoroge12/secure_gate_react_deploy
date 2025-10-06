import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Table from "../../components/Table";
import { getVisitorLogs } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import logger from "../../utils/logger";

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadVisitors() {
      try {
        const data = await getVisitorLogs();
        setVisitors(data || []);
      } catch (e) {
        const errorMsg = handleApiError(e);
        setError(errorMsg);
        logger.error('Failed to load visitors:', e);
      } finally {
        setLoading(false);
      }
    }
    loadVisitors();
  }, []);

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      <Sidebar />
      <div>
        <Topbar title="Visitors" onLogout={() => { localStorage.clear(); window.location.href="/login"; }} />
        <main className="flex-1 overflow-y-auto bg-slate-900 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <Table 
            headers={["ID","Name","Host","Status","Actions"]} 
            rows={visitors.map(v=>[v.id,v.name,v.host,v.status,"Approve | Reject"])}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}
