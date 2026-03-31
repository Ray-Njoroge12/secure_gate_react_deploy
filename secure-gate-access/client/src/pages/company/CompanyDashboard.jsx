import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext.js";
import { Card, Button, Badge, Loading, EmptyState } from "../../components/ui";
import { navigateTo } from "../../utils/appNavigation";
import { getCompany, listWorkers, getActiveWorkers as fetchActiveWorkers } from "../../services/companyService";

const STATUS_VARIANTS = {
  approved: "success",
  pending: "pending",
  suspended: "warning",
  rejected: "danger"
};

const STATUS_LABELS = {
  approved: "Approved",
  pending: "Pending",
  suspended: "Suspended",
  rejected: "Rejected"
};

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [stats, setStats] = useState({ totalWorkers: 0, activeOnSite: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const companyRes = await getCompany(user.company_id || user.companyId);
      setCompany(companyRes?.data?.company || null);

      const [workersRes, activeRes] = await Promise.all([
        listWorkers({ companyId: user.company_id || user.companyId }),
        fetchActiveWorkers()
      ]);

      const workers = workersRes?.data?.workers || [];
      const active = activeRes?.data?.workers || [];

      setStats({
        totalWorkers: workersRes?.data?.total || workers.length,
        activeOnSite: active.length,
        pending: workers.filter(w => w.status === "pending").length
      });
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-12">
        <Loading text="Loading company dashboard" />
      </div>
    );
  }

  if (error) {
    return (
      <Card
        className="border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30"
        role="alert"
        aria-live="polite"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="danger" size="sm">Error</Badge>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Company dashboard unavailable
            </h1>
            <p className="max-w-2xl text-sm text-gray-700 dark:text-gray-300">
              {error}
            </p>
          </div>
          <Button variant="outline" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!company) {
    return (
      <EmptyState
        title="No company profile found"
        description="We could not load a company profile for this account. Try again or return to the company area."
        primaryAction={{
          label: "Retry",
          onClick: fetchData,
          variant: "outline"
        }}
        secondaryAction={{
          label: "Back to Company",
          onClick: () => navigateTo("/dashboard/company")
        }}
      />
    );
  }

  const companyStatus = company.status || "pending";
  const statusVariant = STATUS_VARIANTS[companyStatus] || "default";
  const statusLabel = STATUS_LABELS[companyStatus] || companyStatus;

  return (
    <div className="space-y-6">
      <Card className="bg-white/95 dark:bg-slate-800/90 border-gray-200 dark:border-slate-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {company.name || "Company Dashboard"}
              </h1>
              <Badge variant={statusVariant} size="sm" aria-label={`Company status: ${statusLabel}`}>
                {statusLabel}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              Manage workers, bulk registration, and company settings from a single dashboard.
            </p>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Registration</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {company.registrationNumber || company.registration_number || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Contact</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {company.contactName || company.contact_name || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {company.contactEmail || company.contact_email || "Not provided"}
                </dd>
              </div>
            </dl>
          </div>
          <Button variant="outline" onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </Card>

      {companyStatus === "pending" && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="space-y-2">
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Your company registration is pending admin approval.
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You will be able to manage workers once approved. You can still review the company profile and prepare settings.
            </p>
          </div>
        </Card>
      )}

      {companyStatus === "approved" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Workers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalWorkers}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">On Site Now</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.activeOnSite}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigateTo("/company/workers")}
              aria-label="Manage workers"
              hover
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">Manage Workers</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Add, edit, and manage your workforce access
              </p>
            </Card>
            <Card
              className="p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigateTo("/company/workers/bulk-register")}
              aria-label="Bulk register workers"
              hover
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">Bulk Register</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Register multiple workers at once
              </p>
            </Card>
            <Card
              className="p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigateTo("/company/settings")}
              aria-label="Open company settings"
              hover
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">Company Settings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Update company details and locations
              </p>
            </Card>
          </div>
        </>
      )}

      {companyStatus !== "approved" && companyStatus !== "pending" && (
        <Card className="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Company access is currently {statusLabel.toLowerCase()}. Management tools will remain limited until the status changes.
          </p>
        </Card>
      )}
    </div>
  );
}
