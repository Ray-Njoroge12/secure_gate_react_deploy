import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import Table from "../../components/Table";
import { getAccessLogs } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import logger from 'utils/logger';

export default function AccessControl() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAccessLogs() {
      try {
        const data = await getAccessLogs();
        setCards(data || []);
      } catch (e) {
        const errorMsg = handleApiError(e);
        setError(errorMsg);
        logger.error('Failed to load access logs:', e);
        setCards([]);
      } finally {
        setLoading(false);
      }
    }
    loadAccessLogs();
  }, []);

  return (
    <Layout title="Access Control" role="admin" showBreadcrumbs={true}>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <Table 
        headers={["Card ID","Holder","Zone","Status","Actions"]} 
        rows={cards.map(c=>[c.id,c.holder,c.zone,c.status,"Disable | Assign"])}
        loading={loading}
      />
    </Layout>
  );
}
