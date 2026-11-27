import { implement, ORPCError } from '@orpc/server';
import { contract } from '@repo/contracts';
import { EmailAlreadyExistsError } from '../modules/users/user.errors.ts';
import type { UserRepository } from '../modules/users/user.repository.ts';

export interface RouterDependencies {
  users: UserRepository;
}

/**
 * Composition root for the API. Handlers receive dependencies explicitly,
 * which keeps them replaceable (Dependency Inversion) and easy to test.
 */
export function createRouter({ users }: RouterDependencies) {
  const os = implement(contract);

  return os.router({
    health: os.health.handler(() => ({
      status: 'ok' as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })),

    users: {
      list: os.users.list.handler(() => users.list()),
      create: os.users.create.handler(async ({ input }) => {
        try {
          return await users.create(input);
        } catch (error) {
          if (error instanceof EmailAlreadyExistsError) {
            throw new ORPCError('CONFLICT', {
              message: 'A user with this email already exists',
            });
          }

          throw error;
        }
      }),
    },
  });
}
