import { sql, type Kysely } from 'kysely';

/**
 * Better Auth's core schema, mapped onto the project's snake_case convention.
 * The `users` table remains the single identity table; credentials live in
 * `accounts` so a user can later add OAuth providers without changing rows.
 *
 * Migrations are historical and intentionally untyped against the current
 * application schema.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('email_verified', 'boolean', (column) => column.notNull().defaultTo(false))
    .addColumn('image', 'text')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('sessions')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('token', 'text', (column) => column.notNull().unique())
    .addColumn('user_id', 'uuid', (column) =>
      column.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('expires_at', 'timestamptz', (column) => column.notNull())
    .addColumn('ip_address', 'text')
    .addColumn('user_agent', 'text')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex('sessions_user_id_idx').on('sessions').column('user_id').execute();

  await db.schema
    .createTable('accounts')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('account_id', 'text', (column) => column.notNull())
    .addColumn('provider_id', 'text', (column) => column.notNull())
    .addColumn('user_id', 'uuid', (column) =>
      column.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('id_token', 'text')
    .addColumn('access_token_expires_at', 'timestamptz')
    .addColumn('refresh_token_expires_at', 'timestamptz')
    .addColumn('scope', 'text')
    .addColumn('password', 'text')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex('accounts_user_id_idx').on('accounts').column('user_id').execute();

  await db.schema
    .createTable('verifications')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('identifier', 'text', (column) => column.notNull())
    .addColumn('value', 'text', (column) => column.notNull())
    .addColumn('expires_at', 'timestamptz', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('verifications_identifier_idx')
    .on('verifications')
    .column('identifier')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('verifications').ifExists().execute();
  await db.schema.dropTable('accounts').ifExists().execute();
  await db.schema.dropTable('sessions').ifExists().execute();

  await db.schema
    .alterTable('users')
    .dropColumn('updated_at')
    .dropColumn('image')
    .dropColumn('email_verified')
    .execute();
}
