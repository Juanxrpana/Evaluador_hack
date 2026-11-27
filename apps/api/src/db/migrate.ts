import { env } from '../config/env.ts';
import { createDatabase } from './client.ts';
import { createMigrator } from './migrator.ts';

type Command = 'up' | 'down' | 'status';

const command = (process.argv[2] ?? 'up') as Command;
const supportedCommands: ReadonlySet<string> = new Set(['up', 'down', 'status']);

if (!supportedCommands.has(command)) {
  console.error(`Unknown command "${command}". Use up, down, or status.`);
  process.exit(1);
}

if (command === 'down' && env.NODE_ENV === 'production' && process.env.ALLOW_DB_ROLLBACK !== '1') {
  console.error(
    'Refusing to roll back in production. Set ALLOW_DB_ROLLBACK=1 to override explicitly.',
  );
  process.exit(1);
}

const db = createDatabase({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
});
const migrator = createMigrator(db);

try {
  if (command === 'status') {
    const migrations = await migrator.getMigrations();
    console.table(
      migrations.map((migration) => ({
        migration: migration.name,
        executed: migration.executedAt !== undefined,
      })),
    );
  } else {
    const result =
      command === 'up' ? await migrator.migrateToLatest() : await migrator.migrateDown();

    for (const item of result.results ?? []) {
      console.log(`${item.status}: ${item.migrationName}`);
    }

    if (result.error) {
      throw result.error;
    }
  }
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
