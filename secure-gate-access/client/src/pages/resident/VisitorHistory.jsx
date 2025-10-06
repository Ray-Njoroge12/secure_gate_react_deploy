import React from "react";
import Table from "../../components/Table";
import { Button } from "../../components/ui";
import { RefreshCw } from "lucide-react";

function mask(value) {
  if (!value) return "";
  if (String(value).includes("@")) return `${value[0]}***${value.slice(-1)}`;
  const d = String(value).replace(/\D+/g, "");
  return d.length >= 4 ? `${d.slice(0, 2)}***${d.slice(-2)}` : "***";
}

export default function VisitorHistory() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  async function fetchMine() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/visitors', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json?.success) setRows(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchMine();
    const t = setInterval(fetchMine, 10000);
    return () => clearInterval(t);
  }, []);

  // Transform data for table
  const tableData = rows.map((r) => [
    r.name || mask(r.phone) || "Unknown",
    r.status || "Unknown",
    r.check_in || r.check_in_time || "Not checked in",
    r.check_out || r.check_out_time || "Not checked out"
  ]);

  const headers = ["Name", "Status", "Check-in", "Check-out"];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-200">Visitor History</h2>
        <Button
          onClick={fetchMine}
          disabled={loading}
          variant="outline"
          size="sm"
          icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Table headers={headers} rows={tableData} />
    </div>
  );
}
