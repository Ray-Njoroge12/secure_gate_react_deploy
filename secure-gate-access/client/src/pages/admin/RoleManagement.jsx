/**
 * @file RoleManagement.jsx
 * @description Role-Based Access Control (RBAC) management UI
 * Phase A2: RBAC & Admin Role Refinement
 * 
 * Features:
 * - View all roles and permissions
 * - Assign roles to users
 * - View role hierarchy
 * - Manage permissions
 * - Audit trail of role changes
 */

import React, { useState, useEffect } from 'react';
import './RoleManagement.css';

const RoleManagement = () => {
  const [activeTab, setActiveTab] = useState('roles'); // 'roles', 'users', 'permissions'
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    fetchRolesAndPermissions();
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchRolesAndPermissions = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/admin/roles', { credentials: 'include' }),
        fetch('/api/admin/permissions', { credentials: 'include' })
      ]);

      if (!rolesRes.ok || !permsRes.ok) {
        throw new Error('Failed to fetch roles/permissions');
      }

      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      setRoles(rolesData.data || []);
      setPermissions(permsData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const assignRoleToUser = async (userId, roleId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/assign-role`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId })
      });

      if (!response.ok) throw new Error('Failed to assign role');

      alert('Role assigned successfully!');
      setShowAssignModal(false);
      fetchUsers();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const getRoleBadgeClass = (level) => {
    if (level === 1) return 'role-badge super-admin';
    if (level === 2) return 'role-badge estate-admin';
    if (level === 3) return 'role-badge security-lead';
    if (level === 4) return 'role-badge auditor';
    if (level === 5) return 'role-badge guard';
    return 'role-badge resident';
  };

  const getRolePermissionCount = (roleId) => {
    // This would come from API - simplified here
    const counts = {
      1: 30, // super_admin
      2: 27, // estate_admin
      3: 15, // security_lead
      4: 8,  // auditor
      5: 5,  // guard
      6: 3   // resident
    };
    return counts[roleId] || 0;
  };

  if (loading) {
    return (
      <div className="role-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading RBAC configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-management">
      {/* Header */}
      <div className="rbac-header">
        <div className="header-left">
          <h1>🔐 Role Management</h1>
          <p className="subtitle">Manage roles, permissions, and access control</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rbac-tabs">
        <button 
          className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Roles
        </button>
        <button 
          className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Assignments
        </button>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>System Roles</h2>
            <p>Hierarchy of roles from highest to lowest privilege</p>
          </div>

          <div className="roles-grid">
            {roles.sort((a, b) => a.level - b.level).map(role => (
              <div key={role.id} className="role-card">
                <div className="role-card-header">
                  <span className={getRoleBadgeClass(role.level)}>
                    Level {role.level}
                  </span>
                  <h3>{role.name.replace('_', ' ').toUpperCase()}</h3>
                </div>
                
                <p className="role-description">{role.description}</p>
                
                <div className="role-stats">
                  <div className="stat">
                    <span className="stat-label">Permissions</span>
                    <span className="stat-value">{getRolePermissionCount(role.id)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Users</span>
                    <span className="stat-value">
                      {users.filter(u => u.role === role.name).length}
                    </span>
                  </div>
                </div>

                {role.is_system_role && (
                  <div className="system-role-badge">
                    🔒 System Role (Cannot be deleted)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>System Permissions</h2>
            <p>Granular permissions grouped by resource</p>
          </div>

          <div className="permissions-groups">
            {Object.entries(
              permissions.reduce((acc, perm) => {
                if (!acc[perm.resource]) acc[perm.resource] = [];
                acc[perm.resource].push(perm);
                return acc;
              }, {})
            ).map(([resource, perms]) => (
              <div key={resource} className="permission-group">
                <h3 className="resource-name">
                  {resource.charAt(0).toUpperCase() + resource.slice(1)} Permissions
                </h3>
                <div className="permissions-list">
                  {perms.map(perm => (
                    <div key={perm.id} className="permission-item">
                      <div className="permission-main">
                        <span className="permission-name">{perm.name}</span>
                        <span className={`action-badge ${perm.action}`}>
                          {perm.action}
                        </span>
                      </div>
                      <p className="permission-description">{perm.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>User Role Assignments</h2>
            <p>Manage role assignments for system users</p>
          </div>

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Assigned Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={getRoleBadgeClass(
                        roles.find(r => r.name === user.role)?.level || 6
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.created_at ? 
                        new Date(user.created_at).toLocaleDateString() : 
                        'N/A'
                      }
                    </td>
                    <td>
                      <button 
                        className="btn-sm btn-assign"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAssignModal(true);
                        }}
                      >
                        Change Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Role to {selectedUser.name}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAssignModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Select a new role for this user. Current role: <strong>{selectedUser.role}</strong>
              </p>

              <div className="role-selection">
                {roles.map(role => (
                  <div 
                    key={role.id}
                    className={`role-option ${selectedRole?.id === role.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <span className={getRoleBadgeClass(role.level)}>
                      {role.name}
                    </span>
                    <p>{role.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={() => selectedRole && assignRoleToUser(selectedUser.id, selectedRole.id)}
                disabled={!selectedRole}
              >
                Assign Role
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
