import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import Table from "../../components/Table";
import { getVisitorLogs } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import logger from 'utils/logger';

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
    <Layout title="Visitors" role="admin" showBreadcrumbs={true}>
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
    </Layout>
  );
}
