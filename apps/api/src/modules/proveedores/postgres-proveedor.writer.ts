import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { CreateProveedorInput, UpdateProveedorInput } from './proveedor.reader.ts';
import type { ProveedorWriter } from './proveedor.writer.ts';

export class PostgresProveedorWriter implements ProveedorWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  create(input: CreateProveedorInput): Promise<{ id: string }> {
    return this.#trx
      .insertInto('proveedor')
      .values({
        nombre: input.nombre,
        contacto: input.contacto ?? null,
        rif: input.rif ?? null,
        ubicacion: input.ubicacion ?? null,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  }

  async update(id: string, input: UpdateProveedorInput): Promise<boolean> {
    const patch: Record<string, unknown> = { updated_at: new Date() };

    if (input.nombre !== undefined) {
      patch.nombre = input.nombre;
    }

    if (input.contacto !== undefined) {
      patch.contacto = input.contacto;
    }

    if (input.rif !== undefined) {
      patch.rif = input.rif;
    }

    if (input.ubicacion !== undefined) {
      patch.ubicacion = input.ubicacion;
    }

    const rows = await this.#trx
      .updateTable('proveedor')
      .set(patch)
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.#trx
      .deleteFrom('proveedor')
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }
}
