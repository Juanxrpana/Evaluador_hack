import { randomUUID } from 'node:crypto';
import { createUserSchema, userSchema } from '@repo/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigrator } from '../src/db/migrator.ts';
import { createTransactionRunner } from '../src/db/transaction.ts';
import { EmailAlreadyExistsError } from '../src/modules/users/user.errors.ts';
import { PostgresUserReader } from '../src/modules/users/postgres-user.reader.ts';
import { PostgresUserWriter } from '../src/modules/users/postgres-user.writer.ts';
import { createTestDatabase, type TestDatabase } from './support/test-database.ts';

let testDb: TestDatabase;
let reader: PostgresUserReader;
let runInTransaction: ReturnType<typeof createTransactionRunner<{ users: PostgresUserWriter }>>;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const result = await createMigrator(testDb.db).migrateToLatest();

  if (result.error) {
    throw result.error;
  }

  reader = new PostgresUserReader(testDb.db);
  runInTransaction = createTransactionRunner(testDb.db, (trx) => ({
    users: new PostgresUserWriter(trx),
  }));
});

afterAll(async () => {
  await testDb.destroy();
});

describe('Postgres user adapters', () => {
  it('round-trips a user through PostgreSQL and the Zod contract', async () => {
    const input = createUserSchema.parse({
      name: '  Grace Hopper  ',
      email: `grace-${randomUUID()}@example.com`,
    });

    const created = await runInTransaction(({ users }) => users.create(input));

    expect(created.name).toBe('Grace Hopper');
    expect(created.createdAt).toBe(new Date(created.createdAt).toISOString());
    expect(userSchema.parse(created)).toEqual(created);

    const users = await reader.list();
    expect(users).toContainEqual(created);
  });

  it('rejects duplicate emails with a domain error', async () => {
    const email = `duplicate-${randomUUID()}@example.com`;
    const input = createUserSchema.parse({ name: 'First User', email });

    await runInTransaction(({ users }) => users.create(input));

    await expect(
      runInTransaction(({ users }) => users.create({ ...input, name: 'Second User' })),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });
});
