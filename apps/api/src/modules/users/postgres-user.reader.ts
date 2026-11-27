import type { User } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toUser } from './user.mapper.ts';
import type { UserReader } from './user.reader.ts';

/**
 * Read adapter. It uses the root Kysely instance deliberately: list queries
 * are not part of a write transaction.
 */
export class PostgresUserReader implements UserReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async list(): Promise<User[]> {
    const rows = await this.#db
      .selectFrom('users')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toUser);
  }
}
