import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { Kysely, PGliteDialect } from 'kysely';
import { KyselyTypegenPostgresDialect } from 'kysely-typegen/postgres';
import { createMigrator } from './migrator.ts';

const pglite = new PGlite();
const db = new Kysely<any>({
  dialect: new PGliteDialect({ pglite }),
});

try {
  const result = await createMigrator(db).migrateToLatest();

  if (result.error) {
    throw result.error;
  }

  const typegen = new KyselyTypegenPostgresDialect({ database: db });
  const { lines } = await typegen.typegen();
  const output = path.join(fileURLToPath(new URL('.', import.meta.url)), 'schema.generated.ts');

  await writeFile(output, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Kysely types written to ${output}`);
} finally {
  await db.destroy();
}
