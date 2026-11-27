export interface FuentePrecio {
  titulo: string;
  url: string;
}

export interface InvestigacionPrecio {
  termino: string;
  precioReferencial: string | null;
  moneda: string;
  fuentes: FuentePrecio[];
  desdeCache: boolean;
}

/**
 * Market research port (C.1): one normalized query per insumo, cached, with
 * an LLM price extraction over the snippets treated as data.
 */
export interface MercadoService {
  investigarInsumo(nombre: string, especificaciones: string[]): Promise<InvestigacionPrecio>;
}
