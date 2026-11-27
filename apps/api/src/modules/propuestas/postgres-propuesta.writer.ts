import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { CreatePropuestaInput } from './propuesta.reader.ts';
import type { PropuestaWriter } from './propuesta.writer.ts';

export class PostgresPropuestaWriter implements PropuestaWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  create(input: CreatePropuestaInput): Promise<{ id: string }> {
    return this.#trx
      .insertInto('propuesta')
      .values({
        proyecto_id: input.proyectoId,
        proveedor_id: input.proveedorId,
        monto: input.monto ?? null,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  }
}
