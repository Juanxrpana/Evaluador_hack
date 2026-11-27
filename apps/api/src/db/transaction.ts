import type { Kysely, Transaction } from 'kysely';
import type { DB } from './schema.generated.ts';

/**
 * Runs one use case inside a single database transaction. The callback
 * receives transaction-bound repositories; resolving commits, throwing rolls
 * back.
 *
 * Rules:
 * - Do not perform network, email, or queue I/O inside the callback.
 * - Do not nest runner calls. Compose the repositories you need in one
 *   callback instead.
 * - Keep the callback replay-safe so retry support can be added later.
 */
export type TransactionRunner<Tx> = <T>(work: (tx: Tx) => Promise<T>) => Promise<T>;

/**
 * The only place that opens a transaction. The context factory keeps this
 * adapter independent of every module; the composition root decides which
 * repositories exist inside the transaction.
 */
export function createTransactionRunner<Tx>(
  db: Kysely<DB>,
  createContext: (trx: Transaction<DB>) => Tx,
): TransactionRunner<Tx> {
  return (work) => db.transaction().execute((trx) => work(createContext(trx)));
}
