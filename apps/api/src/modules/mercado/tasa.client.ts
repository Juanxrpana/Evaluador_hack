/** Official BCV exchange rate (E.4.a). Rate cross: string decimal. */
export interface TasaCambio {
  tasa: string;
  fuente: string;
  fecha: string;
}

export interface TasaClient {
  obtenerTasa(): Promise<TasaCambio | null>;
}
