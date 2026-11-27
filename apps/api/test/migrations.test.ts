import { NO_MIGRATIONS } from 'kysely/migration';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigrator } from '../src/db/migrator.ts';
import { createTestDatabase, type TestDatabase } from './support/test-database.ts';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.destroy();
});

async function hasTable(name: string): Promise<boolean> {
  const tables = await testDb.db.introspection.getTables();
  return tables.some((table) => table.name === name);
}

describe('database migrations', () => {
  it('applies, reverses, and reapplies every migration', async () => {
    const migrator = createMigrator(testDb.db);

    const applied = await migrator.migrateToLatest();
    expect(applied.error).toBeUndefined();
    expect(applied.results?.every((result) => result.status === 'Success')).toBe(true);
    expect(await hasTable('users')).toBe(true);
    expect(await hasTable('audit_events')).toBe(true);

    const reversed = await migrator.migrateTo(NO_MIGRATIONS);
    expect(reversed.error).toBeUndefined();
    expect(reversed.results?.every((result) => result.status === 'Success')).toBe(true);
    expect(await hasTable('users')).toBe(false);
    expect(await hasTable('audit_events')).toBe(false);

    const historyAfterReversal = await migrator.getMigrations();
    expect(historyAfterReversal.every((migration) => migration.executedAt === undefined)).toBe(
      true,
    );

    const reapplied = await migrator.migrateToLatest();
    expect(reapplied.error).toBeUndefined();
    expect(reapplied.results?.every((result) => result.status === 'Success')).toBe(true);
    expect(await hasTable('users')).toBe(true);
    expect(await hasTable('audit_events')).toBe(true);
  });
});
