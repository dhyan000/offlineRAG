/**
 * useSystemStatus Hook
 * =====================
 * React Query hook to poll the backend /health endpoint
 * and expose system health state to the UI.
 */

import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/services/api';
import type { SystemHealth } from '@/types';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function useSystemStatus() {
  const query = useQuery<SystemHealth>({
    queryKey: ['system', 'health'],
    queryFn: () => systemApi.getHealth() as Promise<SystemHealth>,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10_000,
    retry: 2,
  });

  const isOnline = query.data?.status === 'healthy';
  const isLoading = query.isLoading;
  const isError = query.isError;

  return {
    health: query.data,
    isOnline,
    isLoading,
    isError,
    refetch: query.refetch,
  };
}
