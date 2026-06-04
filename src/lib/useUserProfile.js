import { useQuery } from '@tanstack/react-query';
import { base44, ensureTokenSynced, nativeStorage } from '@/api/base44Client';

/**
 * Shared hook — always reads from the same ['userProfile', email] cache key.
 * Use this everywhere so all screens share one source of truth for profile data.
 */
export function useUserProfile(user) {
  return useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      await ensureTokenSynced();
      const token = await nativeStorage.get();
      const res = await base44.functions.invoke('profileManager', { action: 'get', token });
      return res.data?.profile ?? null;
    },
    enabled: !!user?.email,
    staleTime: 30_000,    // 30s — fresh enough to not hammer, short enough to catch updates
    gcTime: 5 * 60_000,   // keep in cache for 5 minutes
  });
}