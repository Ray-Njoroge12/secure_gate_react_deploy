import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext.js";
import { Card, Button, Badge, Loading, EmptyState } from "../../components/ui";
import { navigateTo } from "../../utils/appNavigation";
import { getCompany, listWorkers, getActiveWorkers as fetchActiveWorkers } from "../../services/companyService";

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

  if (loading) return <Loading />;
  if (error) return <EmptyState title="Error" description={error} />;

  const statusColor = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    suspended: "bg-red-100 text-red-800",
    rejected: "bg-red-100 text-red-800"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {company?.name || "Company Dashboard"}
          </h1>
          {company?.status && (
            <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${statusColor[company.status] || "bg-gray-100 text-gray-800"}`}>
              {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
            </span>
          )}
        </div>
      </div>

      {company?.status === "pending" && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="p-4">
            <p className="text-yellow-800 font-medium">Your company registration is pending admin approval.</p>
            <p className="text-yellow-600 text-sm mt-1">You will be able to manage workers once approved.</p>
          </div>
        </Card>
      )}

      {company?.status === "approved" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-500">Total Workers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalWorkers}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500">On Site Now</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeOnSite}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigateTo("/company/workers")}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigateTo("/company/workers"); }}>
              <h3 className="font-semibold text-gray-900">Manage Workers</h3>
              <p className="text-sm text-gray-500 mt-1">Add, edit, and manage your workforce access</p>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigateTo("/company/workers/bulk-register")}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigateTo("/company/workers/bulk-register"); }}>
              <h3 className="font-semibold text-gray-900">Bulk Register</h3>
              <p className="text-sm text-gray-500 mt-1">Register multiple workers at once</p>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigateTo("/company/settings")}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigateTo("/company/settings"); }}>
              <h3 className="font-semibold text-gray-900">Company Settings</h3>
              <p className="text-sm text-gray-500 mt-1">Update company details and locations</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
