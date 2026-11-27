import { createServer } from 'node:http';
import { sql } from 'kysely';
import { createApp } from './app.ts';
import { createAuth } from './auth/auth.ts';
import { env } from './config/env.ts';
import { createDatabase } from './db/client.ts';
import { PostgresUserRepository } from './modules/users/postgres-user.repository.ts';
import { logger } from './observability/logger.ts';

const db = createDatabase({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
});

await sql`select 1`.execute(db);
logger.info('Database connection verified');

const app = createApp({
  auth: createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.CORS_ORIGIN],
  }),
  users: new PostgresUserRepository(db),
});
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API listening');
  logger.info({ url: `http://localhost:${env.PORT}/api` }, 'oRPC/OpenAPI base');
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info('Shutting down');

  server.close(async () => {
    try {
      await db.destroy();
    } finally {
      logger.flush(() => process.exit(0));
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
