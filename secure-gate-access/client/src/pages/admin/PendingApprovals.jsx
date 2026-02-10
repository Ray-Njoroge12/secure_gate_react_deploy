import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import axios from 'axios';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import './PendingApprovals.css';

const PendingApprovals = ({ siteId }) => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [estates, setEstates] = useState([]);
    const [processingUserId, setProcessingUserId] = useState(null);
    const [rejectDialog, setRejectDialog] = useState({ isOpen: false, userId: null });
    const [approveDialog, setApproveDialog] = useState({ isOpen: false, userId: null, estateId: null });
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [bulkApproveDialog, setBulkApproveDialog] = useState({ isOpen: false, estateId: null });
    const [bulkRejectDialog, setBulkRejectDialog] = useState({ isOpen: false });

    useEffect(() => {
        fetchPendingUsers();
        fetchEstates();
    }, [siteId]);

    const fetchPendingUsers = async () => {
        try {
            setLoading(true);
            const params = siteId ? { siteId } : {};
            const response = await axios.get('/api/admin/users/pending', {
                params,
                withCredentials: true
            });
            // Robust array extraction - handle various response formats
            const responseData = response.data;
            let usersArray = [];
            if (Array.isArray(responseData)) {
                usersArray = responseData;
            } else if (responseData && Array.isArray(responseData.data)) {
                usersArray = responseData.data;
            } else if (responseData && Array.isArray(responseData.users)) {
                usersArray = responseData.users;
            }
            setPendingUsers(usersArray);
            setError(null);
        } catch (err) {
            console.error('Error fetching pending users:', err);
            setPendingUsers([]); // Reset to empty array on error
            setError(err.response?.data?.message || 'Failed to load pending users');
        } finally {
            setLoading(false);
        }
    };

    const fetchEstates = async () => {
        try {
            const response = await axios.get('/api/estates', {
                withCredentials: true
            });
            // Robust array extraction
            const responseData = response.data;
            let estatesArray = [];
            if (Array.isArray(responseData)) {
                estatesArray = responseData;
            } else if (responseData && Array.isArray(responseData.data)) {
                estatesArray = responseData.data;
            } else if (responseData && Array.isArray(responseData.estates)) {
                estatesArray = responseData.estates;
            }
            setEstates(estatesArray);
        } catch (err) {
            console.error('Error fetching estates:', err);
            setEstates([]); // Reset to empty array on error
        }
    };

    const handleApprove = async (userId, estateId) => {
        if (!estateId) {
            alert('Please select an estate before activating the user');
            return;
        }

        // Show confirmation dialog
        setApproveDialog({ isOpen: true, userId, estateId });
    };

    const confirmApprove = async () => {
        const { userId, estateId } = approveDialog;

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
                    withCredentials: true
                }
            );

            // Refresh the list
            await fetchPendingUsers();
            alert('User activated successfully! Activation email sent.');
            setApproveDialog({ isOpen: false, userId: null, estateId: null });
        } catch (err) {
            console.error('Error activating user:', err);
            alert(err.response?.data?.message || 'Failed to activate user');
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleReject = async (userId) => {
        // Show confirmation dialog
        setRejectDialog({ isOpen: true, userId });
    };

    const confirmReject = async () => {
        const { userId } = rejectDialog;

        try {
            setProcessingUserId(userId);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            await axios.put(
                `/api/admin/users/${userId}/status`,
                { status: 'rejected' },
                {
                    withCredentials: true
                }
            );

            // Refresh the list
            await fetchPendingUsers();
            alert('User rejected');
            setRejectDialog({ isOpen: false, userId: null });
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

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedUsers.length === pendingUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(pendingUsers.map(user => user.id));
        }
    };

    const handleBulkApprove = () => {
        if (selectedUsers.length === 0) {
            alert('Please select at least one user to approve');
            return;
        }
        
        // For bulk approval, we need an estate - use the first user's estate or prompt
        setBulkApproveDialog({ isOpen: true, estateId: null });
    };

    const confirmBulkApprove = async () => {
        try {
            setProcessingUserId('bulk');
            
            const response = await axios.post(
                '/api/admin/users/bulk-approve',
                {
                    userIds: selectedUsers,
                    estateId: bulkApproveDialog.estateId || siteId
                },
                { withCredentials: true }
            );

            await fetchPendingUsers();
            setSelectedUsers([]);
            setBulkApproveDialog({ isOpen: false, estateId: null });
            alert(`${response.data.data.count} user(s) approved successfully`);
        } catch (err) {
            console.error('Error in bulk approve:', err);
            alert(err.response?.data?.message || 'Failed to approve users');
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleBulkReject = () => {
        if (selectedUsers.length === 0) {
            alert('Please select at least one user to reject');
            return;
        }
        
        setBulkRejectDialog({ isOpen: true });
    };

    const confirmBulkReject = async () => {
        try {
            setProcessingUserId('bulk');
            
            const response = await axios.post(
                '/api/admin/users/bulk-reject',
                {
                    userIds: selectedUsers,
                    reason: 'Bulk rejection by admin'
                },
                { withCredentials: true }
            );

            await fetchPendingUsers();
            setSelectedUsers([]);
            setBulkRejectDialog({ isOpen: false });
            alert(`${response.data.data.count} user(s) rejected`);
        } catch (err) {
            console.error('Error in bulk reject:', err);
            alert(err.response?.data?.message || 'Failed to reject users');
        } finally {
            setProcessingUserId(null);
        }
    };

    if (loading) {
        return (
            <Card className="pending-approvals-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icon name="AlertCircle" className="h-5 w-5 text-orange-500" />
                        Pending User Approvals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="pending-approvals-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icon name="AlertCircle" className="h-5 w-5 text-red-500" />
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
                    <Icon name="AlertCircle" className="h-5 w-5 text-orange-500" />
                    Pending User Approvals
                    {pendingUsers.length > 0 && (
                        <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                            {pendingUsers.length}
                        </span>
                    )}
                </CardTitle>
                {pendingUsers.length > 0 && (
                    <div className="flex gap-2 mt-4">
                        <Button
                            onClick={toggleSelectAll}
                            variant="secondary"
                            size="sm"
                            disabled={processingUserId === 'bulk'}
                        >
                            {selectedUsers.length === pendingUsers.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        {selectedUsers.length > 0 && (
                            <>
                                <Button
                                    onClick={handleBulkApprove}
                                    variant="primary"
                                    size="sm"
                                    className="btn-approve"
                                    disabled={processingUserId === 'bulk'}
                                >
                                    <Icon name="CheckCircle" className="h-4 w-4" />
                                    Approve Selected ({selectedUsers.length})
                                </Button>
                                <Button
                                    onClick={handleBulkReject}
                                    variant="danger"
                                    size="sm"
                                    className="btn-reject"
                                    disabled={processingUserId === 'bulk'}
                                >
                                    <Icon name="XCircle" className="h-4 w-4" />
                                    Reject Selected ({selectedUsers.length})
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {pendingUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Icon name="CheckCircle" className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>No pending approvals</p>
                        <p className="text-sm mt-1">All users have been processed</p>
                    </div>
                ) : (
                    <div className="pending-users-list">
                        {pendingUsers.map((user) => (
                            <div key={user.id} className="pending-user-card">
                                <div className="user-info">
                                    <div className="user-header">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleUserSelection(user.id)}
                                            className="mr-3"
                                            disabled={processingUserId === 'bulk'}
                                        />
                                        <Icon name="User" className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                                        <h3 className="user-name">{user.username}</h3>
                                    </div>

                                    <div className="user-details">
                                        <div className="detail-row">
                                            <Icon name="Mail" className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                                            <span className="detail-text">{user.email}</span>
                                        </div>

                                        {user.phone && (
                                            <div className="detail-row">
                                                <span className="text-gray-500 dark:text-gray-300">📱</span>
                                                <span className="detail-text">{user.phone}</span>
                                            </div>
                                        )}

                                        <div className="detail-row">
                                            <Icon name="Calendar" className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                                            <span className="detail-text">Registered: {formatDate(user.created_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="user-actions">
                                    {/* Only show estate selector if user doesn't have one or we are super admin (siteId param) */}
                                    {!user.estate_id && (
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
                                    )}

                                    <div className="action-buttons">
                                        <Button
                                            onClick={() => {
                                                const select = document.getElementById(`estate-${user.id}`);
                                                // specific priority: pre-assigned > manual selection
                                                const finalEstateId = user.estate_id || select?.value;
                                                handleApprove(user.id, finalEstateId);
                                            }}
                                            disabled={processingUserId === user.id}
                                            variant="primary"
                                            size="sm"
                                            loading={processingUserId === user.id}
                                        >
                                            <Icon name="CheckCircle" className="h-4 w-4" />
                                            {processingUserId === user.id ? 'Processing...' : 'Activate'}
                                        </Button>

                                        <Button
                                            onClick={() => handleReject(user.id)}
                                            disabled={processingUserId === user.id}
                                            variant="danger"
                                            size="sm"
                                        >
                                            <Icon name="XCircle" className="h-4 w-4" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Confirmation Dialogs */}
            <ConfirmationDialog
                isOpen={approveDialog.isOpen}
                onClose={() => setApproveDialog({ isOpen: false, userId: null, estateId: null })}
                onConfirm={confirmApprove}
                variant="success"
                title="Activate User"
                message="Are you sure you want to activate this user? They will receive an activation email and gain access to the system."
                confirmText="Activate User"
                cancelText="Cancel"
                isLoading={processingUserId === approveDialog.userId}
            />

            <ConfirmationDialog
                isOpen={rejectDialog.isOpen}
                onClose={() => setRejectDialog({ isOpen: false, userId: null })}
                onConfirm={confirmReject}
                variant="danger"
                title="Reject User Registration"
                message="Are you sure you want to reject this user's registration? This action cannot be undone."
                confirmText="Reject User"
                cancelText="Cancel"
                requireDoubleConfirm={true}
                doubleConfirmText="Type REJECT to confirm"
                doubleConfirmValue="REJECT"
                isLoading={processingUserId === rejectDialog.userId}
            />

            <ConfirmationDialog
                isOpen={bulkApproveDialog.isOpen}
                onClose={() => setBulkApproveDialog({ isOpen: false, estateId: null })}
                onConfirm={confirmBulkApprove}
                variant="success"
                title="Bulk Approve Users"
                message={`Are you sure you want to approve ${selectedUsers.length} user(s)? They will all receive activation emails.`}
                confirmText={`Approve ${selectedUsers.length} Users`}
                cancelText="Cancel"
                isLoading={processingUserId === 'bulk'}
            />

            <ConfirmationDialog
                isOpen={bulkRejectDialog.isOpen}
                onClose={() => setBulkRejectDialog({ isOpen: false })}
                onConfirm={confirmBulkReject}
                variant="danger"
                title="Bulk Reject Users"
                message={`Are you sure you want to reject ${selectedUsers.length} user(s)? This action cannot be undone.`}
                confirmText={`Reject ${selectedUsers.length} Users`}
                cancelText="Cancel"
                requireDoubleConfirm={true}
                doubleConfirmText="Type REJECT to confirm"
                doubleConfirmValue="REJECT"
                isLoading={processingUserId === 'bulk'}
            />
        </Card>
    );
};

export default PendingApprovals;
