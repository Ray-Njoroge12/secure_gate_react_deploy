import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext.js";
import { Card, Button } from "../../components/ui";
import { bulkRegisterWorkers } from "../../services/companyService";
import { navigateTo } from "../../utils/appNavigation";

const CSV_TEMPLATE = "first_name,last_name,phone,email,id_number,worker_type,vehicle_plate\nJohn,Doe,+254700000000,john@example.com,12345678,employee,KAA 123A";

export default function BulkWorkerRegistration() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [csvText, setCsvText] = useState("");
  const [preApproved, setPreApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const companyId = user?.company_id || user?.companyId;

  const parseCsv = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const parsed = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      if (values.length < 2) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });

      if (row.first_name && row.last_name) {
        parsed.push({
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone || "",
          email: row.email || "",
          idNumber: row.id_number || "",
          workerType: row.worker_type || "employee",
          vehiclePlate: row.vehicle_plate || ""
        });
      }
    }
    return parsed;
  };

  const handleParse = () => {
    const parsed = parseCsv(csvText);
    if (parsed.length === 0) {
      setError("No valid workers found in CSV. Ensure the header row and at least one data row are present.");
      return;
    }
    setWorkers(parsed);
    setError(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (workers.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await bulkRegisterWorkers({
        companyId,
        workers,
        preApproved
      });
      setResult(res?.data || res);
    } catch (err) {
      setError(err.message || "Failed to register workers");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveWorker = (index) => {
    setWorkers(ws => ws.filter((_, i) => i !== index));
  };

  if (result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Registration Complete</h1>
        <Card className="p-6">
          <p className="text-lg text-green-700 font-medium">
            {result.registered} worker{result.registered !== 1 ? "s" : ""} registered successfully
          </p>
          {result.errors?.length > 0 && (
            <div className="mt-4">
              <p className="text-red-600 font-medium">{result.errors.length} failed:</p>
              <ul className="mt-2 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-sm text-red-500">
                    Row {err.index + 1} ({err.name}): {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <Button onClick={() => navigateTo("/company/workers")}>View Workers</Button>
            <Button variant="outline" onClick={() => { setResult(null); setWorkers([]); setCsvText(""); }}>
              Register More
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Worker Registration</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Upload CSV File</h3>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-2">Or Paste CSV Data</h3>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={CSV_TEMPLATE}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            rows={8}
          />
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={handleParse} variant="outline">Parse CSV</Button>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={preApproved} onChange={e => setPreApproved(e.target.checked)} />
            <span className="text-sm text-gray-700">Pre-approve all workers</span>
          </label>
        </div>

        <details className="text-sm text-gray-500">
          <summary className="cursor-pointer font-medium">CSV Format</summary>
          <pre className="mt-2 bg-gray-50 p-3 rounded overflow-x-auto text-xs">{CSV_TEMPLATE}</pre>
          <p className="mt-1">Required: first_name, last_name. Optional: phone, email, id_number, worker_type (employee/subcontractor), vehicle_plate</p>
        </details>
      </Card>

      {workers.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">{workers.length} Workers to Register</h3>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Registering..." : `Register ${workers.length} Workers`}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workers.map((w, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{w.firstName} {w.lastName}</td>
                    <td className="px-3 py-2">{w.phone || "-"}</td>
                    <td className="px-3 py-2 capitalize">{w.workerType}</td>
                    <td className="px-3 py-2">{w.vehiclePlate || "-"}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => handleRemoveWorker(i)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
