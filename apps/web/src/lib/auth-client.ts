import { createAuthClient } from 'better-auth/react';

const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const authClient = createAuthClient({
  baseURL: apiOrigin || undefined,
  fetchOptions: {
    credentials: 'include',
  },
});
