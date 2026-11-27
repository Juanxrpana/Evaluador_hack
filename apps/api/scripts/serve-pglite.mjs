// Local dev helper: exposes an embedded PGlite database over the Postgres
// wire protocol so the API can connect to localhost:5432 without a native
// PostgreSQL installation. Not part of the production stack.
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const dataDir = process.argv[2] ?? './.pgdata-dev';
const port = Number(process.argv[3] ?? 5432);

const db = new PGlite(dataDir, { extensions: { vector } });
await db.exec('CREATE EXTENSION IF NOT EXISTS vector;');

const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
await server.start();
console.log(`PGlite escuchando en localhost:${port} (data: ${dataDir})`);
