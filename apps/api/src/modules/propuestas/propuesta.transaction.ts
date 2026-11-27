import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { PropuestaWriter } from './propuesta.writer.ts';

export interface PropuestaTransaction {
  readonly propuestas: PropuestaWriter;
  readonly audit: AuditWriter;
}

export type PropuestaTransactionRunner = TransactionRunner<PropuestaTransaction>;
