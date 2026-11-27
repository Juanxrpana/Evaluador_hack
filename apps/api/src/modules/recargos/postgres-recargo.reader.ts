import type { Recargo } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toRecargo } from './recargo.mapper.ts';
import type { RecargoReader } from './recargo.reader.ts';

/** Recargos are LLM-created during proposal ingestion; the API exposes read-only. */
export class PostgresRecargoReader implements RecargoReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async listByPropuesta(propuestaId: string): Promise<Recargo[]> {
    const rows = await this.#db
      .selectFrom('recargos')
      .selectAll()
      .where('propuesta_id', '=', propuestaId)
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map(toRecargo);
  }
}
