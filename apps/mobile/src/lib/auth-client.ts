import { createAuthClient } from 'better-auth/client';

const configuredApiOrigin = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const apiOrigin = configuredApiOrigin || 'http://localhost:3000';

// No client plugins here: the bearer token transport is handled manually —
// the server-side bearer() plugin returns the session token in the
// sign-in/sign-up response and accepts `Authorization: Bearer` afterwards
// (see lib/session.tsx and lib/orpc.ts).
export const authClient = createAuthClient({
  baseURL: apiOrigin,
});
