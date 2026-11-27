import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { UserWriter } from './user.writer.ts';

/**
 * The repositories available inside one user write transaction. Keep this
 * module-local: a global repository context becomes a service locator and
 * hides each service's real dependencies.
 */
export interface UserTransaction {
  readonly users: UserWriter;
  readonly audit: AuditWriter;
}

export type UserTransactionRunner = TransactionRunner<UserTransaction>;
