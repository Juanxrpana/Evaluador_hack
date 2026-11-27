import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { CreateNotaInput } from './nota.reader.ts';
import type { NotaWriter } from './nota.writer.ts';

export class PostgresNotaWriter implements NotaWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  async create(input: CreateNotaInput): Promise<{ id: string }> {
    const row = await this.#trx
      .insertInto('nota')
      .values({
        propuesta_id: input.propuestaId,
        texto: input.texto,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    return { id: row.id };
  }

  async update(id: string, input: { texto?: string }): Promise<boolean> {
    const patch: Record<string, unknown> = {};

    if (input.texto !== undefined) {
      patch.texto = input.texto;
    }

    if (Object.keys(patch).length === 0) {
      return true;
    }

    const rows = await this.#trx
      .updateTable('nota')
      .set(patch)
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.#trx
      .deleteFrom('nota')
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }
}
