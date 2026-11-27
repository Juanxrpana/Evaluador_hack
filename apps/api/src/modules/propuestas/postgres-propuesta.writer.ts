import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { CreatePropuestaInput, UpdatePropuestaInput } from './propuesta.reader.ts';
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

  async update(id: string, input: UpdatePropuestaInput): Promise<boolean> {
    const patch: Record<string, unknown> = { updated_at: new Date() };

    if (input.monto !== undefined) {
      patch.monto = input.monto;
    }

    const rows = await this.#trx
      .updateTable('propuesta')
      .set(patch)
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.#trx
      .deleteFrom('propuesta')
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }
}
