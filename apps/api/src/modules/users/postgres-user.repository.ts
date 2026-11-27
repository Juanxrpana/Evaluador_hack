import type { CreateUserInput, User } from '@repo/contracts';
import type { Kysely, Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { EmailAlreadyExistsError } from './user.errors.ts';
import type { UserRepository } from './user.repository.ts';

/**
 * Postgres adapter. The mapper is the explicit, compiler-checked boundary
 * between the generated database row type and the Zod-owned API type.
 */
export class PostgresUserRepository implements UserRepository {
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

  async create(input: CreateUserInput): Promise<User> {
    try {
      const row = await this.#db
        .insertInto('users')
        .values({
          name: input.name,
          email: input.email,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return toUser(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyExistsError(input.email);
      }

      throw error;
    }
  }
}

function toUser(row: Selectable<DB['users']>): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}
