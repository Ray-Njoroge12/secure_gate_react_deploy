import React, { useState, useEffect } from "react";
import { navigateTo } from "../../utils/appNavigation";
import logger from 'utils/logger';
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrentRole } from "../../hooks/useCurrentRole";
// AppShell removed - handled by Layout Route
import { Card, Button, LoadingStates, Skeleton, UpcomingVisitsEmpty, RecentVisitorsEmpty } from "../../components/ui";
import PageHeader from "../../components/PageHeader";
import { useLoadingState } from "../../hooks/useLoadingState";
import VisitorInsights from "../../components/resident/VisitorInsights"; // Phase 4.3: Analytics
import DeliveryList from "../../components/resident/DeliveryList"; // Phase 2.1: Delivery Management
import AutoApprovalRules from "../../components/resident/AutoApprovalRules"; // Phase 2.2: Auto-Approval Rules
import FavoriteVisitors from "../../components/resident/FavoriteVisitors"; // Phase 4: Favorites System
import { LiveVisitorFeed, LiveStatsBar } from "../../components/dashboard/LiveVisitorFeed";
import { useResidentVisitorEvents } from "../../hooks/useVisitorEvents";

// Unused page imports removed
import QuickInvite from "./QuickInvite"; // Quick invite flow
// Phase 3: Privacy-First Features
import OfflineIndicator from "../../components/common/OfflineIndicator";
import AnnouncementsBanner from "../../components/common/AnnouncementsBanner";
import PrivacyDashboard from "../../components/settings/PrivacyDashboard";
// Phase 3: UI/UX Improvements
import OnboardingTour from "../../components/common/OnboardingTour";
import QuickActionMenu from "../../components/common/QuickActionMenu";
// Phase 5: Dashboard Widget Customization
import DashboardWidgetCustomizer, { useWidgetConfig } from "../../components/resident/DashboardWidgetCustomizer";
import { Settings as SettingsIcon } from 'lucide-react';

