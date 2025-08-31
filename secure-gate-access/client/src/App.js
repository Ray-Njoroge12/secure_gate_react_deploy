import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegistrationPage from "./pages/Register";
import ResidentDashboard from "./pages/resident/ResidentDashboard";
import GuardDashboard from "./pages/guard/GuardDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />

        <Route
          path="/dashboard/resident"
          element={
            <ProtectedRoute role="resident">
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guard"
          element={
            <ProtectedRoute role="security">
              <GuardDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
