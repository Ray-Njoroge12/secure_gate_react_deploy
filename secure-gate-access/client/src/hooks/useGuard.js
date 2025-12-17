/**
 * React Query hooks for Guard operations
 * Provides caching, automatic refetching, and optimistic updates
 * Created: December 16, 2025
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as guardService from '../services/guardService';
import { useError } from '../contexts/ErrorContext';

// Query keys for cache management
export const GUARD_QUERY_KEYS = {
  all: ['guard'],
  visitorHistory: () => [...GUARD_QUERY_KEYS.all, 'visitor-history'],
  activeVisitors: () => [...GUARD_QUERY_KEYS.all, 'active-visitors'],
  pendingApprovals: () => [...GUARD_QUERY_KEYS.all, 'pending-approvals'],
  analytics: (params) => [...GUARD_QUERY_KEYS.all, 'analytics', params],
};

/**
 * Hook to fetch visitor history
 */
export const useVisitorHistory = (options = {}) => {
  const { handleApiError } = useError();

  return useQuery({
    queryKey: GUARD_QUERY_KEYS.visitorHistory(),
    queryFn: guardService.getVisitorHistory,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: true,
    onError: (error) => {
      handleApiError(error, 'Failed to fetch visitor history');
    },
    ...options,
  });
};

/**
 * Hook to fetch active visitors (currently checked in)
 */
export const useActiveVisitors = (options = {}) => {
  const { handleApiError } = useError();

  return useQuery({
    queryKey: GUARD_QUERY_KEYS.activeVisitors(),
    queryFn: guardService.getActiveVisitors,
    staleTime: 15 * 1000, // 15 seconds - more frequent for active visitors
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    onError: (error) => {
      handleApiError(error, 'Failed to fetch active visitors');
    },
    ...options,
  });
};

/**
 * Hook to fetch pending approvals
 */
export const usePendingApprovals = (options = {}) => {
  const { handleApiError } = useError();

  return useQuery({
    queryKey: GUARD_QUERY_KEYS.pendingApprovals(),
    queryFn: guardService.getPendingApprovals,
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchInterval: 30 * 1000, // Auto-refresh for real-time updates
    onError: (error) => {
      handleApiError(error, 'Failed to fetch pending approvals');
    },
    ...options,
  });
};

/**
 * Hook to verify a visitor (QR code or pass ID)
 */
export const useVerifyVisitor = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: (passId) => guardService.verifyVisitor(passId),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.activeVisitors() });
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.visitorHistory() });
      showSuccess('Visitor verified successfully');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'Visitor verification failed');
      options.onError?.(error);
    },
  });
};

/**
 * Hook for manual check-in
 */
export const useManualCheckIn = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: (visitorData) => guardService.manualCheckIn(visitorData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.activeVisitors() });
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.visitorHistory() });
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.pendingApprovals() });
      showSuccess('Visitor checked in successfully');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'Check-in failed');
      options.onError?.(error);
    },
  });
};

/**
 * Hook for visitor check-out
 */
export const useCheckOutVisitor = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: (visitorId) => guardService.checkOutVisitor(visitorId),
    onSuccess: (data, visitorId) => {
      // Optimistic update - remove from active visitors
      queryClient.setQueryData(GUARD_QUERY_KEYS.activeVisitors(), (old) => {
        if (!old) return old;
        return old.filter(v => v.id !== visitorId);
      });
      
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.visitorHistory() });
      showSuccess('Visitor checked out successfully');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'Check-out failed');
      options.onError?.(error);
    },
  });
};

/**
 * Hook for walk-in registration
 */
export const useRegisterWalkIn = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: (visitorData) => guardService.registerWalkIn(visitorData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.activeVisitors() });
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.pendingApprovals() });
      showSuccess('Walk-in visitor registered');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'Registration failed');
      options.onError?.(error);
    },
  });
};

/**
 * Hook for incident reporting
 */
export const useReportIncident = (options = {}) => {
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: (incidentData) => guardService.reportIncident(incidentData),
    onSuccess: (data) => {
      showSuccess('Incident reported successfully');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'Failed to report incident');
      options.onError?.(error);
    },
  });
};

/**
 * Hook to fetch guard analytics
 */
export const useGuardAnalytics = (params = {}, options = {}) => {
  const { handleApiError } = useError();

  return useQuery({
    queryKey: GUARD_QUERY_KEYS.analytics(params),
    queryFn: () => guardService.getGuardAnalytics(params),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      handleApiError(error, 'Failed to fetch analytics');
    },
    ...options,
  });
};

/**
 * Hook to process approval (approve/reject)
 */
export const useProcessApproval = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: ({ visitorId, approved, reason }) => 
      guardService.processApproval(visitorId, approved, reason),
    onSuccess: (data, { approved }) => {
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: GUARD_QUERY_KEYS.activeVisitors() });
      showSuccess(approved ? 'Visitor approved' : 'Visitor rejected');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'Failed to process approval');
      options.onError?.(error);
    },
    // Optimistic update
    onMutate: async ({ visitorId }) => {
      await queryClient.cancelQueries({ queryKey: GUARD_QUERY_KEYS.pendingApprovals() });
      
      const previousApprovals = queryClient.getQueryData(GUARD_QUERY_KEYS.pendingApprovals());
      
      // Optimistically remove from pending
      queryClient.setQueryData(GUARD_QUERY_KEYS.pendingApprovals(), (old) => {
        if (!old) return old;
        return old.filter(v => v.id !== visitorId);
      });
      
      return { previousApprovals };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousApprovals) {
        queryClient.setQueryData(GUARD_QUERY_KEYS.pendingApprovals(), context.previousApprovals);
      }
    },
  });
};

export default {
  useVisitorHistory,
  useActiveVisitors,
  usePendingApprovals,
  useVerifyVisitor,
  useManualCheckIn,
  useCheckOutVisitor,
  useRegisterWalkIn,
  useReportIncident,
  useGuardAnalytics,
  useProcessApproval,
  GUARD_QUERY_KEYS,
};
