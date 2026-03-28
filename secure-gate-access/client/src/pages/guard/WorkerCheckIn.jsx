import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Loading, EmptyState } from "../../components/ui";
import {
  validateWorkerPass,
  checkInWorker,
  checkOutWorker,
  getActiveWorkers as fetchActiveWorkers
} from "../../services/companyService";

export default function WorkerCheckIn() {
  const [activeWorkers, setActiveWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrToken, setQrToken] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tab, setTab] = useState("active"); // active | scan

  const fetchActive = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchActiveWorkers();
      setActiveWorkers(res?.data?.workers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  const handleValidatePass = async (e) => {
    e.preventDefault();
    if (!qrToken.trim()) return;
    setActionLoading(true);
    setError(null);
    setScanResult(null);
    try {
      const res = await validateWorkerPass(qrToken.trim());
      setScanResult(res?.data || res);
    } catch (err) {
      setError(err?.data?.message || err.message || "Invalid pass");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!scanResult?.worker?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      await checkInWorker(scanResult.worker.id, {
        passId: scanResult.pass?.id,
        vehiclePlate: scanResult.worker?.vehiclePlate
      });
      setSuccess(`${scanResult.worker.firstName} ${scanResult.worker.lastName} checked in successfully`);
      setScanResult(null);
      setQrToken("");
      fetchActive();
    } catch (err) {
      setError(err?.data?.message || err.message || "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (checkInId) => {
    setActionLoading(true);
    setError(null);
    try {
      await checkOutWorker(checkInId);
      setSuccess("Worker checked out successfully");
      fetchActive();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Worker Access</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
          <button className="ml-2 underline" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "active" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          On Site ({activeWorkers.length})
        </button>
        <button
          onClick={() => setTab("scan")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "scan" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Scan Pass
        </button>
      </div>

      {tab === "scan" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-medium text-gray-900">Validate Worker Pass</h3>
          <form onSubmit={handleValidatePass} className="flex gap-3">
            <input
              type="text"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Enter or scan QR token..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <Button type="submit" disabled={actionLoading}>Validate</Button>
          </form>

          {scanResult && (
            <Card className="p-4 bg-green-50 border-green-200">
              <h4 className="font-medium text-green-800">Valid Worker Pass</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p><span className="text-gray-500">Name:</span> {scanResult.worker.firstName} {scanResult.worker.lastName}</p>
                <p><span className="text-gray-500">Company:</span> {scanResult.worker.companyName}</p>
                <p><span className="text-gray-500">Type:</span> <span className="capitalize">{scanResult.worker.workerType}</span></p>
                {scanResult.worker.vehiclePlate && (
                  <p><span className="text-gray-500">Vehicle:</span> {scanResult.worker.vehiclePlate}</p>
                )}
                <p><span className="text-gray-500">Pass Type:</span> <span className="capitalize">{scanResult.pass.passType}</span></p>
              </div>
              {scanResult.canCheckIn && (
                <Button onClick={handleCheckIn} disabled={actionLoading} className="mt-3">
                  Check In Worker
                </Button>
              )}
            </Card>
          )}
        </Card>
      )}

      {tab === "active" && (
        loading ? <Loading /> : activeWorkers.length === 0 ? (
          <EmptyState title="No Workers On Site" description="No workers are currently checked in." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeWorkers.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {w.firstName || w.first_name} {w.lastName || w.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {w.companyName || w.company_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                      {w.workerType || w.worker_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(w.checkInTime || w.check_in_time).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckOut(w.id)}
                        disabled={actionLoading}
                      >
                        Check Out
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
