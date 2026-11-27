import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { Kysely, PGliteDialect, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from '../../src/db/schema.generated.ts';

export interface TestDatabase {
  db: Kysely<DB>;
  destroy(): Promise<void>;
}

/**
 * PGlite is the default so migration tests need no Docker or external service.
 * Set TEST_DATABASE_URL to run the same suite against real PostgreSQL; the
 * database name must end in _test and only a generated schema is touched.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const testUrl = process.env.TEST_DATABASE_URL;

  return testUrl ? createPostgresTestDatabase(testUrl) : createPgliteTestDatabase();
}

async function createPgliteTestDatabase(): Promise<TestDatabase> {
  const pglite = await PGlite.create();
  const db = new Kysely<DB>({
    dialect: new PGliteDialect({ pglite }),
  });

  return {
    db,
    async destroy() {
      await db.destroy();
    },
  };
}

async function createPostgresTestDatabase(connectionString: string): Promise<TestDatabase> {
  const databaseName = new URL(connectionString).pathname.replace(/^\//, '');

  if (!databaseName.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point to a database whose name ends in _test');
  }

  const schema = `test_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  const admin = new Pool({ connectionString, max: 1 });
  await admin.query(`create schema "${schema}"`);

  const pool = new Pool({
    connectionString,
    max: 2,
    options: `-c search_path=${schema}`,
  });
  const db = new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    db,
    async destroy() {
      try {
        await db.destroy();
      } finally {
        await admin.query(`drop schema "${schema}" cascade`);
        await admin.end();
      }
    },
  };
}
