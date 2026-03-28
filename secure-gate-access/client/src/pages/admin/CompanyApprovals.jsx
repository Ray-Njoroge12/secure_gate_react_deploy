import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge, Loading, EmptyState } from "../../components/ui";
import {
  listCompanies,
  approveCompany,
  rejectCompany,
  suspendCompany
} from "../../services/companyService";

const STATUS_COLORS = {
  approved: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  suspended: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800"
};

export default function CompanyApprovals() {
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await listCompanies(params);
      setCompanies(res?.data?.companies || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await approveCompany(id);
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      await rejectCompany(rejectModal, rejectReason);
      setRejectModal(null);
      setRejectReason("");
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (id) => {
    if (!window.confirm("Suspend this company? Their workers will lose estate access.")) return;
    setActionLoading(id);
    try {
      await suspendCompany(id);
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : companies.length === 0 ? (
        <EmptyState title="No Companies" description="No companies have registered yet." />
      ) : (
        <>
          <div className="space-y-4">
            {companies.map(company => (
              <Card key={company.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[company.status] || "bg-gray-100 text-gray-800"}`}>
                        {company.status}
                      </span>
                    </div>
                    {company.registrationNumber || company.registration_number ? (
                      <p className="text-sm text-gray-500 mt-1">
                        Reg: {company.registrationNumber || company.registration_number}
                      </p>
                    ) : null}
                    <p className="text-sm text-gray-500">
                      Contact: {company.contactName || company.contact_name || "N/A"}
                      {(company.contactEmail || company.contact_email) && ` - ${company.contactEmail || company.contact_email}`}
                    </p>
                    {company.adminEmail || company.admin_email ? (
                      <p className="text-sm text-gray-400">Admin: {company.adminEmail || company.admin_email}</p>
                    ) : null}
                    {company.description && (
                      <p className="text-sm text-gray-400 mt-1">{company.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Registered: {new Date(company.createdAt || company.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {company.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(company.id)}
                          disabled={actionLoading === company.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectModal(company.id)}
                          disabled={actionLoading === company.id}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {company.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspend(company.id)}
                        disabled={actionLoading === company.id}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{total} compan{total !== 1 ? "ies" : "y"} total</p>
            <div className="space-x-2">
              <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} variant="outline" size="sm">Previous</Button>
              <span className="text-sm text-gray-600">Page {page}</span>
              <Button onClick={() => setPage(p => p + 1)} disabled={companies.length < 20} variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reject Company</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={3}
                placeholder="Provide a reason for rejection..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason(""); }}>Cancel</Button>
              <Button onClick={handleReject} disabled={actionLoading === rejectModal}
                className="bg-red-600 hover:bg-red-700">
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
