import { randomUUID } from 'node:crypto';
import { createUserSchema, userSchema } from '@repo/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigrator } from '../src/db/migrator.ts';
import { EmailAlreadyExistsError } from '../src/modules/users/user.errors.ts';
import { PostgresUserRepository } from '../src/modules/users/postgres-user.repository.ts';
import { createTestDatabase, type TestDatabase } from './support/test-database.ts';

let testDb: TestDatabase;
let repository: PostgresUserRepository;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const result = await createMigrator(testDb.db).migrateToLatest();

  if (result.error) {
    throw result.error;
  }

  repository = new PostgresUserRepository(testDb.db);
});

afterAll(async () => {
  await testDb.destroy();
});

describe('PostgresUserRepository', () => {
  it('round-trips a user through PostgreSQL and the Zod contract', async () => {
    const input = createUserSchema.parse({
      name: '  Grace Hopper  ',
      email: `grace-${randomUUID()}@example.com`,
    });

    const created = await repository.create(input);

    expect(created.name).toBe('Grace Hopper');
    expect(created.createdAt).toBe(new Date(created.createdAt).toISOString());
    expect(userSchema.parse(created)).toEqual(created);

    const users = await repository.list();
    expect(users).toContainEqual(created);
  });

  it('rejects duplicate emails with a domain error', async () => {
    const email = `duplicate-${randomUUID()}@example.com`;
    const input = createUserSchema.parse({ name: 'First User', email });

    await repository.create(input);

    await expect(repository.create({ ...input, name: 'Second User' })).rejects.toBeInstanceOf(
      EmailAlreadyExistsError,
    );
  });
});
