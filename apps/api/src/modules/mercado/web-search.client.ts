export interface ResultadoBusqueda {
  titulo: string;
  url: string;
  contenido: string;
}

export interface BusquedaWeb {
  resultados: ResultadoBusqueda[];
  motor: string;
}

/**
 * Web search port for market price research (C.1). Implementations must be
 * fed ONLY with normalized insumo queries — never proposal text (F.3).
 */
export interface WebSearchClient {
  buscar(termino: string): Promise<BusquedaWeb>;
}
