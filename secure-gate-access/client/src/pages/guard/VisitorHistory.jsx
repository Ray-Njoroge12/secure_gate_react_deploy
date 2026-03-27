import React, { useState, useEffect, useCallback } from "react";

import OfflineBanner from "../../components/common/OfflineBanner";
import Table from "../../components/Table";
import { Card, Button, Pagination, Skeleton, PageHeader, Icon } from "../../components/ui";
import { ErrorState, SearchEmpty, HistoryEmpty } from "../../components/ui/EmptyState";
import useOnlineStatus from "../../hooks/useOnlineStatus";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { getVisitorHistory } from "../../services/guardService";
import { handleApiError } from "../../utils/errorMapper";
import logger from "../../utils/logger";
import { getStatusChipClass } from "../../utils/statusColors";

export default function VisitorHistory() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { isOnline, wasOffline } = useOnlineStatus();

  const loadVisitorHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVisitorHistory();
      setVisitors(data || []);
    } catch (e) {
      const errorMsg = handleApiError(e);
      setError(errorMsg);
      logger.error('Failed to load visitor history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const { PullToRefreshIndicator } = usePullToRefresh(loadVisitorHistory);

  useEffect(() => {
    loadVisitorHistory();
  }, [loadVisitorHistory]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredVisitors = visitors.filter(v =>
    v.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.resident_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedVisitors = filteredVisitors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Visitor History"
        subtitle="View past visitor check-ins and check-outs"
        icon={<Icon name="Clock" className="w-6 h-6 text-cyan-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <Button
            onClick={loadVisitorHistory}
            variant="outline"
            disabled={loading}
            aria-label="Refresh visitor history"
          >
            <Icon name="RefreshCw" className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
        <PullToRefreshIndicator />
        <OfflineBanner 
          isOnline={isOnline} 
          wasOffline={wasOffline} 
          onRetry={loadVisitorHistory}
          message="You are offline. Visitor history may be stale."
        />

        {/* Search Bar */}
        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by visitor name, resident, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                  style={{ fontSize: '16px' }}
                  aria-label="Search visitor history"
                />
              </div>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="min-h-[44px] min-w-[44px]"
                >
                  <Icon name="X" className="w-4 h-4" />
                </Button>
              )}
            </div>
            {searchTerm && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2" role="status" aria-live="polite">
                Showing {filteredVisitors.length} of {visitors.length} records
              </p>
            )}
          </Card.Content>
        </Card>

        {/* Error State with Retry */}
        {error && (
          <div role="alert" aria-live="assertive">
            <ErrorState
              errorMessage={error}
              onRetry={loadVisitorHistory}
            />
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !error && (
          <Card>
            <div className="p-4 space-y-1">
              <Skeleton height="1.5rem" width="40%" />
              <Skeleton height="1rem" width="25%" />
            </div>
            <Skeleton.Table rows={6} columns={5} />
          </Card>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Empty States */}
            {visitors.length === 0 ? (
              <Card>
                <Card.Content>
                  <HistoryEmpty timeframe="yet" />
                </Card.Content>
              </Card>
            ) : filteredVisitors.length === 0 ? (
              <Card>
                <Card.Content>
                  <SearchEmpty
                    query={searchTerm}
                    onClearSearch={() => setSearchTerm("")}
                  />
                </Card.Content>
              </Card>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3">
                  {paginatedVisitors.map((v) => (
                    <Card key={v.id || `${v.visitor_name}-${v.check_in_time}`} className="overflow-hidden">
                      <Card.Content className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {v.visitor_name || "Unknown"}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <Icon name="Home" className="w-3.5 h-3.5" />
                              {v.resident_name || "Unknown"}
                            </p>
                          </div>
                          <span className={getStatusChipClass(v.status, 'sm')}>
                            {v.status || "Pending"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">Check In</span>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{formatTime(v.check_in_time)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">Check Out</span>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{formatTime(v.check_out_time)}</p>
                          </div>
                        </div>
                      </Card.Content>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Card>
                    <Table
                      headers={["Visitor", "Resident", "Check In", "Check Out", "Status"]}
                      rows={paginatedVisitors.map(v => [
                        v.visitor_name || "Unknown",
                        v.resident_name || "Unknown",
                        formatTime(v.check_in_time),
                        formatTime(v.check_out_time),
                        <span className={getStatusChipClass(v.status, 'sm')} key="status">
                          {v.status || "Pending"}
                        </span>,
                      ])}
                    />
                  </Card>
                </div>

                {/* Pagination */}
                {filteredVisitors.length > itemsPerPage && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredVisitors.length)} of {filteredVisitors.length}
                    </p>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredVisitors.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
