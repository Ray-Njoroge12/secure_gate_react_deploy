/**
 * @fileoverview React Query hooks for Admin Dashboard data
 * @description Provides caching, background updates, and optimistic UI for admin data
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMetrics, getAuditLogs, getUsers, updateUser, deleteUser } from '../services/adminService';

/**
 * Query key factory for admin data
 * Ensures consistent cache key usage across the app
 */
export const adminQueryKeys = {
  all: ['admin'],
  metrics: () => [...adminQueryKeys.all, 'metrics'],
  auditLogs: (filters) => [...adminQueryKeys.all, 'auditLogs', filters],
  users: (filters) => [...adminQueryKeys.all, 'users', filters],
  user: (id) => [...adminQueryKeys.all, 'user', id],
};

/**
 * Hook for fetching admin metrics with caching
 * 
 * @param {Object} options - React Query options
 * @returns {Object} Query result with data, loading, error states
 * 
 * @example
 * const { data: metrics, isLoading, error, refetch } = useAdminMetrics();
 */
export function useAdminMetrics(options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.metrics(),
    queryFn: async () => {
      const response = await getMetrics();
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds - data stays fresh
    gcTime: 5 * 60 * 1000, // 5 minutes - cache kept in memory
    refetchOnWindowFocus: true, // Refetch when user comes back
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    retry: 2,
    ...options,
  });
}

/**
 * Hook for fetching audit logs with pagination and caching
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Current page (1-indexed)
 * @param {number} params.limit - Items per page
 * @param {Object} params.filters - Filter criteria
 * @param {Object} options - React Query options
 * @returns {Object} Query result
 * 
 * @example
 * const { data, isLoading } = useAdminAuditLogs({ page: 1, limit: 20 });
 */
export function useAdminAuditLogs({ page = 1, limit = 20, filters = {} } = {}, options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.auditLogs({ page, limit, ...filters }),
    queryFn: async () => {
      const response = await getAuditLogs({ page, limit, ...filters });
      return response;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    keepPreviousData: true, // Keep old data while fetching new page
    ...options,
  });
}

/**
 * Hook for fetching users with pagination
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.page - Current page
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search term
 * @param {string} params.role - Filter by role
 * @param {Object} options - React Query options
 * @returns {Object} Query result
 */
export function useAdminUsers({ page = 1, limit = 20, search = '', role = '' } = {}, options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.users({ page, limit, search, role }),
    queryFn: async () => {
      const response = await getUsers({ page, limit, search, role });
      return response;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    keepPreviousData: true,
    ...options,
  });
}

/**
 * Hook for updating a user with optimistic updates
 * 
 * @returns {Object} Mutation result with mutate function
 * 
 * @example
 * const { mutate: updateUserMutation, isLoading } = useUpdateUser();
 * updateUserMutation({ id: 1, role: 'admin' });
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }) => updateUser(id, data),
    onMutate: async ({ id, ...newData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminQueryKeys.users() });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData(adminQueryKeys.users({}));

      // Optimistically update
      queryClient.setQueryData(adminQueryKeys.users({}), (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((user) =>
            user.id === id ? { ...user, ...newData } : user
          ),
        };
      });

      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(adminQueryKeys.users({}), context.previousUsers);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
    },
  });
}

/**
 * Hook for deleting a user
 * 
 * @returns {Object} Mutation result
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
    },
  });
}

/**
 * Hook to prefetch next page of data
 * 
 * @param {string} type - Data type ('users' or 'auditLogs')
 * @param {Object} params - Current query params
 */
export function usePrefetchNextPage(type, params) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    const nextParams = { ...params, page: (params.page || 1) + 1 };
    
    if (type === 'users') {
      queryClient.prefetchQuery({
        queryKey: adminQueryKeys.users(nextParams),
        queryFn: () => getUsers(nextParams),
        staleTime: 30 * 1000,
      });
    } else if (type === 'auditLogs') {
      queryClient.prefetchQuery({
        queryKey: adminQueryKeys.auditLogs(nextParams),
        queryFn: () => getAuditLogs(nextParams),
        staleTime: 30 * 1000,
      });
    }
  };

  return prefetch;
}

export default {
  useAdminMetrics,
  useAdminAuditLogs,
  useAdminUsers,
  useUpdateUser,
  useDeleteUser,
  usePrefetchNextPage,
  adminQueryKeys,
};
