import type { Propuesta } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toPropuesta } from './propuesta.mapper.ts';
import type { PropuestaReader } from './propuesta.reader.ts';

export class PostgresPropuestaReader implements PropuestaReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async get(id: string): Promise<Propuesta | null> {
    const row = await this.#db
      .selectFrom('propuesta')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? toPropuesta(row) : null;
  }

  async listByProyecto(proyectoId: string): Promise<Propuesta[]> {
    const rows = await this.#db
      .selectFrom('propuesta')
      .selectAll()
      .where('proyecto_id', '=', proyectoId)
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map(toPropuesta);
  }
}
