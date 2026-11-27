import type { ProcesoEtapa } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

export interface EtapasReader {
  list(): Promise<ProcesoEtapa[]>;
}

export class PostgresEtapasReader implements EtapasReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async list(): Promise<ProcesoEtapa[]> {
    const filas = await this.#db
      .selectFrom('proceso_etapa')
      .select(['id', 'orden', 'nombre', 'slug'])
      .orderBy('orden', 'asc')
      .execute();

    return filas.map((fila) => ({
      id: fila.id,
      orden: fila.orden,
      nombre: fila.nombre,
      slug: fila.slug,
    }));
  }
}
