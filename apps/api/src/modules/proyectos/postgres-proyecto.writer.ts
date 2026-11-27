import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { CreateProyectoInput, UpdateProyectoInput } from './proyecto.reader.ts';
import type { ProyectoWriter } from './proyecto.writer.ts';

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
        ubicacion: input.ubicacion ?? null,
        presupuesto_referencial: input.presupuestoReferencial ?? null,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  }

  async update(id: string, input: UpdateProyectoInput): Promise<boolean> {
    const patch: Record<string, unknown> = { updated_at: new Date() };

    if (input.nombre !== undefined) {
      patch.nombre = input.nombre;
    }

    if (input.descripcion !== undefined) {
      patch.descripcion = input.descripcion;
    }

    if (input.ubicacion !== undefined) {
      patch.ubicacion = input.ubicacion;
    }

    if (input.presupuestoReferencial !== undefined) {
      patch.presupuesto_referencial = input.presupuestoReferencial;
    }

    const rows = await this.#trx
      .updateTable('proyecto')
      .set(patch)
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.#trx
      .deleteFrom('proyecto')
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }
}
