import type { User } from '@repo/contracts';

/**
 * Read-only user port. Implementations must use a direct connection; reads do
 * not need a transaction and should not accidentally join a write boundary.
 */
export interface UserReader {
  list(): Promise<User[]>;
}
