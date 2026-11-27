import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './schema.generated.ts';

export interface DatabaseOptions {
  connectionString: string;
  max?: number;
}

/**
 * The production database adapter. The pool is owned by Kysely and must be
 * destroyed during shutdown.
 */
export function createDatabase({ connectionString, max = 10 }: DatabaseOptions): Kysely<DB> {
  const pool = new Pool({
    connectionString,
    max,
  });

  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
  });
}
