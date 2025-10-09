import React, { useState, useEffect } from "react";
import logger from 'utils/logger';
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { Card, Button, LoadingStates, Skeleton } from "../../components/ui";
import PageHeader from "../../components/PageHeader";
import { useLoadingState } from "../../hooks/useLoadingState";
import AddVisitor from "./AddVisitor";
import BulkInvite from "./BulkInvite";
import VisitorHistory from "./VisitorHistory";
import GeneratePass from "./GeneratePass";
import Settings from "./Settings";

const DashboardHome = () => {
  const [upcomingInvites, setUpcomingInvites] = useState([]);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const { loading, startLoading, stopLoading, setLoadingError } = useLoadingState();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + A to add visitor
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        window.location.href = '/dashboard/resident/add-visitor';
      }
      // Ctrl/Cmd + G to generate pass
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        window.location.href = '/dashboard/resident/generate-pass';
      }
      // Ctrl/Cmd + B to bulk invite
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        window.location.href = '/dashboard/resident/bulk-invite';
      }
      // Ctrl/Cmd + H to visitor history
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        window.location.href = '/dashboard/resident/visitor-history';
      }
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!loading) {
          fetchDashboardData();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      startLoading({ message: 'Loading dashboard data...' });
      const token = localStorage.getItem('token');
      
      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[AUTH] No authentication token found');
        }
        stopLoading();
        return;
      }

      // Fetch visitor data
      const response = await fetch('/api/visitors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const visitors = data.data || [];
        
        // Process upcoming invites (visitors with future dates)
        const today = new Date();
        const upcoming = visitors
          .filter(v => v.date_of_visit && new Date(v.date_of_visit) >= today)
          .map(v => ({
            id: v.id,
            name: v.name,
            time: v.time_of_visit ? `${v.time_of_visit}` : 'TBD',
            status: v.status || 'Pending'
          }));
        
        // Process recent visitors (checked in/out today)
        const recent = visitors
          .filter(v => v.check_in && new Date(v.check_in).toDateString() === today.toDateString())
          .map(v => ({
            id: v.id,
            name: v.name,
            checkedInAt: v.check_in ? new Date(v.check_in).toLocaleTimeString() : 'Unknown'
          }));

        setUpcomingInvites(upcoming);
        setRecentVisitors(recent);
      } else {
        logger.error('[ERROR] Failed to fetch visitor data:', response.status);
        // Fallback to empty data
        setUpcomingInvites([]);
        setRecentVisitors([]);
      }
    } catch (error) {
      logger.error('[ERROR] Error fetching dashboard data:', error);
      setLoadingError("Failed to load dashboard data. Please try again.");
      // Fallback to empty data
      setUpcomingInvites([]);
      setRecentVisitors([]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Visitors"
        subtitle="Manage invites and visitor access"
        actions={
          <Button
            onClick={() => window.location.href = '/resident/add-visitor'}
            variant="primary"
            size="md"
          >
            Create Invite
          </Button>
        }
      />

      {/* Action-focused cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Invites */}
        <div className="bg-white border border-gray-200 rounded-smooth p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Upcoming Invites</h2>
            {upcomingInvites.length > 0 && (
              <span className="bg-brand-100 text-brand-700 px-2 py-1 rounded text-sm font-medium">
                {upcomingInvites.length} pending
              </span>
            )}
          </div>
          
          {loading ? (
            <Skeleton.List items={2} showAvatar={false} />
          ) : upcomingInvites.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-500 mt-2">No upcoming invites</p>
              <p className="text-xs text-gray-400 mt-1">Create an invite to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingInvites.map(invite => (
                <div key={invite.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{invite.name}</div>
                    <div className="text-sm text-gray-500">{invite.time}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    invite.status === 'Confirmed' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {invite.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Visitors */}
        <div className="bg-white border border-gray-200 rounded-smooth p-6 shadow-card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Visitors</h2>
          
          {loading ? (
            <Skeleton.List items={2} showAvatar={false} />
          ) : recentVisitors.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm text-gray-500 mt-2">No recent visitors</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVisitors.map(visitor => (
                <div key={visitor.id} className="flex justify-between items-center">
                  <div className="font-medium text-gray-900">{visitor.name}</div>
                  <div className="text-sm text-gray-500">{visitor.checkedInAt}</div>
                </div>
              ))}
            </div>
          )}
          
          <button 
            onClick={() => window.location.href = '/resident/visitor-history'}
            className="mt-4 min-h-[44px] min-w-[44px] text-sm text-brand-600 hover:text-brand-500 font-medium px-2 py-1"
          >
            View all history →
          </button>
        </div>
      </div>

      {/* Essential Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/resident/add-visitor'}
        >
          <Card.Content className="p-6 text-center">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Create Invite</h3>
            <p className="text-sm text-gray-500 mt-1">Invite new visitors</p>
          </Card.Content>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/resident/add-visitor-wizard'}
        >
          <Card.Content className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Add Visitor Wizard</h3>
            <p className="text-sm text-gray-500 mt-1">Step-by-step process</p>
          </Card.Content>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/resident/bulk-invite'}
        >
          <Card.Content className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Bulk Invite</h3>
            <p className="text-sm text-gray-500 mt-1">Invite multiple guests</p>
          </Card.Content>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/resident/bulk-invite-wizard'}
        >
          <Card.Content className="p-6 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Bulk Invite Wizard</h3>
            <p className="text-sm text-gray-500 mt-1">Guided bulk process</p>
          </Card.Content>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/resident/visitor-history'}
        >
          <Card.Content className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Visitor History</h3>
            <p className="text-sm text-gray-500 mt-1">View past visits</p>
          </Card.Content>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/resident/settings'}
        >
          <Card.Content className="p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Manage account</p>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default function ResidentDashboard() {
  const onLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  
  const location = useLocation();
  let panel = <DashboardHome />;
  
  if (location.pathname === "/resident/add-visitor") panel = <AddVisitor />;
  else if (location.pathname === "/resident/generate-pass") panel = <GeneratePass />;
  else if (location.pathname === "/resident/visitor-history") panel = <VisitorHistory />;
  else if (location.pathname === "/resident/bulk-invite") panel = <BulkInvite />;
  else if (location.pathname === "/resident/settings") panel = <Settings />;

  return (
    <AppShell role={localStorage.getItem('role')} title="Resident Dashboard" onLogout={onLogout}>
      {panel}
    </AppShell>
  );
}
