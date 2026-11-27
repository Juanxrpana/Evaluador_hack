import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { RecargoEscritura, RecargoWriter } from './recargo.writer.ts';

export class PostgresRecargoWriter implements RecargoWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  async replaceForPropuesta(propuestaId: string, recargos: RecargoEscritura[]): Promise<number> {
    await this.#trx.deleteFrom('recargos').where('propuesta_id', '=', propuestaId).execute();

    if (recargos.length === 0) {
      return 0;
    }

    await this.#trx
      .insertInto('recargos')
      .values(
        recargos.map((recargo) => ({
          propuesta_id: propuestaId,
          concepto: recargo.concepto,
          monto: recargo.monto,
          porcentaje: recargo.porcentaje,
          moneda: recargo.moneda,
        })),
      )
      .execute();

    return recargos.length;
  }
}
