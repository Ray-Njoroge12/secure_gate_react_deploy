import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext.js";
import {
  Card,
  Button,
  Badge,
  Loading,
  EmptyState,
  ErrorState,
  Modal,
  Input
} from "../../components/ui";
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

const STATUS_VARIANTS = {
  active: "success",
  pending: "pending",
  suspended: "warning",
  revoked: "danger"
};

const STATUS_LABELS = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
  revoked: "Revoked"
};

const INITIAL_WORKER_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  idNumber: "",
  workerType: "employee",
  vehiclePlate: "",
  preApproved: true,
  notes: ""
};

function formatWorkerName(worker) {
  return `${worker.firstName || worker.first_name || ""} ${worker.lastName || worker.last_name || ""}`.trim() || "worker";
}

export default function WorkerManagement() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingRevokeWorker, setPendingRevokeWorker] = useState(null);
  const [filter, setFilter] = useState({ status: "", workerType: "", search: "" });
  const [actionLoading, setActionLoading] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const companyId = user?.company_id || user?.companyId;

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const params = { page, limit: 20 };
      if (companyId) params.companyId = companyId;
      if (filter.status) params.status = filter.status;
      if (filter.workerType) params.workerType = filter.workerType;
      if (filter.search) params.search = filter.search;

      const res = await listWorkers(params);
      setWorkers(res?.data?.workers || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      setLoadError(err.message || "Failed to load workers");
    } finally {
      setLoading(false);
    }
  }, [page, filter, companyId]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleApprove = async (worker) => {
    const workerId = worker.id;
    setActionLoading({ workerId, action: "approve" });
    setFeedback(null);
    try {
      await preApproveWorker(workerId);
      setFeedback({ type: "success", message: `Approved ${formatWorkerName(worker)}.` });
      await fetchWorkers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to approve worker" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGeneratePass = async (worker) => {
    const workerId = worker.id;
    setActionLoading({ workerId, action: "pass" });
    setFeedback(null);
    try {
      await generateWorkerPass(workerId, { passType: "worker" });
      setFeedback({ type: "success", message: `Generated pass for ${formatWorkerName(worker)}.` });
      await fetchWorkers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to generate worker pass" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!pendingRevokeWorker) return;

    const workerId = pendingRevokeWorker.id;
    setActionLoading({ workerId, action: "revoke" });
    setFeedback(null);

    try {
      await revokeWorker(workerId);
      setFeedback({ type: "success", message: `Revoked access for ${formatWorkerName(pendingRevokeWorker)}.` });
      setPendingRevokeWorker(null);
      await fetchWorkers();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to revoke worker access" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSuccess = async (createdWorker) => {
    setShowAddModal(false);
    setFeedback({
      type: "success",
      message: `Registered ${createdWorker?.firstName || createdWorker?.first_name || "new"} worker successfully.`
    });
    await fetchWorkers();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-12">
        <Loading text="Loading workers" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState onRetry={fetchWorkers} errorMessage={loadError} />;
  }

  const hasWorkers = workers.length > 0;
  const feedbackVariant =
    feedback?.type === "success"
      ? "success"
      : feedback?.type === "error"
      ? "danger"
      : "default";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Worker Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Manage worker registration, status, and estate access from one place.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} fullWidth={false}>
          Add Worker
        </Button>
      </div>

      {feedback && (
        <div
          className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 ${
            feedbackVariant === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-100"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100"
          }`}
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <p className="text-sm">{feedback.message}</p>
          <Button variant="ghost" size="sm" onClick={() => setFeedback(null)} aria-label="Dismiss message">
            Dismiss
          </Button>
        </div>
      )}

      <Card className="bg-white dark:bg-slate-800">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]">
          <Input
            label="Search workers"
            placeholder="Name, phone, ID number..."
            value={filter.search}
            onChange={(e) => {
              setFilter((current) => ({ ...current, search: e.target.value }));
              setPage(1);
            }}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Status</label>
            <select
              value={filter.status}
              onChange={(e) => {
                setFilter((current) => ({ ...current, status: e.target.value }));
                setPage(1);
              }}
              className="block w-full min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
            <select
              value={filter.workerType}
              onChange={(e) => {
                setFilter((current) => ({ ...current, workerType: e.target.value }));
                setPage(1);
              }}
              className="block w-full min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">All types</option>
              {WORKER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {!hasWorkers ? (
        <EmptyState
          title="No workers found"
          description="Add workers to manage estate access and approval workflows."
          primaryAction={{
            label: "Add Worker",
            onClick: () => setShowAddModal(true)
          }}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                {workers.map((worker) => {
                  const workerStatus = worker.status || "pending";
                  const workerLoading = actionLoading?.workerId === worker.id;
                  const activeAction = actionLoading?.action;

                  return (
                    <tr key={worker.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {formatWorkerName(worker)}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-gray-600 dark:text-gray-300">
                        {worker.workerType || worker.worker_type || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {worker.phone || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {worker.vehiclePlate || worker.vehicle_plate || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[workerStatus] || "default"} size="sm">
                          {STATUS_LABELS[workerStatus] || workerStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {workerStatus === "pending" && (
                            <Button
                              size="sm"
                              variant="success"
                              loading={workerLoading && activeAction === "approve"}
                              disabled={workerLoading}
                              onClick={() => handleApprove(worker)}
                            >
                              Approve
                            </Button>
                          )}
                          {(workerStatus === "active" || workerStatus === "pending") && (
                            <Button
                              size="sm"
                              variant="outline"
                              loading={workerLoading && activeAction === "pass"}
                              disabled={workerLoading}
                              onClick={() => handleGeneratePass(worker)}
                            >
                              Generate Pass
                            </Button>
                          )}
                          {workerStatus === "active" && (
                            <Button
                              size="sm"
                              variant="danger"
                              loading={workerLoading && activeAction === "revoke"}
                              disabled={workerLoading}
                              onClick={() => setPendingRevokeWorker(worker)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-300">
              {total} worker{total !== 1 ? "s" : ""} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-300">Page {page}</span>
              <Button
                onClick={() => setPage((current) => current + 1)}
                disabled={workers.length < 20}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <AddWorkerModal
        isOpen={showAddModal}
        companyId={companyId}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      <ConfirmRevokeModal
        isOpen={Boolean(pendingRevokeWorker)}
        worker={pendingRevokeWorker}
        loading={actionLoading?.workerId === pendingRevokeWorker?.id && actionLoading?.action === "revoke"}
        onClose={() => setPendingRevokeWorker(null)}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
}

function AddWorkerModal({ isOpen, companyId, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL_WORKER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_WORKER_FORM);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await registerWorker({ ...form, companyId });
      await onSuccess(form);
    } catch (err) {
      setError(err.message || "Failed to register worker");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Worker"
      size="lg"
      ariaLabel="Add worker dialog"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100" role="alert">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="First name"
            value={form.firstName}
            onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))}
            required
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="ID number"
            value={form.idNumber}
            onChange={(e) => setForm((current) => ({ ...current, idNumber: e.target.value }))}
          />
          <Input
            label="Vehicle plate"
            value={form.vehiclePlate}
            onChange={(e) => setForm((current) => ({ ...current, vehiclePlate: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Worker type</label>
          <select
            value={form.workerType}
            onChange={(e) => setForm((current) => ({ ...current, workerType: e.target.value }))}
            className="block w-full min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {WORKER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="worker-notes">
            Notes
          </label>
          <textarea
            id="worker-notes"
            value={form.notes}
            onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
          <input
            type="checkbox"
            checked={form.preApproved}
            onChange={(e) => setForm((current) => ({ ...current, preApproved: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">Pre-approve for estate access</span>
        </label>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add Worker
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmRevokeModal({ isOpen, worker, loading, onClose, onConfirm }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Revoke worker access"
      size="md"
      ariaLabel="Confirm revoke worker access"
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Are you sure you want to revoke access for{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {worker ? formatWorkerName(worker) : "this worker"}
          </span>
          ? This will remove estate access until the worker is approved again.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            Revoke access
          </Button>
        </div>
      </div>
    </Modal>
  );
}
