'use client';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

export function useActiveAY() {
  return useQuery({
    queryKey: ['active-ay'],
    queryFn: () => apiClient.get('/academic-years/active').then((r) => r.data?.data),
  });
}
