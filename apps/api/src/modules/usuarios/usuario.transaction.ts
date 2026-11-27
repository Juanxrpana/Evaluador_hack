import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { UsuarioWriter } from './usuario.writer.ts';

export interface UsuarioTransaction {
  readonly usuarios: UsuarioWriter;
  readonly audit: AuditWriter;
}

export type UsuarioTransactionRunner = TransactionRunner<UsuarioTransaction>;
