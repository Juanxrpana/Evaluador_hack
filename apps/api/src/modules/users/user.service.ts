import type { CreateUserInput, User } from '@repo/contracts';
import type { UserReader } from './user.reader.ts';
import type { UserTransactionRunner } from './user.transaction.ts';

/**
 * Application service for user use cases. It owns the transaction boundary:
 * the router never opens a transaction and never sees Kysely.
 *
 * The durable audit row is written inside the transaction. A failed audit
 * write rolls back the user creation; failed attempts remain visible in the
 * HTTP audit stream instead.
 */
export class UserService {
  readonly #reader: UserReader;
  readonly #runInTransaction: UserTransactionRunner;

  constructor(reader: UserReader, runInTransaction: UserTransactionRunner) {
    this.#reader = reader;
    this.#runInTransaction = runInTransaction;
  }

  list(): Promise<User[]> {
    return this.#reader.list();
  }

  create(input: CreateUserInput): Promise<User> {
    return this.#runInTransaction(async ({ users, audit }) => {
      const user = await users.create(input);

      await audit.record({
        action: 'user.create',
        resource: 'user',
        resourceId: user.id,
      });

      return user;
    });
  }
}
