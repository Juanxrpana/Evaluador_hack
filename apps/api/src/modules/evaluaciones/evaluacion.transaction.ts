import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { EvaluacionWriter } from './evaluacion.port.ts';

/**
 * One durable unit per evaluation fact: creating the run, recording each
 * step, each proposal verdict, and finalizing with the report. The engine's
 * external I/O (LLM, market search) happens between these transactions.
 */
export interface EvaluacionTransaction {
  readonly evaluaciones: EvaluacionWriter;
  readonly audit: AuditWriter;
}

export type EvaluacionTransactionRunner = TransactionRunner<EvaluacionTransaction>;
