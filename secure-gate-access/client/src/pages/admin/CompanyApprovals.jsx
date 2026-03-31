import React, { useState, useEffect, useCallback } from "react";

import { Card, Button, Badge, Loading, EmptyState, Modal } from "../../components/ui";
import {
  listCompanies,
  approveCompany,
  rejectCompany,
  suspendCompany
} from "../../services/companyService";

const STATUS_VARIANTS = {
  approved: "success",
  pending: "pending",
  suspended: "warning",
  rejected: "danger"
};

export default function CompanyApprovals() {
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchCompanies = useCallback(async () => {
    try {
      setError(null);
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
      setError(null);
      await fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await rejectCompany(rejectTarget.id, rejectReason);
      setRejectTarget(null);
      setRejectReason("");
      setError(null);
      await fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setActionLoading(suspendTarget.id);
    try {
      await suspendCompany(suspendTarget.id);
      setSuspendTarget(null);
      setError(null);
      await fetchCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const statusCounts = companies.reduce((acc, company) => {
    const status = company.status || "pending";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { approved: 0, pending: 0, suspended: 0, rejected: 0 });

  const summaryCards = [
    { label: "Pending", value: statusCounts.pending, tone: "pending" },
    { label: "Approved", value: statusCounts.approved, tone: "success" },
    { label: "Suspended", value: statusCounts.suspended, tone: "warning" },
    { label: "Rejected", value: statusCounts.rejected, tone: "danger" }
  ];

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Company Management
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Review company onboarding, approvals, and operational status.
          </p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {total} compan{total !== 1 ? "ies" : "y"} total
        </p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200"
        >
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="text-red-700 dark:text-red-200" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-3xl font-semibold text-slate-900 dark:text-white">{card.value}</span>
              <Badge variant={card.tone} size="sm">
                {card.label}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Snapshot counts reflect the currently loaded page of results.
      </p>

      <Card className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Filters</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Narrow the company queue by status.</p>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>
      </Card>

      {loading ? (
        <Loading />
      ) : companies.length === 0 ? (
        <EmptyState title="No Companies" description="No companies have registered yet." />
      ) : (
        <>
          <div className="space-y-4">
            {companies.map(company => (
              <Card key={company.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{company.name}</h3>
                      <Badge variant={STATUS_VARIANTS[company.status] || "default"} size="sm">
                        {company.status}
                      </Badge>
                    </div>
                    {company.registrationNumber || company.registration_number ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Reg: {company.registrationNumber || company.registration_number}
                      </p>
                    ) : null}
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Contact: {company.contactName || company.contact_name || "N/A"}
                      {(company.contactEmail || company.contact_email) && ` - ${company.contactEmail || company.contact_email}`}
                    </p>
                    {company.adminEmail || company.admin_email ? (
                      <p className="text-sm text-slate-400 dark:text-slate-300">Admin: {company.adminEmail || company.admin_email}</p>
                    ) : null}
                    {company.description && (
                      <p className="text-sm text-slate-400 dark:text-slate-300">{company.description}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-300">
                      Registered: {new Date(company.createdAt || company.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
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
                          onClick={() => {
                            setRejectTarget(company);
                            setRejectReason("");
                          }}
                          disabled={actionLoading === company.id}
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {company.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSuspendTarget(company)}
                        disabled={actionLoading === company.id}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-500/40 dark:text-orange-300 dark:hover:bg-orange-950/40"
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
            <p className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {Math.max(1, Math.ceil(total / 20))}</p>
            <div className="space-x-2">
              <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} variant="outline" size="sm">Previous</Button>
              <span className="text-sm text-slate-600 dark:text-slate-300">Showing {companies.length} of {total}</span>
              <Button onClick={() => setPage(p => p + 1)} disabled={companies.length < 20} variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        title={rejectTarget ? `Reject ${rejectTarget.name}?` : "Reject Company"}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This company will stay in the queue until you submit the rejection.
          </p>
          <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Reason (optional)</span>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              rows={4}
              placeholder="Provide a reason for rejection..."
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={actionLoading === rejectTarget?.id} variant="danger">
              Reject Company
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(suspendTarget)}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget ? `Suspend ${suspendTarget.name}?` : "Suspend Company"}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Suspending this company will prevent its workers from using estate access until the company is reactivated.
          </p>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-500/30 dark:bg-orange-950/30 dark:text-orange-100">
            Confirm only if the suspension is intentional.
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSuspend} disabled={actionLoading === suspendTarget?.id} variant="danger">
              Suspend Company
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
