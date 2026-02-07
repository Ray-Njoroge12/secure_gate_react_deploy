import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import Table from "../../components/Table";
import { getIncidents } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import logger from 'utils/logger';

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadIncidents() {
      try {
        const data = await getIncidents();
        setIncidents(data || []);
      } catch (e) {
        const errorMsg = handleApiError(e);
        setError(errorMsg);
        logger.error('Failed to load incidents:', e);
      } finally {
        setLoading(false);
      }
    }
    loadIncidents();
  }, []);

  return (
    <Layout title="Incidents" role="admin" showBreadcrumbs={true}>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <Table 
        headers={["ID","Title","Status","Assigned","Actions"]} 
        rows={incidents.map(i=>[i.id,i.title,i.status,i.assignedTo || "-", "View | Close"])}
        loading={loading}
      />
    </Layout>
  );
}
