import { sql, type Kysely } from 'kysely';

/**
 * Durable, success-only audit trail. Rows are written in the same transaction
 * as the domain change they describe; a rollback removes both.
 *
 * Failed HTTP attempts remain in the existing stdout audit stream. This table
 * intentionally records committed facts, not attempts.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('audit_events')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('action', 'text', (column) => column.notNull())
    .addColumn('resource', 'text', (column) => column.notNull())
    .addColumn('resource_id', 'text', (column) => column.notNull())
    .addColumn('actor_id', 'text')
    // Inbound X-Request-Id values are validated as safe strings, not UUIDs.
    .addColumn('request_id', 'text')
    .addColumn('trace_id', 'text')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('audit_events_resource_idx')
    .on('audit_events')
    .columns(['resource', 'resource_id'])
    .execute();

  await db.schema
    .createIndex('audit_events_created_at_idx')
    .on('audit_events')
    .column('created_at')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('audit_events').ifExists().execute();
}
