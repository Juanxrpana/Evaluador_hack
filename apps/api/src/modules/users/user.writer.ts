import type { User } from '@repo/contracts';

/**
 * Internal write command for the reference application use case. Public user
 * creation is owned by Better Auth sign-up; this path is not exposed as an
 * HTTP procedure.
 */
export type CreateUserInput = Pick<User, 'name' | 'email'>;

/**
 * Write user port. Implementations require a transaction and must never open
 * one themselves.
 */
export interface UserWriter {
  create(input: CreateUserInput): Promise<User>;
}
