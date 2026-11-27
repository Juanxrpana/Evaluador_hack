import { randomUUID } from 'node:crypto';
import { createUserSchema } from '@repo/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigrator } from '../src/db/migrator.ts';
import { createTransactionRunner } from '../src/db/transaction.ts';
import { PostgresAuditWriter } from '../src/modules/audit/postgres-audit.writer.ts';
import { PostgresUserReader } from '../src/modules/users/postgres-user.reader.ts';
import { PostgresUserWriter } from '../src/modules/users/postgres-user.writer.ts';
import type {
  UserTransaction,
  UserTransactionRunner,
} from '../src/modules/users/user.transaction.ts';
import { createTestDatabase, type TestDatabase } from './support/test-database.ts';

let testDb: TestDatabase;
let reader: PostgresUserReader;
let runInTransaction: UserTransactionRunner;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const result = await createMigrator(testDb.db).migrateToLatest();

  if (result.error) {
    throw result.error;
  }

  reader = new PostgresUserReader(testDb.db);
  runInTransaction = createTransactionRunner<UserTransaction>(testDb.db, (trx) => ({
    users: new PostgresUserWriter(trx),
    audit: new PostgresAuditWriter(trx),
  }));
});

afterAll(async () => {
  await testDb.destroy();
});

describe('transaction boundary', () => {
  it('commits the user and audit row together', async () => {
    const input = createUserSchema.parse({
      name: 'Grace Hopper',
      email: `commit-${randomUUID()}@example.com`,
    });

    const user = await runInTransaction(async ({ users, audit }) => {
      const created = await users.create(input);

      await audit.record({
        action: 'user.create',
        resource: 'user',
        resourceId: created.id,
      });

      return created;
    });

    expect(await reader.list()).toContainEqual(user);

    const auditRows = await testDb.db
      .selectFrom('audit_events')
      .selectAll()
      .where('resource_id', '=', user.id)
      .execute();

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({
      action: 'user.create',
      resource: 'user',
      resource_id: user.id,
      actor_id: null,
      request_id: null,
      trace_id: null,
    });
  });

  it('rolls back both writes when the callback throws', async () => {
    const email = `rollback-${randomUUID()}@example.com`;
    let rolledBackUserId = '';

    await expect(
      runInTransaction(async ({ users, audit }) => {
        const created = await users.create(
          createUserSchema.parse({ name: 'Rollback User', email }),
        );
        rolledBackUserId = created.id;

        await audit.record({
          action: 'user.create',
          resource: 'user',
          resourceId: created.id,
        });

        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    const persistedUsers = await testDb.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .execute();
    expect(persistedUsers).toHaveLength(0);

    const persistedAudit = await testDb.db
      .selectFrom('audit_events')
      .selectAll()
      .where('resource_id', '=', rolledBackUserId)
      .execute();
    expect(persistedAudit).toHaveLength(0);
  });
});
