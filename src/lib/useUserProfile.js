import { useQuery } from '@tanstack/react-query';
import { base44, ensureTokenSynced, nativeStorage } from '@/api/base44Client';

/**
 * Shared hook — always reads from the same ['userProfile', email] cache key.
 * Use this everywhere instead of fetching profile data directly.
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
    staleTime: 60_000, // 1 minute — avoid hammering the function on every render
  });
}