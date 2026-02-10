import React, { useEffect, useState } from "react";
import Table from "../../components/Table";
import { getVisitorLogs } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import logger from 'utils/logger';

export default function Visitors({ estateId }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadVisitors() {
      try {
        const data = await getVisitorLogs(estateId ? { siteId: estateId } : {});
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
  }, [estateId]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Visitor Logs</h3>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <Table
        headers={["ID", "Name", "Host", "Phone", "Status", "Visit Date"]}
        rows={visitors.map(v => [
          v.id,
          v.name || "-",
          v.host_name || "-",
          v.phone || "-",
          v.status || "-",
          v.date_of_visit || "-"
        ])}
        loading={loading}
      />
    </div>
  );
}
