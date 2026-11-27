import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { UsuarioWriter } from './usuario.writer.ts';

export class PostgresUsuarioWriter implements UsuarioWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  async asignarRol(usuarioId: string, rolId: string | null): Promise<boolean> {
    const rows = await this.#trx
      .updateTable('users')
      .set({ rol_id: rolId, updated_at: new Date() })
      .where('id', '=', usuarioId)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }
}
