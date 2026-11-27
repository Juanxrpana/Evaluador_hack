import { createServer } from 'node:http';
import { sql } from 'kysely';
import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { createDatabase } from './db/client.ts';
import { PostgresUserRepository } from './modules/users/postgres-user.repository.ts';

const db = createDatabase({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
});

await sql`select 1`.execute(db);
console.log('Database connection verified');

const app = createApp({
  users: new PostgresUserRepository(db),
});
const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  console.log(`oRPC/OpenAPI base: http://localhost:${env.PORT}/api`);
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
