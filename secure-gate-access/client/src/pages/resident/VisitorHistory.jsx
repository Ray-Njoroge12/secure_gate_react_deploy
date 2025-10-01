import React from "react";

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

  return (
    <div className="panel">
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button className="btn" onClick={fetchMine} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Check-in</th>
            <th>Check-out</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name || mask(r.phone) || ""}</td>
              <td>{r.status || ""}</td>
              <td>{r.check_in || r.check_in_time || ""}</td>
              <td>{r.check_out || r.check_out_time || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
