import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigrator } from '../src/db/migrator.ts';
import { createTransactionRunner } from '../src/db/transaction.ts';
import { PostgresAuditWriter } from '../src/modules/audit/postgres-audit.writer.ts';
import { createTestDatabase, type TestDatabase } from './support/test-database.ts';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const result = await createMigrator(testDb.db).migrateToLatest();

  if (result.error) {
    throw result.error;
  }
});

afterAll(async () => {
  await testDb.destroy();
});

describe('PostgresAuditWriter', () => {
  it('writes a durable row with null correlation outside a request', async () => {
    const resourceId = randomUUID();
    const runInTransaction = createTransactionRunner(testDb.db, (trx) => ({
      audit: new PostgresAuditWriter(trx),
    }));

    await runInTransaction(({ audit }) =>
      audit.record({
        action: 'user.create',
        resource: 'user',
        resourceId,
      }),
    );

    const rows = await testDb.db
      .selectFrom('audit_events')
      .selectAll()
      .where('resource_id', '=', resourceId)
      .execute();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'user.create',
      resource: 'user',
      resource_id: resourceId,
      actor_id: null,
      request_id: null,
      trace_id: null,
    });
  });

  it('persists correlation metadata supplied by the composition boundary', async () => {
    const resourceId = randomUUID();
    // Inbound request IDs are safe strings, not necessarily UUIDs.
    const requestId = 'req-abc.123:checkout';
    const runInTransaction = createTransactionRunner(testDb.db, (trx) => ({
      audit: new PostgresAuditWriter(trx, {
        actorId: 'actor-1',
        requestId,
        traceId: 'trace-1',
      }),
    }));

    await runInTransaction(({ audit }) =>
      audit.record({
        action: 'user.create',
        resource: 'user',
        resourceId,
      }),
    );

    const rows = await testDb.db
      .selectFrom('audit_events')
      .selectAll()
      .where('resource_id', '=', resourceId)
      .execute();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actor_id: 'actor-1',
      request_id: requestId,
      trace_id: 'trace-1',
    });
  });
});
