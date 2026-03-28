import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext.js";
import { Card, Button, Badge, Loading, EmptyState, Modal, Input } from "../../components/ui";
import {
  listWorkers,
  registerWorker,
  preApproveWorker,
  revokeWorker,
  generateWorkerPass
} from "../../services/companyService";

const WORKER_TYPES = [
  { value: "employee", label: "Employee" },
  { value: "subcontractor", label: "Subcontractor" }
];

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  suspended: "bg-orange-100 text-orange-800",
  revoked: "bg-red-100 text-red-800"
};

export default function WorkerManagement() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [filter, setFilter] = useState({ status: "", workerType: "", search: "" });
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const companyId = user?.company_id || user?.companyId;

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (companyId) params.companyId = companyId;
      if (filter.status) params.status = filter.status;
      if (filter.workerType) params.workerType = filter.workerType;
      if (filter.search) params.search = filter.search;

      const res = await listWorkers(params);
      setWorkers(res?.data?.workers || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filter, companyId]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  const handleApprove = async (workerId) => {
    setActionLoading(workerId);
    try {
      await preApproveWorker(workerId);
      fetchWorkers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (workerId) => {
    if (!window.confirm("Are you sure you want to revoke this worker's access?")) return;
    setActionLoading(workerId);
    try {
      await revokeWorker(workerId);
      fetchWorkers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGeneratePass = async (workerId) => {
    setActionLoading(workerId);
    try {
      await generateWorkerPass(workerId, { passType: "worker" });
      alert("Worker pass generated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Worker Management</h1>
        <Button onClick={() => setShowAddModal(true)}>Add Worker</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search workers..."
          value={filter.search}
          onChange={(e) => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={filter.status}
          onChange={(e) => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="revoked">Revoked</option>
        </select>
        <select
          value={filter.workerType}
          onChange={(e) => { setFilter(f => ({ ...f, workerType: e.target.value })); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Types</option>
          <option value="employee">Employee</option>
          <option value="subcontractor">Subcontractor</option>
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : workers.length === 0 ? (
        <EmptyState
          title="No Workers Found"
          description="Add workers to manage their estate access."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workers.map(worker => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {worker.firstName || worker.first_name} {worker.lastName || worker.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                      {worker.workerType || worker.worker_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{worker.phone || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {worker.vehiclePlate || worker.vehicle_plate || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[worker.status] || "bg-gray-100 text-gray-800"}`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      {worker.status === "pending" && (
                        <button
                          onClick={() => handleApprove(worker.id)}
                          disabled={actionLoading === worker.id}
                          className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {worker.status === "active" && (
                        <>
                          <button
                            onClick={() => handleGeneratePass(worker.id)}
                            disabled={actionLoading === worker.id}
                            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                          >
                            Generate Pass
                          </button>
                          <button
                            onClick={() => handleRevoke(worker.id)}
                            disabled={actionLoading === worker.id}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{total} worker{total !== 1 ? "s" : ""} total</p>
            <div className="space-x-2">
              <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} variant="outline" size="sm">Previous</Button>
              <span className="text-sm text-gray-600">Page {page}</span>
              <Button onClick={() => setPage(p => p + 1)} disabled={workers.length < 20} variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </>
      )}

      {/* Add Worker Modal */}
      {showAddModal && (
        <AddWorkerModal
          companyId={companyId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchWorkers(); }}
        />
      )}
    </div>
  );
}

function AddWorkerModal({ companyId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    idNumber: "", workerType: "employee", vehiclePlate: "", preApproved: true, notes: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) {
      setError("First name and last name are required");
      return;
    }
    setSubmitting(true);
    try {
      await registerWorker({ ...form, companyId });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to register worker");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Worker</h2>
        {error && <div className="mb-4 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
              <input type="text" value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Plate</label>
              <input type="text" value={form.vehiclePlate} onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Worker Type</label>
            <select value={form.workerType} onChange={e => setForm(f => ({ ...f, workerType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {WORKER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.preApproved} onChange={e => setForm(f => ({ ...f, preApproved: e.target.checked }))} />
            <span className="text-sm text-gray-700">Pre-approve for estate access</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Registering..." : "Add Worker"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
