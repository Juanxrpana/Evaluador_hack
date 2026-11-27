import type { Estatus } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toEstatus } from './estatus.mapper.ts';
import type { EstatusReader } from './estatus.reader.ts';

export class PostgresEstatusReader implements EstatusReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async get(id: string): Promise<Estatus | null> {
    const row = await this.#db
      .selectFrom('estatus')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? toEstatus(row) : null;
  }

  async listByProyecto(proyectoId: string): Promise<Estatus[]> {
    const rows = await this.#db
      .selectFrom('estatus')
      .selectAll()
      .where('proyecto_id', '=', proyectoId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toEstatus);
  }

  async listByPropuesta(propuestaId: string): Promise<Estatus[]> {
    const rows = await this.#db
      .selectFrom('estatus')
      .selectAll()
      .where('propuesta_id', '=', propuestaId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toEstatus);
  }
}
