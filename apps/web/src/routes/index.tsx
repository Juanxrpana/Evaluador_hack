import { createFileRoute, redirect } from '@tanstack/react-router';
import { sessionQueryOptions } from '../lib/session';

/**
 * Boot directly into the auth flow: anonymous visitors land on the login
 * page, authenticated visitors land on the protected user list.
 */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    throw redirect({ to: session ? '/users' : '/login' });
  },
});
