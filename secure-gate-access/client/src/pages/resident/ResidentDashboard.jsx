import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

export default function ResidentDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="app-grid">
      <Sidebar role="resident" />
      <div>
        <Topbar title="Resident Dashboard" onLogout={onLogout} />
        <main className="main">
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          </div>
        </main>
      </div>
    </div>
  );
}
