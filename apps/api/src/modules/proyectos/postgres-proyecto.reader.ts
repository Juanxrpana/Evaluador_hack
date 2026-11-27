import type { Proyecto } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toProyecto } from './proyecto.mapper.ts';
import type { ProyectoReader } from './proyecto.reader.ts';

/** Read adapter over the root connection: reads are not part of a write. */
export class PostgresProyectoReader implements ProyectoReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async list(): Promise<Proyecto[]> {
    const rows = await this.#db
      .selectFrom('proyecto')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toProyecto);
  }

  async get(id: string): Promise<Proyecto | null> {
    const row = await this.#db
      .selectFrom('proyecto')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? toProyecto(row) : null;
  }
}
