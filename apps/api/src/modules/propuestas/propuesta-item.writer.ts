import type { PropuestaItem } from '@repo/contracts';

export interface ItemExtraidoEscritura {
  nombre: string;
  cantidad: string;
  precioUnitario: string;
  moneda: string | null;
}

/** Write port for the LLM-extracted line items of one propuesta. */
export interface PropuestaItemWriter {
  replaceForPropuesta(propuestaId: string, items: ItemExtraidoEscritura[]): Promise<number>;
}

export type { PropuestaItem };
