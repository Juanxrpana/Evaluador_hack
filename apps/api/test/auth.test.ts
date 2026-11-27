import { randomUUID } from 'node:crypto';
import { getMigrations } from 'better-auth/db/migration';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth, type Auth } from '../src/auth/auth.ts';
import { createMigrator } from '../src/db/migrator.ts';
import { createTestDatabase, type TestDatabase } from './support/test-database.ts';

let testDb: TestDatabase;
let auth: Auth;

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
});

afterAll(async () => {
  await testDb.destroy();
});

describe('Better Auth integration', () => {
  it('has no pending schema changes after the Kysely migrations run', async () => {
    const migrations = await getMigrations(auth.options);

    expect(migrations.toBeCreated).toEqual([]);
    expect(migrations.toBeAdded).toEqual([]);
  });

  it('signs up a user, stores a UUID session, and resolves the cookie', async () => {
    const email = `ada-${randomUUID()}@example.com`;

    const response = await auth.handler(
      new Request('http://localhost:3000/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:5173',
        },
        body: JSON.stringify({
          email,
          password: 'correct-horse-battery-staple',
          name: 'Ada Lovelace',
        }),
      }),
    );

    expect(response.status).toBe(200);

    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });

    if (!session) {
      throw new Error('Expected Better Auth to resolve the new session');
    }

    expect(session.user.email).toBe(email);
    expect(session.user.id).toMatch(/^[0-9a-f-]{36}$/);

    const user = await testDb.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirstOrThrow();
    const sessionRow = await testDb.db
      .selectFrom('sessions')
      .selectAll()
      .where('user_id', '=', user.id)
      .executeTakeFirstOrThrow();

    expect(user.id).toBe(session.user.id);
    expect(sessionRow.id).toBe(session.session.id);
    expect(sessionRow.token).not.toHaveLength(0);
  });
});
