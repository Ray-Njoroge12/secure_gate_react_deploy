import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import AddEstateModal from '../../components/modals/AddEstateModal';
import DecommissionEstateModal from '../../components/modals/DecommissionEstateModal';
import { GradientCard } from '../../components/ui';
import Button from '../../components/ui/Button';
import GradientButton from '../../components/ui/GradientButton';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirmation } from '../../components/common/ConfirmationDialog.jsx';
import notificationService from '../../services/notificationService';
import { handleApiError } from '../../utils/errorMapper';
import logger from '../../utils/logger.js';
import api from '../../utils/apiClient';

// Mock service for now, will implement real service calls
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { confirm, dialogProps, Dialog: ConfirmDialog } = useConfirmation();
    const [loading, setLoading] = useState(true);
    const [isAddEstateOpen, setIsAddEstateOpen] = useState(false);
    
    // Decommission Modal State
    const [isDecommissionOpen, setIsDecommissionOpen] = useState(false);
    const [estateToDecommission, setEstateToDecommission] = useState(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    const [stats, setStats] = useState({
        totalEstates: 0,
        totalUsers: 0,
        totalVisitors: 0,
        totalIncidents: 0
    });

    const [estates, setEstates] = useState([]);
    const [health, setHealth] = useState({ status: 'unknown', text: 'Checking...' });

    // System Metrics State
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'health'
    const [systemMetrics, setSystemMetrics] = useState(null);

    // MFA Status Badge
    const [mfaBadge, setMfaBadge] = useState({ enabled: null, required: false });

    const showApiErrorToast = useCallback((title, message) => {
        notificationService.error(title, message);
    }, []);

    useEffect(() => {
        const fetchMfaBadge = async () => {
            try {
                const response = await api.get('/api/mfa/status');
                if (response.data?.success) {
                    setMfaBadge({
                        enabled: response.data.data.mfaEnabled,
                        required: response.data.data.mfaRequired
                    });
                }
            } catch {
                // Silently fail — badge is non-critical
            }
        };
        fetchMfaBadge();
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Get Overview Stats
            try {
                const overviewRes = await api.get(`${API_BASE_URL}/api/admin/super-admin/overview`);
                const data = overviewRes.data;
                if (data.success && data.data) {
                    setStats(data.data.stats || {
                        totalEstates: 0,
                        totalUsers: 0,
                        totalVisitors: 0,
                        totalIncidents: 0
                    });
                    if (data.data.systemHealth) setHealth({ status: 'healthy', text: 'Operational' });
                } else if (data.stats) {
                    setStats(data.stats);
                    if (data.systemHealth) setHealth({ status: 'healthy', text: 'Operational' });
                }
            } catch (overviewErr) {
                const status = overviewErr.response?.status;
                if (status === 401 || status === 403) {
                    const errorData = overviewErr.response?.data || {};
                    
                    if (errorData.code === 'MFA_SETUP_REQUIRED' || errorData.error?.code === 'MFA_SETUP_REQUIRED') {
                        navigate('/mfa/setup', { 
                            state: { 
                                message: 'Multi-Factor Authentication is required for SuperAdmin access. Please complete setup to continue.',
                                returnUrl: '/dashboard/admin/super'
                            } 
                        });
                        return;
                    }
                    
                    setHealth({ status: 'error', text: 'Auth Failed' });
                    showApiErrorToast('Authentication Error', errorData.message || 'Session expired. Please login again.');
                    if (status === 401) logout();
                    return;
                }
                setHealth({ status: 'error', text: 'API Error' });
                showApiErrorToast('Overview Load Failed', 'Unable to load platform overview. Please retry.');
            }

            // 2. Get Estates List
            try {
                const estatesRes = await api.get(`${API_BASE_URL}/api/admin/super-admin/estates`);
                const data = estatesRes.data;
                if (data.success && data.data) {
                    setEstates(data.data || []);
                } else if (Array.isArray(data)) {
                    setEstates(data);
                }
            } catch {
                // Silently fail — estates list is non-critical here
            }

        } catch (err) {
            logger.error('SuperAdmin: Failed to load dashboard data:', err);
            showApiErrorToast('Dashboard Load Failed', 'Failed to load dashboard data');
            setHealth({ status: 'error', text: 'System Error' });
        } finally {
            setLoading(false);
        }
    }, [logout, navigate, showApiErrorToast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const fetchSystemMetrics = async () => {
        try {
            const res = await api.get(`${API_BASE_URL}/api/admin/super-admin/system/metrics`);
            setSystemMetrics(res.data.data);
        } catch (err) {
            logger.error('SuperAdmin: Failed to fetch system metrics:', err);
            showApiErrorToast('Metrics Refresh Failed', 'Failed to refresh system metrics.');
        }
    };

    useEffect(() => {
        if (activeTab === 'health') {
            fetchSystemMetrics();
            const interval = setInterval(fetchSystemMetrics, 30000); // Poll every 30s
            return () => clearInterval(interval);
        }
    }, [activeTab]);



    const handleSearch = async () => {
        if (!searchQuery || searchQuery.length < 3) return;
        setIsSearching(true);
        try {
            const res = await api.get(`${API_BASE_URL}/api/admin/super-admin/users/search?q=${encodeURIComponent(searchQuery)}`);
            const data = res.data;
            const normalizedResults = Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data)
                    ? data
                    : [];
            setSearchResults(normalizedResults);
        } catch (err) {
            showApiErrorToast('Search Failed', handleApiError(err));
        } finally {
            setIsSearching(false);
        }
    };

    const handleImpersonate = (estateId) => {
        navigate(`/dashboard/admin?siteId=${estateId}`);
    };

    const handleEstateAdded = (_newEstate) => {
        fetchDashboardData();
    };

    const handleDecommissionClick = (estate) => {
        setEstateToDecommission(estate);
        setIsDecommissionOpen(true);
    };

    const handleDecommissionSuccess = () => {
        setEstateToDecommission(null);
        fetchDashboardData();
    };

    const handleStatusChange = async (estateId, newStatus) => {
        const confirmed = await confirm({
            variant: 'warning',
            title: 'Change Estate Status',
            message: `Are you sure you want to ${newStatus} this estate?`,
            confirmText: 'Confirm'
        });
        if (!confirmed) return;

        try {
            // Optimistic update
            setEstates(prev => prev.map(e => e.id === estateId ? { ...e, status: newStatus } : e));

            await api.patch(`${API_BASE_URL}/api/admin/super-admin/estates/${estateId}/status`, { status: newStatus });

            // Refresh real data to confirm
            fetchDashboardData();
        } catch (err) {
            logger.error('SuperAdmin: Estate status change failed:', err);
            showApiErrorToast('Status Update Failed', handleApiError(err));
            // Revert on error
            fetchDashboardData();
        }
    };

    const statToneClasses = {
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
    };

    const StatCard = ({ title, value, iconName, color }) => (
        <GradientCard className="p-6 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-300">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${statToneClasses[color] || statToneClasses.blue}`}>
                <Icon name={iconName} className="w-6 h-6" />
            </div>
        </GradientCard>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
                {/* Welcome Section */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Platform Overview</h2>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${health.status === 'healthy'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            }`}>
                            <Icon name="Activity" className="w-3 h-3 mr-1.5" />
                            System: {health.text}
                        </div>
                        {/* MFA Status Badge */}
                        {mfaBadge.enabled !== null && (
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/admin/settings')}
                                className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${mfaBadge.enabled
                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40'
                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
                                }`}
                                aria-label={mfaBadge.enabled ? 'MFA is enabled. Click to manage.' : 'MFA is not set up. Click to set up.'}
                                title={mfaBadge.enabled ? 'MFA Enabled' : 'MFA Not Set Up — Click to configure'}
                            >
                                <Icon name={mfaBadge.enabled ? "ShieldCheck" : "ShieldAlert"} className="w-3 h-3 mr-1.5" />
                                MFA: {mfaBadge.enabled ? 'On' : 'Off'}
                            </button>
                        )}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate('/dashboard/admin/help/security')}
                            className="text-xs"
                        >
                            Security Help
                        </Button>
                        <GradientButton onClick={() => setIsAddEstateOpen(true)} size="sm" icon="Plus">
                            Add Estate
                        </GradientButton>
                        <GradientButton onClick={fetchDashboardData} size="sm" variant="outline">
                            Refresh Data
                        </GradientButton>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Dashboard sections">
                    <Button
                        id="super-admin-tab-overview"
                        variant={activeTab === 'overview' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('overview')}
                        role="tab"
                        aria-selected={activeTab === 'overview'}
                        aria-controls="super-admin-panel-overview"
                        tabIndex={activeTab === 'overview' ? 0 : -1}
                        size="sm"
                    >
                        Platform Overview
                    </Button>
                    <Button
                        id="super-admin-tab-health"
                        variant={activeTab === 'health' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('health')}
                        role="tab"
                        aria-selected={activeTab === 'health'}
                        aria-controls="super-admin-panel-health"
                        tabIndex={activeTab === 'health' ? 0 : -1}
                        size="sm"
                    >
                        System Health Monitor
                    </Button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div
                        id="super-admin-panel-overview"
                        role="tabpanel"
                        aria-labelledby="super-admin-tab-overview"
                        className="space-y-6"
                    >


                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Active Estates" value={stats.totalEstates} iconName="Building2" color="blue" />
                            <StatCard title="Total Users" value={stats.totalUsers} iconName="Users" color="green" />
                            <StatCard title="Total Visitors" value={stats.totalVisitors} iconName="LayoutDashboard" color="purple" />
                            <StatCard title="Total Incidents" value={stats.totalIncidents} iconName="AlertTriangle" color="orange" />
                        </div>

                        {/* Global User Search */}
                        <GradientCard className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Icon name="Search" className="w-5 h-5 mr-2 text-indigo-500" />
                                    Global User Search
                                </h3>
                            </div>

                            <div className="mb-6 relative">
                                <label htmlFor="super-admin-user-search" className="sr-only">
                                    Search users by name, email, or phone
                                </label>
                                <input
                                    id="super-admin-user-search"
                                    type="text"
                                    placeholder="Search users by name, email, or phone (min 3 chars to preserve privacy)..."
                                    className="w-full pl-10 pr-24 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-500 dark:placeholder:text-slate-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Icon name="Search" className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                <Button
                                    variant="primary" size="sm"
                                    onClick={handleSearch}
                                    disabled={isSearching || searchQuery.length < 3}
                                    loading={isSearching}
                                    className="absolute right-1 top-1 px-4 py-1.5 text-xs"
                                >
                                    Search
                                </Button>
                            </div>

                            {searchResults && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-300 text-xs uppercase tracking-wider">
                                                <th className="px-6 py-3 font-semibold">User Info</th>
                                                <th className="px-6 py-3 font-semibold">Contact (Redacted)</th>
                                                <th className="px-6 py-3 font-semibold">Role</th>
                                                <th className="px-6 py-3 font-semibold">Estate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {searchResults.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                        No users found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                searchResults.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                        <td className="px-6 py-3">
                                                            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                            <div className="font-mono text-xs">{user.email}</div>
                                                            <div className="font-mono text-xs text-gray-500 dark:text-gray-300">{user.phone}</div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                                                                    user.role === 'guard' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'}`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                                            {user.estate_name}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </GradientCard>

                        {/* Estates Management */}
                        <GradientCard className="overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Icon name="Building2" className="w-5 h-5 mr-2 text-indigo-500" />
                                    Manage Estates
                                </h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{estates.length} Estates found</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-300 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold">Estate Name</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Created</th>
                                            <th className="px-6 py-4 font-semibold text-center">Users</th>
                                            <th className="px-6 py-4 font-semibold text-center">Visitors</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                    <div className="flex justify-center items-center">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                                        <span className="ml-2">Loading network data...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : estates.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                    No estates found.
                                                </td>
                                            </tr>
                                        ) : (
                                            estates.map((estate) => (
                                                <tr key={estate.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${estate.status === 'suspended' ? 'opacity-75 bg-red-50/30 dark:bg-red-900/20' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900 dark:text-white">{estate.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {estate.id}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estate.status === 'active'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                            : estate.status === 'suspended'
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                                : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                                                            }`}>
                                                            {estate.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {new Date(estate.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                                            {estate.userCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                                            {estate.visitorCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {estate.status !== 'suspended' && (
                                                            <Button
                                                                variant="primary" size="sm"
                                                                onClick={() => handleImpersonate(estate.id)}
                                                                className="inline-flex items-center text-xs"
                                                            >
                                                                Manage
                                                                <Icon name="ArrowRight" className="ml-1.5 w-3 h-3" />
                                                            </Button>
                                                        )}

                                                        {estate.status === 'suspended' ? (
                                                            <Button
                                                                variant="primary" size="sm"
                                                                onClick={() => handleStatusChange(estate.id, 'active')}
                                                                className="text-xs"
                                                            >
                                                                Activate
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="danger" size="sm"
                                                                onClick={() => handleStatusChange(estate.id, 'suspended')}
                                                                className="text-xs"
                                                            >
                                                                Suspend
                                                            </Button>
                                                        )}
                                                        
                                                        {/* Decommission Button */}
                                                        {estate.status !== 'decommissioned' && (
                                                            <Button
                                                                variant="ghost" size="sm"
                                                                onClick={() => handleDecommissionClick(estate)}
                                                                aria-label="Decommission Estate"
                                                                className="text-gray-500 dark:text-gray-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                                <Icon name="Trash2" className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </GradientCard>

                        <GradientCard>
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 h-full flex flex-col items-center justify-center text-center">
                                <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Super Admin Privileges</h3>
                                <p className="mt-2 text-xs text-indigo-700 dark:text-indigo-300">
                                    You have full root access to the platform. Actions performed here affect the entire system and all estates.
                                </p>
                            </div>
                        </GradientCard>
                    </div>
                )}

                {/* System Health Tab */}
                {activeTab === 'health' && (
                    <div
                        id="super-admin-panel-health"
                        role="tabpanel"
                        aria-labelledby="super-admin-tab-health"
                        className="space-y-6"
                    >
                        {/* Health Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <GradientCard className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <Icon name="Activity" className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Latency (P95)</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {systemMetrics?.latency?.p95 ? `${Math.round(systemMetrics.latency.p95)}ms` : '--'}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">P99: {systemMetrics?.latency?.p99 ? `${Math.round(systemMetrics.latency.p99)}ms` : '--'}</p>
                            </GradientCard>

                            <GradientCard className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                                        <Icon name="AlertTriangle" className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Error Rate</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {systemMetrics?.errorRate ? `${(systemMetrics.errorRate * 100).toFixed(2)}%` : '0%'}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{systemMetrics?.requestCount || 0} Total Requests</p>
                            </GradientCard>

                            <GradientCard className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                        <Icon name="Database" className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">DB Utilization</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {systemMetrics?.dbPool?.utilization ? `${(systemMetrics.dbPool.utilization * 100).toFixed(1)}%` : '0%'}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{systemMetrics?.dbPool?.totalCount || 0} / {systemMetrics?.dbPool?.maxConnections || 0} Conn.</p>
                            </GradientCard>

                            <GradientCard className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                        <Icon name="Server" className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Queue Depth</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {systemMetrics?.queueDepth?.totalBacklog || 0}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pending Jobs</p>
                            </GradientCard>
                        </div>

                        {/* Detailed Metrics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <GradientCard className="p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                    <Icon name="Cpu" className="w-5 h-5 mr-2 text-indigo-500" />
                                    System Status Details
                                </h3>
                                <dl className="space-y-4 text-sm">
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
                                        <span className="text-gray-500 dark:text-gray-400">Auth Anomalies</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{systemMetrics?.authAnomalies || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
                                        <span className="text-gray-500 dark:text-gray-400">Last Snapshot</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {systemMetrics?.timestamp ? new Date(systemMetrics.timestamp).toLocaleTimeString() : '--'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
                                        <span className="text-gray-500 dark:text-gray-400">Notification Queue</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{systemMetrics?.queueDepth?.notification?.backlog || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2">
                                        <span className="text-gray-500 dark:text-gray-400">Export Queue</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{systemMetrics?.queueDepth?.export?.queued || 0}</span>
                                    </div>
                                </dl>
                            </GradientCard>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <AddEstateModal
                    isOpen={isAddEstateOpen}
                    onClose={() => setIsAddEstateOpen(false)}
                    onSuccess={handleEstateAdded}
                />
                
                <DecommissionEstateModal
                    isOpen={isDecommissionOpen}
                    onClose={() => {
                        setIsDecommissionOpen(false);
                        setEstateToDecommission(null);
                    }}
                    estate={estateToDecommission}
                    onSuccess={handleDecommissionSuccess}
                />

                <ConfirmDialog {...dialogProps} />
        </div>
    );
}
