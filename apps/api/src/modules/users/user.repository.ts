import type { CreateUserInput, User } from '@repo/contracts';

/**
 * The API depends on this abstraction, not on a concrete database adapter.
 * The Postgres implementation lives outside the router.
 */
export interface UserRepository {
  list(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
}
