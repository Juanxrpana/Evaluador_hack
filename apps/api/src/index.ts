import { createServer } from 'node:http';
import { sql } from 'kysely';
import { createApp } from './app.ts';
import { createAuth } from './auth/auth.ts';
import { env } from './config/env.ts';
import { createDatabase } from './db/client.ts';
import { createTransactionRunner } from './db/transaction.ts';
import { PostgresAuditWriter } from './modules/audit/postgres-audit.writer.ts';
import { PostgresUserReader } from './modules/users/postgres-user.reader.ts';
import { PostgresUserWriter } from './modules/users/postgres-user.writer.ts';
import type { UserTransaction, UserTransactionRunner } from './modules/users/user.transaction.ts';
import { UserService } from './modules/users/user.service.ts';
import { logger } from './observability/logger.ts';
import { getRequestContext } from './observability/request-context.ts';

const db = createDatabase({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  statementTimeoutMs: 10_000,
  idleInTransactionTimeoutMs: 10_000,
});

await sql`select 1`.execute(db);
logger.info('Database connection verified');

const runInUserTransaction: UserTransactionRunner = createTransactionRunner<UserTransaction>(
  db,
  (trx) => {
    const context = getRequestContext();

    return {
      users: new PostgresUserWriter(trx),
      audit: new PostgresAuditWriter(trx, {
        actorId: context?.actorId,
        requestId: context?.requestId,
        traceId: context?.traceId,
      }),
    };
  },
);

const app = createApp({
  auth: createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.CORS_ORIGIN],
  }),
  users: new UserService(new PostgresUserReader(db), runInUserTransaction),
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
