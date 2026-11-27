import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createAuth, type Auth } from '../src/auth/auth.ts';
import { createMigrator } from '../src/db/migrator.ts';
import { createTransactionRunner } from '../src/db/transaction.ts';
import { PostgresAuditWriter } from '../src/modules/audit/postgres-audit.writer.ts';
import { PostgresUserReader } from '../src/modules/users/postgres-user.reader.ts';
import { PostgresUserWriter } from '../src/modules/users/postgres-user.writer.ts';
import type { UserTransaction } from '../src/modules/users/user.transaction.ts';
import { UserService } from '../src/modules/users/user.service.ts';
import { createTestDatabase, type TestDatabase } from './support/test-database.ts';

// The auth-boundary tests never touch evaluator routes, so the app is
// composed with stub services to keep this suite focused and fast.
const stub = <T>(): T => ({}) as T;

let testDb: TestDatabase;
let auth: Auth;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const result = await createMigrator(testDb.db).migrateToLatest();

  if (result.error) {
    throw result.error;
  }

  auth = createAuth(testDb.db, {
    secret: 'test-only-secret-0123456789abcdef0123456789abcdef',
    baseURL: 'http://localhost:3000',
    trustedOrigins: ['http://localhost:5173'],
  });

  const users = new UserService(
    new PostgresUserReader(testDb.db),
    createTransactionRunner<UserTransaction>(testDb.db, (trx) => ({
      users: new PostgresUserWriter(trx),
      audit: new PostgresAuditWriter(trx),
    })),
  );

  const app = createApp({
    auth,
    users,
    proyectos: stub(),
    proveedores: stub(),
    propuestas: stub(),
    documentos: stub(),
    chat: stub(),
    notas: stub(),
    estatus: stub(),
    recargos: stub(),
    conocimiento: stub(),
    items: stub(),
    evaluaciones: stub(),
    procesos: stub(),
    usuarios: stub(),
    decisiones: stub(),
    alertas: { porProveedor: async () => [] },
    permisosDe: async () => new Set(),
  });

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await testDb.destroy();
});

describe('HTTP auth boundary', () => {
  it('rejects an anonymous protected request with 401', async () => {
    const response = await fetch(`${baseUrl}/api/users`);

    expect(response.status).toBe(401);
  });

  it('serves the protected list after a Better Auth sign-up', async () => {
    const email = `http-${randomUUID()}@example.com`;
    const signUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        email,
        password: 'correct-horse-battery-staple',
        name: 'HTTP User',
      }),
    });

    expect(signUp.status).toBe(200);

    const cookie = signUp.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    const response = await fetch(`${baseUrl}/api/users`, {
      headers: { cookie },
    });

    expect(response.status).toBe(200);

    const users = (await response.json()) as Array<{ email: string }>;
    expect(users.some((user) => user.email === email)).toBe(true);
  });
});
