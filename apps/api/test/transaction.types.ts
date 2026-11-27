import type { Kysely } from 'kysely';
import type { DB } from '../src/db/schema.generated.ts';
import { PostgresUserWriter } from '../src/modules/users/postgres-user.writer.ts';

declare const rootDb: Kysely<DB>;

/**
 * Compile-time guard: the write adapter must only accept a transaction, never
 * the root connection. This file is not a Vitest test; `pnpm typecheck` checks
 * the `@ts-expect-error` line.
 */
export function rootConnectionIsNotATransaction(): void {
  // @ts-expect-error The root Kysely instance is not a Transaction<DB>.
  const writer = new PostgresUserWriter(rootDb);
  void writer;
}
