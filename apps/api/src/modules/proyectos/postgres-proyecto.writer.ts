import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { CreateProyectoInput } from './proyecto.reader.ts';
import type { ProyectoWriter } from './proyecto.writer.ts';

/** Write adapter: requires a transaction. Root connections are compile errors. */
export class PostgresProyectoWriter implements ProyectoWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  create(input: CreateProyectoInput): Promise<{ id: string }> {
    return this.#trx
      .insertInto('proyecto')
      .values({
        nombre: input.nombre,
        descripcion: input.descripcion ?? null,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  }
}
