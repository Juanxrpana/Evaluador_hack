import { implement, ORPCError } from '@orpc/server';
import { contract } from '@repo/contracts';
import type { Auth } from '../auth/auth.ts';
import type { UserRepository } from '../modules/users/user.repository.ts';
import { setRequestActor } from '../observability/request-context.ts';

export interface ApiContext {
  session: Awaited<ReturnType<Auth['api']['getSession']>>;
}

export interface RouterDependencies {
  users: UserRepository;
}

/**
 * Composition root for the API. Handlers receive dependencies explicitly,
 * which keeps them replaceable (Dependency Inversion) and easy to test.
 */
export function createRouter({ users }: RouterDependencies) {
  const os = implement(contract).$context<ApiContext>();

  const authenticated = os.middleware(({ context, next }) => {
    if (!context.session) {
      throw new ORPCError('UNAUTHORIZED');
    }

    setRequestActor(context.session.user.id);
    return next();
  });

  return os.router({
    health: os.health.handler(() => ({
      status: 'ok' as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })),

    users: {
      list: os.users.list.use(authenticated).handler(() => users.list()),
    },
  });
}
