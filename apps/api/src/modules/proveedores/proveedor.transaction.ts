import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { ProveedorWriter } from './proveedor.writer.ts';

export interface ProveedorTransaction {
  readonly proveedores: ProveedorWriter;
  readonly audit: AuditWriter;
}

export type ProveedorTransactionRunner = TransactionRunner<ProveedorTransaction>;
