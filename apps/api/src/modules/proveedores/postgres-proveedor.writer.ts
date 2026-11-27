import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { CreateProveedorInput } from './proveedor.reader.ts';
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
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  }
}
