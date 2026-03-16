import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { useError } from "../contexts/ErrorContext.jsx";
import { useState, useEffect } from "react";
import { EnhancedLoading } from "../components/ui/EnhancedLoading.jsx";
import { StatsCard } from "../components/StatsCard.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import Button from "../components/ui/Button";
import api from "../utils/apiClient";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { handleError, handleSuccess } = useError();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Redirect if not authenticated  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    
    // Load dashboard data based on role
    loadDashboardData();
  }, [isAuthenticated, user, navigate]);

  const loadDashboardData = async () => {
    if (!user?.role) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/dashboard/${user.role}`);
      setDashboardData(response.data);
    } catch (error) {
      handleError('Failed to load dashboard data', {
        context: 'Dashboard',
        title: 'Loading Error',
        showRecoveryActions: true,
        onRetry: loadDashboardData
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleSuccess('Successfully logged out', {
        context: 'Logout',
        title: 'Goodbye!',
        autoClose: true,
        autoCloseDelay: 2000
      });
      navigate("/login", { replace: true });
    } catch (error) {
      handleError('Error during logout', {
        context: 'Logout',
        title: 'Logout Error'
      });
    }
  };

  const getRoleDashboard = () => {
    if (!user?.role) return null;

    switch (user.role) {
      case 'admin':
        return <AdminDashboard data={dashboardData} onRefresh={loadDashboardData} />;
      case 'guard':
        return <GuardDashboard data={dashboardData} onRefresh={loadDashboardData} />;
      case 'resident':
        return <ResidentDashboard data={dashboardData} onRefresh={loadDashboardData} />;
      default:
        return <DefaultDashboard data={dashboardData} onRefresh={loadDashboardData} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EnhancedLoading 
          type="page"
          message={`Loading your ${user?.role || 'user'} dashboard...`}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title={`${user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'} Dashboard`}
        subtitle={`Welcome back, ${user?.username || user?.email || 'User'}!`}
        actions={
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        }
      />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {getRoleDashboard()}
      </main>
    </div>
  );
}

// Role-specific dashboard components
const AdminDashboard = ({ data, onRefresh }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard 
        title="Total Users" 
        value={data?.userCount || 0} 
        icon="users"
        trend={data?.userTrend}
      />
      <StatsCard 
        title="Active Sessions" 
        value={data?.activeSessions || 0} 
        icon="activity"
        trend={data?.sessionTrend}
      />
      <StatsCard 
        title="Security Events" 
        value={data?.securityEvents || 0} 
        icon="shield"
        trend={data?.securityTrend}
      />
      <StatsCard 
        title="System Health" 
        value={data?.systemHealth || 'Good'} 
        icon="heart"
        status={data?.healthStatus}
      />
    </div>
    
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Recent Activity
      </h3>
      <p className="text-gray-500">Admin dashboard features coming soon...</p>
    </div>
  </div>
);

const GuardDashboard = ({ data, onRefresh }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatsCard 
        title="Active Passes" 
        value={data?.activePasses || 0} 
        icon="badge-check"
      />
      <StatsCard 
        title="Visitors Today" 
        value={data?.visitorsToday || 0} 
        icon="users"
      />
      <StatsCard 
        title="Security Alerts" 
        value={data?.securityAlerts || 0} 
        icon="alert-triangle"
      />
    </div>
    
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Guard Controls
      </h3>
      <p className="text-gray-500">Guard dashboard features coming soon...</p>
    </div>
  </div>
);

const ResidentDashboard = ({ data, onRefresh }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatsCard 
        title="My Passes" 
        value={data?.myPasses || 0} 
        icon="badge"
      />
      <StatsCard 
        title="Visitors This Month" 
        value={data?.monthlyVisitors || 0} 
        icon="users"
      />
    </div>
    
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Quick Actions
      </h3>
      <div className="space-y-3">
        <Button variant="ghost" className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200">
          <div className="font-medium text-blue-900 dark:text-blue-200">Create Visitor Pass</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Generate a new pass for your visitor</div>
        </Button>
        <Button variant="ghost" className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg transition-colors duration-200">
          <div className="font-medium text-green-900 dark:text-green-200">View My Passes</div>
          <div className="text-sm text-green-700 dark:text-green-300">See all your active and expired passes</div>
        </Button>
      </div>
    </div>
  </div>
);

const DefaultDashboard = ({ data, onRefresh }) => (
  <div className="text-center py-12">
    <div className="max-w-md mx-auto">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">Welcome!</h3>
      <p className="mt-1 text-sm text-gray-500">
        Your dashboard will be available once your account is fully configured.
      </p>
    </div>
  </div>
);
