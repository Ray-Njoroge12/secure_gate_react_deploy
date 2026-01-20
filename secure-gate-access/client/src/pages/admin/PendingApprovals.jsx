import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AlertCircle, CheckCircle, XCircle, Mail, User, Calendar } from 'lucide-react';
import axios from 'axios';
import './PendingApprovals.css';

const PendingApprovals = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [estates, setEstates] = useState([]);
    const [processingUserId, setProcessingUserId] = useState(null);

    useEffect(() => {
        fetchPendingUsers();
        fetchEstates();
    }, []);

    const fetchPendingUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await axios.get('/api/admin/users/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingUsers(response.data.data || response.data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching pending users:', err);
            setError(err.response?.data?.message || 'Failed to load pending users');
        } finally {
            setLoading(false);
        }
    };

    const fetchEstates = async () => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await axios.get('/api/estates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEstates(response.data.data || response.data || []);
        } catch (err) {
            console.error('Error fetching estates:', err);
        }
    };

    const handleApprove = async (userId, estateId) => {
        if (!estateId) {
            alert('Please select an estate before activating the user');
            return;
        }

        if (!window.confirm('Are you sure you want to activate this user?')) {
            return;
        }

        try {
            setProcessingUserId(userId);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            await axios.put(
                `/api/admin/users/${userId}/status`,
                {
                    status: 'active',
                    estate_id: parseInt(estateId)
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            // Refresh the list
            await fetchPendingUsers();
            alert('User activated successfully! Activation email sent.');
        } catch (err) {
            console.error('Error activating user:', err);
            alert(err.response?.data?.message || 'Failed to activate user');
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleReject = async (userId) => {
        if (!window.confirm('Are you sure you want to reject this user? This action cannot be undone.')) {
            return;
        }

        try {
            setProcessingUserId(userId);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            await axios.put(
                `/api/admin/users/${userId}/status`,
                { status: 'rejected' },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            // Refresh the list
            await fetchPendingUsers();
            alert('User rejected');
        } catch (err) {
            console.error('Error rejecting user:', err);
            alert(err.response?.data?.message || 'Failed to reject user');
        } finally {
            setProcessingUserId(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Card className="pending-approvals-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Pending User Approvals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="pending-approvals-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Pending User Approvals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-red-500">{error}</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="pending-approvals-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Pending User Approvals
                    {pendingUsers.length > 0 && (
                        <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                            {pendingUsers.length}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {pendingUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>No pending approvals</p>
                        <p className="text-sm mt-1">All users have been processed</p>
                    </div>
                ) : (
                    <div className="pending-users-list">
                        {pendingUsers.map((user) => (
                            <div key={user.id} className="pending-user-card">
                                <div className="user-info">
                                    <div className="user-header">
                                        <User className="h-5 w-5 text-gray-400" />
                                        <h3 className="user-name">{user.username}</h3>
                                    </div>

                                    <div className="user-details">
                                        <div className="detail-row">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span className="detail-text">{user.email}</span>
                                        </div>

                                        {user.phone && (
                                            <div className="detail-row">
                                                <span className="text-gray-400">📱</span>
                                                <span className="detail-text">{user.phone}</span>
                                            </div>
                                        )}

                                        <div className="detail-row">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="detail-text">Registered: {formatDate(user.created_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="user-actions">
                                    <div className="estate-selector">
                                        <label htmlFor={`estate-${user.id}`} className="estate-label">
                                            Assign Estate:
                                        </label>
                                        <select
                                            id={`estate-${user.id}`}
                                            className="estate-select"
                                            disabled={processingUserId === user.id}
                                            onChange={(e) => {
                                                user.selectedEstateId = e.target.value;
                                            }}
                                        >
                                            <option value="">Select Estate...</option>
                                            {estates.map((estate) => (
                                                <option key={estate.id} value={estate.id}>
                                                    {estate.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="action-buttons">
                                        <button
                                            onClick={() => {
                                                const select = document.getElementById(`estate-${user.id}`);
                                                handleApprove(user.id, select?.value);
                                            }}
                                            disabled={processingUserId === user.id}
                                            className="btn btn-approve"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            {processingUserId === user.id ? 'Processing...' : 'Activate'}
                                        </button>

                                        <button
                                            onClick={() => handleReject(user.id)}
                                            disabled={processingUserId === user.id}
                                            className="btn btn-reject"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PendingApprovals;
