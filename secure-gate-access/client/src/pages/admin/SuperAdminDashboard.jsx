import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Building2, Users, AlertTriangle, Activity, LayoutDashboard, LogOut, ArrowRight, Server, Plus, Search, FileText, Cpu, Database, Wifi } from 'lucide-react';
import { GradientCard } from '../../components/ui';
import GradientButton from '../../components/ui/GradientButton';
import AddEstateModal from '../../components/modals/AddEstateModal';
import Table from '../../components/Table';
import { handleApiError } from '../../utils/errorMapper';
import logger from '../../utils/logger';

// Mock service for now, will implement real service calls
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddEstateOpen, setIsAddEstateOpen] = useState(false);

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
    const [logs, setLogs] = useState([]);
    const [health, setHealth] = useState({ status: 'unknown', text: 'Checking...' });

    // System Metrics State
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'health'
    const [systemMetrics, setSystemMetrics] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const headers = {
                'Content-Type': 'application/json'
            };

            // 1. Get Overview Stats
            const overviewRes = await fetch(`${API_BASE_URL}/api/admin/super-admin/overview`, {
                headers,
                credentials: 'include'
            });

            if (overviewRes.status === 401 || overviewRes.status === 403) {
                setHealth({ status: 'error', text: 'Auth Failed' });
                setError('Session expired. Please login again.');
                if (overviewRes.status === 401) logout(); // Auto logout on 401
                return;
            }

            if (overviewRes.ok) {
                const data = await overviewRes.json();
                if (data.success && data.data) {
                    setStats(data.data.stats || stats);
                    if (data.data.systemHealth) setHealth({ status: 'healthy', text: 'Operational' });
                } else if (data.stats) {
                    setStats(data.stats);
                    if (data.systemHealth) setHealth({ status: 'healthy', text: 'Operational' });
                }
            } else {
                setHealth({ status: 'error', text: 'API Error' });
            }

            // 2. Get Estates List
            const estatesRes = await fetch(`${API_BASE_URL}/api/admin/super-admin/estates`, {
                headers,
                credentials: 'include'
            });
            if (estatesRes.ok) {
                const data = await estatesRes.json();
                if (data.success && data.data) {
                    setEstates(data.data || []);
                } else if (Array.isArray(data)) {
                    setEstates(data);
                }
            }

            // 3. Get Recent Logs
            const logsRes = await fetch(`${API_BASE_URL}/api/admin/super-admin/audit-logs?limit=10`, {
                headers,
                credentials: 'include'
            });
            if (logsRes.ok) {
                const data = await logsRes.json();
                setLogs(data.data || data || []);
            }

        } catch (err) {
            console.error('Failed to load super admin data:', err);
            setError('Failed to load dashboard data');
            setHealth({ status: 'error', text: 'System Error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemMetrics = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/super-admin/system/metrics`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setSystemMetrics(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch system metrics:', err);
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
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/super-admin/users/search?q=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            setSearchResults(data.data || data);
        } catch (err) {
            setError(handleApiError(err));
        } finally {
            setIsSearching(false);
        }
    };

    const handleImpersonate = (estateId) => {
        navigate(`/dashboard/admin?siteId=${estateId}`);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleEstateAdded = (newEstate) => {
        fetchDashboardData();
    };

    const handleStatusChange = async (estateId, newStatus) => {
        if (!window.confirm(`Are you sure you want to ${newStatus} this estate?`)) return;

        try {
            // Optimistic update
            setEstates(prev => prev.map(e => e.id === estateId ? { ...e, status: newStatus } : e));

            console.log('Sending PATCH to:', `${API_BASE_URL}/api/admin/super-admin/estates/${estateId}/status`);
            console.log('Payload:', { status: newStatus });

            const res = await fetch(`${API_BASE_URL}/api/admin/super-admin/estates/${estateId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });

            console.log('Response status:', res.status);
            const resText = await res.text();
            console.log('Response body:', resText);

            if (!res.ok) {
                try {
                    const json = JSON.parse(resText);
                    throw new Error(json.message || 'Failed to update status');
                } catch (e) {
                    throw new Error('Failed to update status: ' + resText);
                }
            }

            // Refresh real data to confirm
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            setError(handleApiError(err));
            // Revert on error
            fetchDashboardData();
        }
    };

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <GradientCard className="p-6 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
                <Icon className="w-6 h-6" />
            </div>
        </GradientCard>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Top Navigation */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">SecureGate <span className="text-indigo-600">Platform</span></h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Super Admin Control Center</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${health.status === 'healthy'
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        <Activity className="w-3 h-3 mr-1.5" />
                        System: {health.text}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* Welcome Section */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h2>
                    <div className="flex space-x-3">
                        <GradientButton onClick={() => setIsAddEstateOpen(true)} size="sm" icon={Plus}>
                            Add Estate
                        </GradientButton>
                        <GradientButton onClick={fetchDashboardData} size="sm" variant="outline">
                            Refresh Data
                        </GradientButton>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'overview'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                    >
                        Platform Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('health')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'health'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                    >
                        System Health Monitor
                    </button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">


                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Active Estates" value={stats.totalEstates} icon={Building2} color="blue" />
                            <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="green" />
                            <StatCard title="Total Visitors" value={stats.totalVisitors} icon={LayoutDashboard} color="purple" />
                            <StatCard title="Total Incidents" value={stats.totalIncidents} icon={AlertTriangle} color="orange" />
                        </div>

                        {/* Global User Search */}
                        <GradientCard className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Search className="w-5 h-5 mr-2 text-indigo-500" />
                                    Global User Search
                                </h3>
                            </div>

                            <div className="mb-6 relative">
                                <input
                                    type="text"
                                    placeholder="Search users by name, email, or phone (min 3 chars to preserve privacy)..."
                                    className="w-full pl-10 pr-24 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching || searchQuery.length < 3}
                                    className="absolute right-1 top-1 px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSearching ? 'Searching...' : 'Search'}
                                </button>
                            </div>

                            {searchResults && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                                <th className="px-6 py-3 font-semibold">User Info</th>
                                                <th className="px-6 py-3 font-semibold">Contact (Redacted)</th>
                                                <th className="px-6 py-3 font-semibold">Role</th>
                                                <th className="px-6 py-3 font-semibold">Estate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {searchResults.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                        No users found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                searchResults.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-6 py-3">
                                                            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                            <div className="text-xs text-gray-500">Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                            <div className="font-mono text-xs">{user.email}</div>
                                                            <div className="font-mono text-xs text-gray-400">{user.phone}</div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                                                                    user.role === 'guard' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
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
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Building2 className="w-5 h-5 mr-2 text-indigo-500" />
                                    Manage Estates
                                </h3>
                                <span className="text-sm text-gray-500">{estates.length} Estates found</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold">Estate Name</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Created</th>
                                            <th className="px-6 py-4 font-semibold text-center">Users</th>
                                            <th className="px-6 py-4 font-semibold text-center">Visitors</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                    <div className="flex justify-center items-center">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                                        <span className="ml-2">Loading network data...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : estates.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                    No estates found.
                                                </td>
                                            </tr>
                                        ) : (
                                            estates.map((estate) => (
                                                <tr key={estate.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${estate.status === 'suspended' ? 'opacity-75 bg-red-50/30' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900 dark:text-white">{estate.name}</div>
                                                        <div className="text-xs text-gray-500">ID: {estate.id}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estate.status === 'active'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                            : estate.status === 'suspended'
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
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
                                                            <button
                                                                onClick={() => handleImpersonate(estate.id)}
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                                            >
                                                                Manage
                                                                <ArrowRight className="ml-1.5 w-3 h-3" />
                                                            </button>
                                                        )}

                                                        {estate.status === 'suspended' ? (
                                                            <button
                                                                onClick={() => handleStatusChange(estate.id, 'active')}
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none transition-colors"
                                                            >
                                                                Activate
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleStatusChange(estate.id, 'suspended')}
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none transition-colors"
                                                            >
                                                                Suspend
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </GradientCard>

                        {/* System Logs / Audit Preview */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <GradientCard className="lg:col-span-2 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                                        Recent System Activity
                                    </h3>
                                    <button className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium">
                                        View All Logs
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-gray-500">
                                            <tr>
                                                <th className="px-4 py-3">Time</th>
                                                <th className="px-4 py-3">Event</th>
                                                <th className="px-4 py-3">User</th>
                                                <th className="px-4 py-3">Resource</th>
                                                <th className="px-4 py-3 text-right">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {logs.length === 0 ? (
                                                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No logs found</td></tr>
                                            ) : (
                                                logs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                    ${log.action?.includes('delete') || log.action?.includes('suspend') || log.action?.includes('fail') ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                                                    log.action?.includes('create') || log.action?.includes('success') ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                                                        log.action?.includes('update') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                                                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                                {log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">
                                                            {log.user_id ? (
                                                                <span title={`User ID: ${log.user_id}`}>{log.user_role || 'User'} (#{log.user_id})</span>
                                                            ) : (
                                                                <span className="text-gray-400">System</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px] text-gray-500">
                                                            {log.resource}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button className="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400 text-xs font-medium">
                                                                JSON
                                                            </button>
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
                    </div>
                )}

                {/* System Health Tab */}
                {activeTab === 'health' && (
                    <div className="space-y-6">
                        {/* Health Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <GradientCard className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Latency (P95)</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {systemMetrics?.latency?.p95 ? `${Math.round(systemMetrics.latency.p95)}ms` : '--'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">P99: {systemMetrics?.latency?.p99 ? `${Math.round(systemMetrics.latency.p99)}ms` : '--'}</p>
                            </GradientCard>

                            <GradientCard className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Error Rate</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {systemMetrics?.errorRate ? `${(systemMetrics.errorRate * 100).toFixed(2)}%` : '0%'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">{systemMetrics?.requestCount || 0} Total Requests</p>
                            </GradientCard>

                            <GradientCard className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">DB Utilization</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {systemMetrics?.dbPool?.utilization ? `${(systemMetrics.dbPool.utilization * 100).toFixed(1)}%` : '0%'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">{systemMetrics?.dbPool?.totalCount || 0} / {systemMetrics?.dbPool?.maxConnections || 0} Conn.</p>
                            </GradientCard>

                            <GradientCard className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                        <Server className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Queue Depth</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {systemMetrics?.queueDepth?.totalBacklog || 0}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Pending Jobs</p>
                            </GradientCard>
                        </div>

                        {/* Detailed Metrics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <GradientCard className="p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                    <Cpu className="w-5 h-5 mr-2 text-indigo-500" />
                                    System Status Details
                                </h3>
                                <dl className="space-y-4 text-sm">
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                                        <span className="text-gray-500">Auth Anomalies</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{systemMetrics?.authAnomalies || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                                        <span className="text-gray-500">Last Snapshot</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {systemMetrics?.timestamp ? new Date(systemMetrics.timestamp).toLocaleTimeString() : '--'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                                        <span className="text-gray-500">Notification Queue</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{systemMetrics?.queueDepth?.notification?.backlog || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2">
                                        <span className="text-gray-500">Export Queue</span>
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
            </div>
        </div>
    );
}
