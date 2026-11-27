import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Kysely } from 'kysely';
import { FileMigrationProvider, Migrator } from 'kysely/migration';

const migrationFolder = fileURLToPath(new URL('./migrations', import.meta.url));

/**
 * Kysely's migration types intentionally use Kysely<any>: migrations are
 * frozen historical artifacts and must not depend on the current app schema.
 */
export function createMigrator(db: Kysely<any>) {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });
}
