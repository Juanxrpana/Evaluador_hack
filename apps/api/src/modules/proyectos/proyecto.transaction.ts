import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { ProyectoWriter } from './proyecto.writer.ts';

/**
 * Repositories available inside one proyecto write transaction. Module-local
 * by design: a global repository context hides each service's dependencies.
 */
export interface ProyectoTransaction {
  readonly proyectos: ProyectoWriter;
  readonly audit: AuditWriter;
}

export type ProyectoTransactionRunner = TransactionRunner<ProyectoTransaction>;
