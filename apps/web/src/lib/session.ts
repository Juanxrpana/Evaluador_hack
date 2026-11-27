import { queryOptions } from '@tanstack/react-query';
import { authClient } from './auth-client';

export const sessionQueryOptions = queryOptions({
  queryKey: ['auth', 'session'],
  queryFn: async () => {
    const { data } = await authClient.getSession();
    return data ?? null;
  },
  staleTime: 30_000,
});
