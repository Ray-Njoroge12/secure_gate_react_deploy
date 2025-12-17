/**
 * React Query hooks for Visitor operations
 * Provides caching, automatic refetching, and optimistic updates
 * Created: December 16, 2025
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as visitorService from '../services/visitorService';
import { useError } from '../contexts/ErrorContext';

// Query keys for cache management
export const VISITOR_QUERY_KEYS = {
  all: ['visitors'],
  list: () => [...VISITOR_QUERY_KEYS.all, 'list'],
  detail: (id) => [...VISITOR_QUERY_KEYS.all, 'detail', id],
  bulkInvite: (code) => [...VISITOR_QUERY_KEYS.all, 'bulk-invite', code],
  inviteCode: (code) => [...VISITOR_QUERY_KEYS.all, 'invite', code],
};

/**
 * Hook to fetch all visitors for the current user
 */
export const useVisitors = (options = {}) => {
  const { handleApiError } = useError();

  return useQuery({
    queryKey: VISITOR_QUERY_KEYS.list(),
    queryFn: async () => {
      const response = await visitorService.getMyVisitors();
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    onError: (error) => {
      handleApiError(error, 'Failed to fetch visitors');
    },
    ...options,
  });
};

/**
 * Hook to create a new visitor
 */
export const useCreateVisitor = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: (visitorData) => visitorService.createVisitor(visitorData),
    onSuccess: (data, variables) => {
      // Invalidate and refetch visitors list
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.list() });
      showSuccess('Visitor created successfully');
      options.onSuccess?.(data, variables);
    },
    onError: (error) => {
      handleApiError(error, 'Failed to create visitor');
      options.onError?.(error);
    },
    // Optimistic update
    onMutate: async (newVisitor) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: VISITOR_QUERY_KEYS.list() });

      // Snapshot previous value
      const previousVisitors = queryClient.getQueryData(VISITOR_QUERY_KEYS.list());

      // Optimistically update
      queryClient.setQueryData(VISITOR_QUERY_KEYS.list(), (old) => {
        if (!old) return [{ ...newVisitor, id: 'temp-' + Date.now(), status: 'pending' }];
        return [...old, { ...newVisitor, id: 'temp-' + Date.now(), status: 'pending' }];
      });

      return { previousVisitors };
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.list() });
    },
  });
};

/**
 * Hook to create a visitor pass
 */
export const useCreatePass = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: (visitorId) => visitorService.createPass(visitorId),
    onSuccess: (data, visitorId) => {
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.detail(visitorId) });
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.list() });
      showSuccess('Pass created successfully');
      options.onSuccess?.(data, visitorId);
    },
    onError: (error) => {
      handleApiError(error, 'Failed to create pass');
      options.onError?.(error);
    },
  });
};

/**
 * Hook to send bulk invites
 */
export const useBulkInvite = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: (eventDetails) => visitorService.bulkInvite(eventDetails),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.all });
      showSuccess(`Invitations sent to ${data.inviteCount || 'all'} guests`);
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'Failed to send bulk invites');
      options.onError?.(error);
    },
  });
};

/**
 * Hook to fetch bulk invite details
 */
export const useBulkInviteDetails = (inviteCode, options = {}) => {
  const { handleApiError } = useError();

  return useQuery({
    queryKey: VISITOR_QUERY_KEYS.bulkInvite(inviteCode),
    queryFn: () => visitorService.getBulkInvite(inviteCode),
    enabled: !!inviteCode,
    staleTime: 60 * 1000, // 1 minute
    onError: (error) => {
      handleApiError(error, 'Failed to fetch invite details');
    },
    ...options,
  });
};

/**
 * Hook to complete an invite (guest self-registration)
 */
export const useCompleteInvite = (options = {}) => {
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: ({ inviteCode, guestDetails }) => 
      visitorService.completeInvite(inviteCode, guestDetails),
    onSuccess: (data, { inviteCode }) => {
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.bulkInvite(inviteCode) });
      showSuccess('Registration completed successfully');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'Failed to complete registration');
      options.onError?.(error);
    },
  });
};

/**
 * Hook to fetch invite by code (public)
 */
export const useInviteByCode = (inviteCode, options = {}) => {
  return useQuery({
    queryKey: VISITOR_QUERY_KEYS.inviteCode(inviteCode),
    queryFn: () => visitorService.getInviteByCode(inviteCode),
    enabled: !!inviteCode,
    staleTime: 30 * 1000,
    retry: 1,
    ...options,
  });
};

/**
 * Hook to verify OTP
 */
export const useVerifyOtp = (options = {}) => {
  const { handleApiError, showSuccess } = useError();

  return useMutation({
    mutationFn: ({ email, otp }) => visitorService.verifyOtp(email, otp),
    onSuccess: (data) => {
      showSuccess('OTP verified successfully');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      handleApiError(error, 'OTP verification failed');
      options.onError?.(error);
    },
  });
};

export default {
  useVisitors,
  useCreateVisitor,
  useCreatePass,
  useBulkInvite,
  useBulkInviteDetails,
  useCompleteInvite,
  useInviteByCode,
  useVerifyOtp,
  VISITOR_QUERY_KEYS,
};
