import type { TransactionRunner } from '../../db/transaction.ts';
import type { AuditWriter } from '../audit/audit.repository.ts';
import type { RecargoWriter } from '../recargos/recargo.writer.ts';
import type { PropuestaItemWriter } from '../propuestas/propuesta-item.writer.ts';
import type { PropuestaWriter } from '../propuestas/propuesta.writer.ts';
import type { ConocimientoWriter } from './conocimiento.writer.ts';
import type { DocumentoWriter } from './documento.writer.ts';

/**
 * Repositories available inside one document-ingestion transaction: the
 * documento row, its knowledge chunks, the LLM-extracted propuesta monto
 * and recargos plus line items, and the durable audit record commit or
 * roll back together. Embeddings and LLM extraction always run BEFORE this
 * transaction opens (no external I/O inside a unit of work).
 */
export interface DocumentoTransaction {
  readonly documentos: DocumentoWriter;
  readonly conocimiento: ConocimientoWriter;
  readonly propuestas: PropuestaWriter;
  readonly propuestaItems: PropuestaItemWriter;
  readonly recargos: RecargoWriter;
  readonly audit: AuditWriter;
}

export type DocumentoTransactionRunner = TransactionRunner<DocumentoTransaction>;
