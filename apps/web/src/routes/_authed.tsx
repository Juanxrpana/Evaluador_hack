import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { sessionQueryOptions } from '../lib/session';

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (!session) {
      throw redirect({ to: '/login' });
    }

    return { session };
  },
  component: () => <Outlet />,
});