const DashboardHome = () => {
  const [upcomingInvites, setUpcomingInvites] = useState([]);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const { loading, startLoading, stopLoading, setLoadingError } = useLoadingState();

  // Widget customization state
  const [showWidgetCustomizer, setShowWidgetCustomizer] = useState(false);
  const { isWidgetVisible, refreshConfig, getVisibleWidgets } = useWidgetConfig();

  // Real-time visitor events
  const {
    recentEvents,
    liveStats,
    connectionStatus,
    lastUpdate,
    refreshStats,
    clearEvents
  } = useResidentVisitorEvents({
    enabled: true,
    showNotifications: true,
    onVisitorEvent: (event) => {
      // Refresh data when relevant events occur
      if (['visitor.check_in', 'visitor.check_out', 'visitor.approved'].includes(event.type)) {
        fetchDashboardData();
      }
    }
  });

  // Keyboard shortcuts - Using consistent /resident/... paths
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Q to quick invite
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        navigateTo('/resident/quick-invite');
      }
      // Ctrl/Cmd + G to generate pass
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        navigateTo('/resident/generate-pass');
      }
      // Ctrl/Cmd + B to bulk invite
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        navigateTo('/resident/bulk-invite');
      }
      // Ctrl/Cmd + H to visitor history
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        navigateTo('/resident/visitor-history');
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

      // Fetch visitor data using httpOnly cookies
      const response = await fetch('/api/visitors', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Handle response format: { data: { visitors: [] } } or { data: [] }
        const visitors = Array.isArray(data.data)
          ? data.data
          : (data.data?.visitors || []);

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
    } finally {
      stopLoading();
    }
  };

  // Calculate stats
  const statsData = [
    { label: 'Today', value: recentVisitors.length, icon: '📅' },
    { label: 'This Week', value: upcomingInvites.length, icon: '📊' },
    { label: 'This Month', value: upcomingInvites.length + recentVisitors.length, icon: '📈' },
    { label: 'Active', value: upcomingInvites.filter(i => i.status === 'Confirmed').length, icon: '✅' },
  ];

  // Calculate today's state for mobile-first summary
  const todayActive = recentVisitors.length;
  const todayExpected = upcomingInvites.filter(i => {
    const visitDate = new Date(i.date);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;
  const onPremises = recentVisitors.filter(v => !v.checkedOutAt).length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* PHASE A1: Mobile-First Above-the-Fold Summary Card */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-2 border-green-500 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Overview</h2>
          <span className="text-2xl">📊</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-2xl font-bold text-green-600">{todayExpected}</div>
            <div className="text-xs text-gray-600 dark:text-gray-200">Expected</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-2xl font-bold text-blue-600">{onPremises}</div>
            <div className="text-xs text-gray-600 dark:text-gray-200">On Site</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-2">
            <div className="text-2xl font-bold text-amber-600">{todayActive}</div>
            <div className="text-xs text-gray-600 dark:text-gray-200">Checked In</div>
          </div>
        </div>
        {/* Mobile Customize Button */}
        <button
          onClick={() => setShowWidgetCustomizer(true)}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
          Customize Dashboard
        </button>
      </div>

      {/* Hero Section with Gradient Background - Desktop */}
      <div
        data-tour="dashboard-stats"
        className="hidden md:block bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-8 mb-6"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back! 👋
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-200">
              {upcomingInvites.length > 0
                ? `You have ${upcomingInvites.length} upcoming visitor${upcomingInvites.length > 1 ? 's' : ''} this week`
                : 'Manage your visitor invitations and access'}
            </p>
          </div>
          <button
            onClick={() => setShowWidgetCustomizer(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-100 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors border border-green-200 dark:border-slate-600"
            title="Customize dashboard widgets"
          >
            <SettingsIcon className="w-4 h-4" />
            Customize
          </button>
        </div>

        {/* Quick Stats Grid */}
        {isWidgetVisible('stats') && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? (
              // Skeleton loading state for stats
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-green-200 dark:border-green-800/50 rounded-lg p-4 animate-pulse">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
              </>
            ) : (
              statsData.map((stat, index) => (
                <div key={index} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-green-200 dark:border-green-800/50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-3xl font-bold text-green-600">{stat.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-200">{stat.label}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Primary CTA - Quick Invite (Simplified Flow) */}
      <div
        data-tour="add-visitor"
        data-test-id="cta-quick-invite"
        className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-xl hover:shadow-green-500/20 hover:scale-[1.01] transition-all duration-200 shadow-lg"
        onClick={() => navigateTo('/resident/quick-invite')}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">✉️ Quick Invite</h2>
            <p className="text-sm md:text-base text-green-100">Send an invite in seconds</p>
          </div>
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Data Cards with Improved Empty States */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Invites */}
        {isWidgetVisible('upcoming-invites') && (
          <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <Card.Content className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Upcoming Invites</h2>
                {upcomingInvites.length > 0 && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    🟢 {upcomingInvites.length} active
                  </span>
                )}
              </div>

              {loading ? (
                <Skeleton.List items={2} showAvatar={false} />
              ) : upcomingInvites.length === 0 ? (
                <UpcomingVisitsEmpty
                  onCreate={() => navigateTo('/resident/quick-invite')}
                />
              ) : (
                <div className="space-y-3">
                  {upcomingInvites.map(invite => (
                    <div key={invite.id} className="flex justify-between items-center p-4 bg-gray-50 border-l-4 border-green-500 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">👤 {invite.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-200">📅 {invite.time}</div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${invite.status === 'Confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                          }`}>
                          {invite.status}
                        </span>
                        <button className="text-gray-500 dark:text-gray-300 hover:text-gray-700 px-2">
                          <span className="text-sm">View</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Recent Visitors */}
        {isWidgetVisible('recent-visitors') && (
          <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <Card.Content className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Recent Visitors</h2>
                <span className="text-gray-500 dark:text-gray-300 hover:text-gray-700 cursor-pointer font-medium text-sm">📊 View All →</span>
              </div>

              {loading ? (
                <Skeleton.List items={2} showAvatar={false} />
              ) : recentVisitors.length === 0 ? (
                <RecentVisitorsEmpty />
              ) : (
                <div className="space-y-3">
                  {recentVisitors.map(visitor => (
                    <div key={visitor.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300 hover:bg-gray-100 transition-colors">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">👤 {visitor.name}</div>
                        <div className="text-sm text-green-600">✅ Checked in</div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-200">🕐 {visitor.checkedInAt}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        )}
      </div>

      {/* Real-time Activity Feed */}
      {isWidgetVisible('live-feed') && (
        <div className="mt-6">
          <LiveStatsBar
            stats={liveStats}
            connectionStatus={connectionStatus}
            lastUpdate={lastUpdate}
            className="mb-4"
          />
          <LiveVisitorFeed
            events={recentEvents}
            maxVisible={5}
            showControls={true}
            connectionStatus={connectionStatus}
            onRefresh={refreshStats}
            onClear={clearEvents}
          />
        </div>
      )}

      {/* Phase 4.3: Visitor Insights Analytics */}
      {isWidgetVisible('insights') && (
        <div className="mt-8">
          <VisitorInsights />
        </div>
      )}

      {/* PHASE A3: Clarified Quick Actions - Mobile Optimized */}
      {isWidgetVisible('quick-actions') && (
        <div data-tour="quick-actions" className="mt-6 md:mt-8">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Visitor Approvals - Highlighted */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-900/20 border-2 border-green-200 dark:border-green-800/50 relative"
              onClick={() => navigateTo('/resident/approvals')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Approvals</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Walk-in visitors</p>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
                  NEW
                </span>
              </Card.Content>
            </Card>

            {/* Bulk Invite */}
            <Card
              data-tour="bulk-invite"
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
              onClick={() => navigateTo('/resident/bulk-invite')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Bulk Invite</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Multiple guests</p>
              </Card.Content>
            </Card>

            {/* Visitor History */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
              onClick={() => navigateTo('/resident/visitor-history')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">History</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Past visits</p>
              </Card.Content>
            </Card>

            {/* Settings */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
              onClick={() => navigateTo('/resident/settings')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-gray-600 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Settings</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Manage</p>
              </Card.Content>
            </Card>



            {/* Phase 2.1: My Deliveries */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 relative"
              onClick={() => navigateTo('/resident/deliveries')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">My Deliveries</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Track packages</p>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full font-medium">
                  NEW
                </span>
              </Card.Content>
            </Card>

            {/* Service Entry: Rideshare */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 relative"
              onClick={() => navigateTo('/resident/rideshare')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <span className="text-2xl">🚕</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Rideshare</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Book entry</p>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium">
                  NEW
                </span>
              </Card.Content>
            </Card>

            {/* Phase 2.2: Auto-Approval Rules */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 relative"
              onClick={() => navigateTo('/resident/auto-approval')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Auto-Approval</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Trusted visitors</p>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full font-medium">
                  NEW
                </span>
              </Card.Content>
            </Card>

            {/* Phase 3: Privacy Dashboard */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 relative"
              onClick={() => navigateTo('/resident/privacy')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-50 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Privacy</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Your data & rights</p>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-teal-500 text-white text-xs rounded-full font-medium">
                  NEW
                </span>
              </Card.Content>
            </Card>

            {/* Phase 4: Favorite Visitors */}
            <Card
              data-tour="favorites"
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 relative"
              onClick={() => navigateTo('/resident/favorites')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-pink-50 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Favorites</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">Quick-invite list</p>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-pink-500 text-white text-xs rounded-full font-medium">
                  NEW
                </span>
              </Card.Content>
            </Card>

          </div>
        </div>
      )
      }

      {/* Dashboard Widget Customizer Modal */}
      <DashboardWidgetCustomizer
        isOpen={showWidgetCustomizer}
        onClose={() => setShowWidgetCustomizer(false)}
        onSave={refreshConfig}
      />
    </div >
  );
};

export default function ResidentDashboard() {
  const { logout } = useAuth();
  const role = useCurrentRole();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };



  const location = useLocation();

  // Route handling is now managed by App.js

  return (
    <div className="resident-dashboard-container">
      {/* Phase 3: Onboarding Tour */}
      <OnboardingTour
        role="resident"
        onComplete={() => console.log('Resident tour completed')}
      />

      {/* Phase 3: Offline Indicator */}


      {/* Phase 3: Community Announcements */}
      <AnnouncementsBanner showDismiss={true} className="mb-4" />

      {/* Main Content */}
      <main id="main-content">
        <DashboardHome />
      </main>

      {/* Phase 4: Mobile Quick Action Menu */}
      <QuickActionMenu
        role="resident"
        showOnlyMobile={true}
      />
    </div>
  );
}
