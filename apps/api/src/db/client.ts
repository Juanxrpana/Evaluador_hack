import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './schema.generated.ts';

export interface DatabaseOptions {
  connectionString: string;
  max?: number;
  connectionTimeoutMs?: number;
  statementTimeoutMs?: number;
  idleInTransactionTimeoutMs?: number;
}

/**
 * The production database adapter. The pool is owned by Kysely and must be
 * destroyed during shutdown.
 *
 * The API process sets statement and idle-in-transaction timeouts so a slow
 * query or a forgotten transaction cannot hold a pool connection forever.
 * Migration commands pass only the connection timeout: a legitimate
 * migration may take longer than an API request.
 */
export function createDatabase({
  connectionString,
  max = 10,
  connectionTimeoutMs = 5_000,
  statementTimeoutMs,
  idleInTransactionTimeoutMs,
}: DatabaseOptions): Kysely<DB> {
  const pool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis: connectionTimeoutMs,
    statement_timeout: statementTimeoutMs,
    options: idleInTransactionTimeoutMs
      ? `-c idle_in_transaction_session_timeout=${idleInTransactionTimeoutMs}`
      : undefined,
  });

  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
  });
}
