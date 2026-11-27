import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createIndex('users_created_at_idx').on('users').column('created_at').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('users_created_at_idx').ifExists().execute();
}
