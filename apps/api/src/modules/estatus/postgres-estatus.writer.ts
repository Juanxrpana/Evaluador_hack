import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { CreateEstatusInput } from './estatus.reader.ts';
import type { EstatusWriter } from './estatus.writer.ts';

export class PostgresEstatusWriter implements EstatusWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  create(input: CreateEstatusInput): Promise<{ id: string }> {
    return this.#trx
      .insertInto('estatus')
      .values({
        proyecto_id: input.proyectoId ?? null,
        propuesta_id: input.propuestaId ?? null,
        estado: input.estado,
        comentario: input.comentario ?? null,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  }

  async update(
    id: string,
    input: { estado?: number; comentario?: string | null | undefined },
  ): Promise<boolean> {
    const patch: Record<string, unknown> = {};

    if (input.estado !== undefined) {
      patch.estado = input.estado;
    }

    if (input.comentario !== undefined) {
      patch.comentario = input.comentario;
    }

    if (Object.keys(patch).length === 0) {
      return true;
    }

    const rows = await this.#trx
      .updateTable('estatus')
      .set(patch)
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.#trx
      .deleteFrom('estatus')
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }
}
