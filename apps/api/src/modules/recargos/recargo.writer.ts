export interface RecargoEscritura {
  concepto: string;
  /** Fixed amount, or null when the surcharge is a percentage. */
  monto: string | null;
  /** Percentage over the offered base amount, or null for fixed amounts. */
  porcentaje: string | null;
  moneda: string | null;
}

/**
 * Write port used by the document-ingestion pipeline: the LLM extracts the
 * surcharges and this adapter replaces the set for one propuesta.
 */
export interface RecargoWriter {
  replaceForPropuesta(propuestaId: string, recargos: RecargoEscritura[]): Promise<number>;
}
