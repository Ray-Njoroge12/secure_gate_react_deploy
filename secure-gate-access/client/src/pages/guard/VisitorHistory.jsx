import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Table from "../../components/Table";
import { Card, SearchFilter, Pagination } from "../../components/ui";
import { getVisitorHistory } from "../../services/guardService";
import { handleApiError } from "../../utils/errorMapper";
import logger from "../../utils/logger";

export default function VisitorHistory() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadVisitorHistory();
  }, []);

  const loadVisitorHistory = async () => {
    try {
      setLoading(true);
      const data = await getVisitorHistory();
      setVisitors(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load visitor history:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisitors = visitors.filter(v =>
    v.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.resident_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedVisitors = filteredVisitors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6">
      <Card className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Visitor History</h2>
          <SearchFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search visitors..."
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <Table
          headers={["Visitor", "Resident", "Check In", "Check Out", "Status", "Actions"]}
          rows={paginatedVisitors.map(v => [
            v.visitor_name || "Unknown",
            v.resident_name || "Unknown",
            v.check_in_time || "-",
            v.check_out_time || "-",
            v.status || "Pending",
            "View Details"
          ])}
          loading={loading}
        />

        {!loading && filteredVisitors.length > itemsPerPage && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredVisitors.length / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
