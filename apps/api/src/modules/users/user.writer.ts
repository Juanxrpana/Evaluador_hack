import type { CreateUserInput, User } from '@repo/contracts';

/**
 * Write user port. Implementations require a transaction and must never open
 * one themselves.
 */
export interface UserWriter {
  create(input: CreateUserInput): Promise<User>;
}
