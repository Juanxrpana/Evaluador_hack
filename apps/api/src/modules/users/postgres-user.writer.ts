import type { User } from '@repo/contracts';
import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { EmailAlreadyExistsError } from './user.errors.ts';
import { toUser } from './user.mapper.ts';
import type { CreateUserInput, UserWriter } from './user.writer.ts';

/**
 * Write adapter. Requiring Transaction<DB> makes it a compile error to pass
 * the root Kysely instance, which would silently run outside the unit of work.
 */
export class PostgresUserWriter implements UserWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  async create(input: CreateUserInput): Promise<User> {
    try {
      const row = await this.#trx
        .insertInto('users')
        .values({
          name: input.name,
          email: input.email,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return toUser(row);
    } catch (error) {
      if (isEmailUniqueViolation(error)) {
        throw new EmailAlreadyExistsError(input.email);
      }

      throw error;
    }
  }
}

/**
 * Only the email constraint is translated to a domain error. Other unique
 * violations must keep their raw PostgreSQL error so future retry/error
 * classifiers can see the real cause.
 */
function isEmailUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505' &&
    'constraint' in error &&
    (error as { constraint?: unknown }).constraint === 'users_email_key'
  );
}
