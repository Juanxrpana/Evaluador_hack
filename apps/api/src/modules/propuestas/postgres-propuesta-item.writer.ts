import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { ItemExtraidoEscritura, PropuestaItemWriter } from './propuesta-item.writer.ts';

export class PostgresPropuestaItemWriter implements PropuestaItemWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  async replaceForPropuesta(propuestaId: string, items: ItemExtraidoEscritura[]): Promise<number> {
    await this.#trx.deleteFrom('propuesta_item').where('propuesta_id', '=', propuestaId).execute();

    if (items.length === 0) {
      return 0;
    }

    await this.#trx
      .insertInto('propuesta_item')
      .values(
        items.map((item, index) => ({
          propuesta_id: propuestaId,
          linea: index,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          moneda: item.moneda,
        })),
      )
      .execute();

    return items.length;
  }
}
