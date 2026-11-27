import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toPropuestaItem } from './propuesta-item.mapper.ts';
import type { PropuestaItem } from './propuesta-item.writer.ts';

/** Read port for the extracted line items of one propuesta. */
export interface PropuestaItemReader {
  listByPropuesta(propuestaId: string): Promise<PropuestaItem[]>;
}

export class PostgresPropuestaItemReader implements PropuestaItemReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async listByPropuesta(propuestaId: string): Promise<PropuestaItem[]> {
    const rows = await this.#db
      .selectFrom('propuesta_item')
      .selectAll()
      .where('propuesta_id', '=', propuestaId)
      .orderBy('linea', 'asc')
      .execute();

    return rows.map(toPropuestaItem);
  }
}
