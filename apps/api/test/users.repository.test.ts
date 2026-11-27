import { randomUUID } from 'node:crypto';
import { userSchema } from '@repo/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigrator } from '../src/db/migrator.ts';
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
  it('maps a PostgreSQL row to the Zod-owned API shape', async () => {
    const email = `grace-${randomUUID()}@example.com`;

    await testDb.db.insertInto('users').values({ name: 'Grace Hopper', email }).execute();

    const users = await repository.list();
    const created = users.find((user) => user.email === email);

    expect(created).toBeDefined();
    expect(userSchema.parse(created)).toEqual(created);
    expect(created?.createdAt).toBe(new Date(created?.createdAt ?? '').toISOString());
  });

  it('returns newest users first', async () => {
    const older = `older-${randomUUID()}@example.com`;
    const newer = `newer-${randomUUID()}@example.com`;

    await testDb.db
      .insertInto('users')
      .values({ name: 'Older', email: older, created_at: new Date('2026-01-01T00:00:00Z') })
      .execute();
    await testDb.db
      .insertInto('users')
      .values({ name: 'Newer', email: newer, created_at: new Date('2026-02-01T00:00:00Z') })
      .execute();

    const users = await repository.list();

    expect(users.findIndex((user) => user.email === newer)).toBeLessThan(
      users.findIndex((user) => user.email === older),
    );
  });
});
