import { sql, type Kysely } from 'kysely';

/**
 * Migrations are historical and intentionally untyped against the current
 * application schema.
 *
 * This migration wires the AI knowledge layer:
 * - enables the pgvector extension when the server provides it (the compose
 *   image `pgvector/pgvector:pg19` does; the in-memory PGlite test database
 *   does not, so embedding columns are installed conditionally),
 * - lets `conocimiento` hold many rows per proyecto (chunks), keeping the
 *   NOT NULL foreign key so every chunk stays scoped to one project,
 * - adds the 1024-dimension bge-m3 embedding column with an HNSW index,
 * - adds the `documento` table so every uploaded file is stored durably in
 *   PostgreSQL next to the knowledge chunks it produced.
 *
 * Vector columns are optional at the database level, so adapters never get
 * them from the generated Kysely types: every embedding read/write goes
 * through raw SQL in the vector search adapter.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('documento')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('proyecto_id', 'uuid', (column) =>
      column.notNull().references('proyecto.id').onDelete('cascade'),
    )
    .addColumn('propuesta_id', 'uuid', (column) =>
      column.references('propuesta.id').onDelete('set null'),
    )
    .addColumn('proveedor_id', 'uuid', (column) =>
      column.references('proveedor.id').onDelete('set null'),
    )
    .addColumn('nombre', 'text', (column) => column.notNull())
    .addColumn('mime', 'text', (column) => column.notNull())
    .addColumn('tamano_bytes', 'bigint', (column) => column.notNull())
    .addColumn('contenido', sql`bytea`, (column) => column.notNull())
    .addColumn('metadata', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  // One project's knowledge base is a collection of chunks (document sections,
  // supplier cost-history summaries), not a single row.
  await db.schema.alterTable('conocimiento').dropConstraint('conocimiento_proyecto_uniq').execute();

  await db.schema
    .alterTable('conocimiento')
    .addColumn('chunk_index', 'int2')
    .addColumn('documento_id', 'uuid', (column) =>
      column.references('documento.id').onDelete('cascade'),
    )
    .addColumn('tipo', 'text', (column) => column.notNull().defaultTo('documento'))
    .execute();

  if (await hasVectorExtension(db)) {
    await sql`create extension if not exists vector`.execute(db);
    await sql`alter table conocimiento add column embedding vector(1024)`.execute(db);
    await sql`create index idx_conocimiento_embedding on conocimiento using hnsw (embedding vector_cosine_ops)`.execute(
      db,
    );
  }

  await db.schema
    .createIndex('idx_documento_proyecto')
    .on('documento')
    .column('proyecto_id')
    .execute();
  await db.schema
    .createIndex('idx_conocimiento_proyecto')
    .on('conocimiento')
    .column('proyecto_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`drop index if exists idx_conocimiento_embedding`.execute(db);
  await db.schema.dropIndex('idx_conocimiento_proyecto').ifExists().execute();
  await db.schema.dropIndex('idx_documento_proyecto').ifExists().execute();

  if (await hasVectorExtension(db)) {
    await sql`alter table conocimiento drop column if exists embedding`.execute(db);
  }

  await db.schema
    .alterTable('conocimiento')
    .dropColumn('tipo')
    .dropColumn('documento_id')
    .dropColumn('chunk_index')
    .execute();

  await db.schema.dropTable('documento').ifExists().execute();

  await db.schema
    .alterTable('conocimiento')
    .addUniqueConstraint('conocimiento_proyecto_uniq', ['proyecto_id'])
    .execute();

  // The extension itself is intentionally left installed.
}

/**
 * True when the PostgreSQL server can provide pgvector. PGlite (the default
 * migration-test database) cannot, so vector plumbing is skipped there.
 */
async function hasVectorExtension(db: Kysely<any>): Promise<boolean> {
  const rows = await sql<{
    available: number;
  }>`select 1 as available from pg_available_extensions where name = 'vector'`.execute(db);

  return rows.rows.length > 0;
}
