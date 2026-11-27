import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { NotaWriter } from './nota.writer.ts';

export interface NotaTransaction {
  readonly notas: NotaWriter;
  readonly audit: AuditWriter;
}

export type NotaTransactionRunner = TransactionRunner<NotaTransaction>;
