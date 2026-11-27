import type { RecargoExtraido, RecursoItemExtraido } from '@repo/contracts';

/**
 * Result of the LLM structured extraction over one proposal document.
 * Amounts are decimal strings; percentage surcharges carry `porcentaje`
 * instead of `monto` (B.2) and get computed by the engine, never by the LLM.
 */
export interface MontosExtraidos {
  montoTotal: string | null;
  moneda: string | null;
  recargos: RecargoExtraido[];
  items: RecursoItemExtraido[];
  /** Hidden instructions detected in the document text (B.6): discard cause. */
  instruccionesOcultas: string[];
}

/**
 * Port for turning a proposal's text into structured economic data.
 */
export interface ExtractorMontos {
  extraer(texto: string): Promise<MontosExtraidos>;
}
