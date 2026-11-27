import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { ConocimientoWriter } from './conocimiento.writer.ts';
import type { DocumentoWriter } from './documento.writer.ts';

/**
 * Repositories available inside one document-ingestion transaction: the
 * documento row, its knowledge chunks, and the durable audit record commit
 * or roll back together. Embeddings are always generated BEFORE this
 * transaction opens (no external I/O inside a unit of work).
 */
export interface DocumentoTransaction {
  readonly documentos: DocumentoWriter;
  readonly conocimiento: ConocimientoWriter;
  readonly audit: AuditWriter;
}

export type DocumentoTransactionRunner = TransactionRunner<DocumentoTransaction>;
