import React, { useState, useEffect } from "react";
import logger from 'utils/logger';


import AnnouncementsBanner from "../../components/common/AnnouncementsBanner";
import OnboardingTour from "../../components/common/OnboardingTour";
import QuickActionMenu from "../../components/common/QuickActionMenu";
import { LiveVisitorFeed, LiveStatsBar } from "../../components/dashboard/LiveVisitorFeed";
import DashboardWidgetCustomizer, { useWidgetConfig } from "../../components/resident/DashboardWidgetCustomizer";
import VisitorInsights from "../../components/resident/VisitorInsights"; // Phase 4.3: Analytics
import { Card, Button, Skeleton, UpcomingVisitsEmpty, RecentVisitorsEmpty, Icon } from "../../components/ui";
// AppShell removed - handled by Layout Route
import { useLoadingState } from "../../hooks/useLoadingState";
import { useResidentVisitorEvents } from "../../hooks/useVisitorEvents";
import { useI18n } from "../../i18n/index.js";
import api from '../../utils/apiClient';
// Unused page imports removed
import { navigateTo } from "../../utils/appNavigation";

// Phase 3: UI/UX Improvements
// Phase 5: Dashboard Widget Customization

const handleKeyAction = (event, action) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

const DashboardHome = () => {
  const { t } = useI18n();
  const [upcomingInvites, setUpcomingInvites] = useState([]);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const { loading, startLoading, stopLoading, setLoadingError } = useLoadingState();

  // RES-007: MFA recommendation state for residents
  const [showMfaBanner, setShowMfaBanner] = useState(false);
  const [mfaDismissed, setMfaDismissed] = useState(
    () => localStorage.getItem('resident_mfa_reminder_dismissed') === 'true'
  );

  // Widget customization state
  const [showWidgetCustomizer, setShowWidgetCustomizer] = useState(false);
  const { isWidgetVisible, refreshConfig } = useWidgetConfig();

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
      // Ctrl/Cmd + G to generate pass (redirected to quick-invite)
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        navigateTo('/resident/quick-invite');
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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // Uses latest closure values for refresh/search shortcuts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    fetchDashboardData();
    // Intentional one-time dashboard bootstrap on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // RES-007: Check MFA status for resident and show recommendation banner
  useEffect(() => {
    const checkMfaStatus = async () => {
      if (mfaDismissed) return;

      try {
        const response = await api.get('/api/auth/me');
        const data = response.data;
        const userData = data.data || data.user || data;
        if (userData && userData.mfa_enabled === false) {
          setShowMfaBanner(true);
        }
      } catch (error) {
        logger.error('Error checking MFA status:', error);
      }
    };

    checkMfaStatus();
  }, [mfaDismissed]);

  const handleDismissMfaBanner = () => {
    setShowMfaBanner(false);
    setMfaDismissed(true);
    localStorage.setItem('resident_mfa_reminder_dismissed', 'true');
  };

  const fetchDashboardData = async () => {
    try {
      startLoading({ message: 'Loading dashboard data...' });

      const response = await api.get('/api/visitors');

      {
        const data = response.data;
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
            date: v.date_of_visit,
            time: v.time_of_visit ? `${v.time_of_visit}` : 'TBD',
            statusKey: String(v.status || 'pending').toLowerCase(),
            status: ({
              approved: 'Confirmed',
              confirmed: 'Confirmed',
              pending_confirmation: 'Pending Confirmation',
              pending: 'Pending',
              checked_in: 'Checked In',
              checked_out: 'Checked Out',
              cancelled: 'Cancelled',
              rejected: 'Rejected'
            }[String(v.status || 'pending').toLowerCase()] || String(v.status || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()))
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
  // FIX: Replaced emojis with Icon names for consistency
  const statsData = [
    { label: 'Today', value: recentVisitors.length, icon: 'calendar' },
    { label: 'This Week', value: upcomingInvites.length, icon: 'bar-chart-2' },
    { label: 'This Month', value: upcomingInvites.length + recentVisitors.length, icon: 'trending-up' },
    { label: 'Active', value: upcomingInvites.filter(i => !['cancelled', 'rejected', 'expired'].includes(i.statusKey)).length, icon: 'check-circle' },
  ];

  // Calculate today's state for mobile-first summary
  const todayActive = recentVisitors.length;
  const todayExpected = upcomingInvites.filter(i => {
    if (!i.date) {
      return false;
    }
    const visitDate = new Date(i.date);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;
  const onPremises = recentVisitors.filter(v => !v.checkedOutAt).length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* RES-007: MFA Recommendation Banner for Residents */}
      {showMfaBanner && !mfaDismissed && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Icon name="shield-check" className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Enhance Your Account Security
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Enable Multi-Factor Authentication (MFA) for extra protection when managing visitors.
                This is especially recommended for bulk invite operations.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo('/resident/settings?tab=security')}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline"
                aria-label="Set up multi-factor authentication"
              >
                Set up MFA now →
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissMfaBanner}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Dismiss MFA reminder"
          >
            <Icon name="x" className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* PHASE A1: Mobile-First Above-the-Fold Summary Card */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-2 border-brand-500 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.resident.todaysOverview')}</h2>
          <Icon name="bar-chart-2" className="text-2xl text-gray-400" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-2">
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{todayExpected}</div>
            <div className="text-xs text-gray-600 dark:text-gray-200">{t('dashboard.resident.expected')}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{onPremises}</div>
            <div className="text-xs text-gray-600 dark:text-gray-200">{t('dashboard.resident.onSite')}</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{todayActive}</div>
            <div className="text-xs text-gray-600 dark:text-gray-200">{t('dashboard.resident.checkedIn')}</div>
          </div>
        </div>
        {/* Mobile Customize Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowWidgetCustomizer(true)}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Icon name="settings" className="w-4 h-4" />
          {t('dashboard.common.customizeDashboard')}
        </Button>
      </div>

      {/* Hero Section with Gradient Background - Desktop */}
      <div
        data-tour="dashboard-stats"
        className="hidden md:block bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-900/10 border border-brand-200 dark:border-brand-800 rounded-xl p-8 mb-6"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('dashboard.common.welcomeBack')} 👋
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-200">
              {upcomingInvites.length > 0
                ? `You have ${upcomingInvites.length} upcoming visitor${upcomingInvites.length > 1 ? 's' : ''} this week`
                : 'Manage your visitor invitations and access'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWidgetCustomizer(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-100 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors border border-green-200 dark:border-slate-600"
            title="Customize dashboard widgets"
          >
            <Icon name="settings" className="w-4 h-4" />
            {t('dashboard.common.customize')}
          </Button>
        </div>

        {/* Quick Stats Grid */}
        {isWidgetVisible('stats') && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? (
              // Skeleton loading state for stats
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-green-200 dark:border-green-800/50 rounded-lg p-4 animate-pulse">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
                    <div className="h-8 w-16 bg-gray-200 dark:bg-slate-700 rounded mb-1"></div>
                    <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
                  </div>
                ))}
              </>
            ) : (
              statsData.map((stat, index) => (
                <div key={index} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-brand-200 dark:border-brand-800/50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-1">
                    <Icon name={stat.icon} className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="text-3xl font-bold text-brand-600">{stat.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-200">{stat.label}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Primary CTA - Quick Invite (Simplified Flow) */}
      <div role="button" tabIndex={0}
        data-tour="quick-invite"
        data-test-id="cta-quick-invite"
        className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-xl hover:shadow-brand-500/20 hover:scale-[1.01] transition-all duration-200 shadow-lg"
        onClick={() => navigateTo('/resident/quick-invite')}
        onKeyDown={(e) => handleKeyAction(e, () => navigateTo('/resident/quick-invite'))}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold text-white mb-1">✉️ {t('dashboard.resident.quickInvite')}</h2>
            <p className="text-sm md:text-base text-brand-100">{t('dashboard.resident.sendInviteQuickly')}</p>
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
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{t('dashboard.resident.upcomingInvites')}</h2>
                {upcomingInvites.length > 0 && (
                  <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Icon name="CheckCircle" className="w-4 h-4 text-green-600 inline-block" aria-hidden="true" /> {upcomingInvites.length} active
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
                    <div key={invite.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-900 border-l-4 border-brand-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white"><Icon name="User" className="w-4 h-4 inline-block mr-1" aria-hidden="true" />{invite.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-200"><Icon name="Calendar" className="w-4 h-4 inline-block mr-1" aria-hidden="true" />{invite.time}</div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${invite.status === 'Confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                          }`}>
                          {invite.status}
                        </span>
                        <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-300 hover:text-gray-700 px-2">
                          <span className="text-sm">View</span>
                        </Button>
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
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{t('dashboard.resident.recentVisitors')}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo('/resident/visitor-history')}
                  className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 font-medium text-sm min-h-[44px]"
                >
                  📊 View All →
                </Button>
              </div>

              {loading ? (
                <Skeleton.List items={2} showAvatar={false} />
              ) : recentVisitors.length === 0 ? (
                <RecentVisitorsEmpty />
              ) : (
                <div className="space-y-3">
                  {recentVisitors.map(visitor => (
                    <div key={visitor.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border-l-4 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white"><Icon name="User" className="w-4 h-4 inline-block mr-1" aria-hidden="true" />{visitor.name}</div>
                        <div className="text-sm text-green-600"><Icon name="Check" className="w-4 h-4 text-green-600 inline-block mr-1" aria-hidden="true" />Checked in</div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-200"><Icon name="Clock" className="w-4 h-4 inline-block mr-1" aria-hidden="true" />{visitor.checkedInAt}</div>
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
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">{t('dashboard.common.quickActions')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Visitor Approvals - Highlighted */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-900/20 border-2 border-brand-200 dark:border-brand-800/50 relative"
              onClick={() => navigateTo('/resident/approvals')}
            >
              <Card.Content className="p-4 md:p-6 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-500 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{t('dashboard.resident.approvals')}</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-200 mt-1 hidden md:block">{t('dashboard.resident.walkInVisitors')}</p>
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-brand-500 text-white text-xs rounded-full font-medium">
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
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3">
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
              data-tour="favorite-visitors"
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
      )}

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
  // Route handling is now managed by App.js

  return (
    <div className="resident-dashboard-container">
      {/* Phase 3: Onboarding Tour */}
      <OnboardingTour
        role="resident"
        onComplete={() => logger.debug('Resident tour completed')}
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
