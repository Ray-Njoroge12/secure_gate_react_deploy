import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { Card, Button, Badge } from "../../components/ui";
import StatsCard from "../../components/StatsCard";
import AddVisitor from "./AddVisitor";
import BulkInvite from "./BulkInvite";
import VisitorHistory from "./VisitorHistory";
import GeneratePass from "./GeneratePass";
import Settings from "./Settings";

const DashboardHome = () => {
  const [stats, setStats] = useState({
    activeVisitors: 0,
    todayVisitors: 0,
    pendingInvites: 0,
    totalPasses: 0
  });

  useEffect(() => {
    // TODO: Fetch real stats from API
    setStats({
      activeVisitors: 3,
      todayVisitors: 8,
      pendingInvites: 2,
      totalPasses: 24
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card padding="lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-200 mb-2">
            Welcome Back! 👋
          </h1>
          <p className="text-slate-400 mb-6">
            Manage your visitors and access passes from your resident dashboard
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              variant="primary" 
              size="lg"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              }
            >
              Add New Visitor
            </Button>
            <Button 
              variant="secondary" 
              size="lg"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4M4 8h4m0 0V4m0 4h12m0 0V4m0 4v4M4 16h4m0 0v4m0-4h12m0 0v4" />
                </svg>
              }
            >
              Generate Pass
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Visitors"
          value={stats.activeVisitors}
          variant="success"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Today's Visitors"
          value={stats.todayVisitors}
          variant="default"
          trend={12}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatsCard
          title="Pending Invites"
          value={stats.pendingInvites}
          variant="warning"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Passes"
          value={stats.totalPasses}
          variant="default"
          trend={8}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <Card.Title>Quick Actions</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View Visitor History
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Bulk Invite Visitors
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Account Settings
              </Button>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Recent Activity</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="success" size="sm">New</Badge>
                <span className="text-sm text-slate-300">Visitor pass generated for John Doe</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="info" size="sm">Entry</Badge>
                <span className="text-sm text-slate-300">Sarah Smith entered at 2:30 PM</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="warning" size="sm">Exit</Badge>
                <span className="text-sm text-slate-300">Mike Johnson exited at 1:45 PM</span>
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-4">
                View All Activity →
              </Button>
            </div>
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
    <div className="app-grid">
      <Sidebar role={localStorage.getItem('role')} onLogout={onLogout} />
      <div>
        <Topbar title="Resident Dashboard" onLogout={onLogout} />
        <main className="main p-6">
          {panel}
        </main>
      </div>
    </div>
  );
}
