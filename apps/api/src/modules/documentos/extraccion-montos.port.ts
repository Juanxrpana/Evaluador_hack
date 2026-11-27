/**
 * Port for extracting the offered amount and surcharges (recargos) from a
 * proposal's text. The LLM does this — surcharges are never typed by hand.
 */
export interface MontosExtraidos {
  /** Base offered amount (excluding recargos), decimal string or null. */
  montoTotal: string | null;
  recargos: Array<{ concepto: string; monto: string }>;
}

export interface ExtractorMontos {
  extraer(texto: string): Promise<MontosExtraidos>;
}
