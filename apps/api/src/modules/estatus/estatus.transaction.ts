import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { EstatusWriter } from './estatus.writer.ts';

export interface EstatusTransaction {
  readonly estatus: EstatusWriter;
  readonly audit: AuditWriter;
}

export type EstatusTransactionRunner = TransactionRunner<EstatusTransaction>;
