import type { Nota } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toNota } from './nota.mapper.ts';
import type { NotaReader } from './nota.reader.ts';

export class PostgresNotaReader implements NotaReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async get(id: string): Promise<Nota | null> {
    const row = await this.#db
      .selectFrom('nota')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? toNota(row) : null;
  }

  async listByPropuesta(propuestaId: string): Promise<Nota[]> {
    const rows = await this.#db
      .selectFrom('nota')
      .selectAll()
      .where('propuesta_id', '=', propuestaId)
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map(toNota);
  }
}
