export interface RecargoEscritura {
  concepto: string;
  monto: string;
}

/**
 * Write port used by the document-ingestion pipeline: the LLM extracts the
 * surcharges and this adapter replaces the set for one propuesta.
 */
export interface RecargoWriter {
  replaceForPropuesta(propuestaId: string, recargos: RecargoEscritura[]): Promise<number>;
}
