import { sql, type Kysely } from 'kysely';

/**
 * Migrations are historical and intentionally untyped against the current
 * application schema.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('proyecto')
    .addColumn('id', 'bigserial', (column) => column.primaryKey())
    .addColumn('nombre', 'text', (column) => column.notNull())
    .addColumn('descripcion', 'text')
    .addColumn('metadata', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('proveedor')
    .addColumn('id', 'bigserial', (column) => column.primaryKey())
    .addColumn('nombre', 'text', (column) => column.notNull())
    .addColumn('contacto', 'text')
    .addColumn('metadata', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('propuesta')
    .addColumn('id', 'bigserial', (column) => column.primaryKey())
    .addColumn('proyecto_id', 'int8', (column) =>
      column.notNull().references('proyecto.id').onDelete('cascade'),
    )
    .addColumn('proveedor_id', 'int8', (column) =>
      column.notNull().references('proveedor.id').onDelete('restrict'),
    )
    .addColumn('monto', sql`numeric(14,2)`)
    .addColumn('documento', 'text')
    .addColumn('metadata', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('estatus')
    .addColumn('id', 'bigserial', (column) => column.primaryKey())
    .addColumn('proyecto_id', 'int8', (column) =>
      column.references('proyecto.id').onDelete('cascade'),
    )
    .addColumn('propuesta_id', 'int8', (column) =>
      column.references('propuesta.id').onDelete('cascade'),
    )
    .addColumn('estado', 'int2', (column) => column.notNull())
    .addColumn('comentario', 'text')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addCheckConstraint(
      'estatus_un_entorno',
      sql`((proyecto_id is not null and propuesta_id is null) or (proyecto_id is null and propuesta_id is not null))`,
    )
    .execute();

  await db.schema
    .createTable('recargos')
    .addColumn('id', 'bigserial', (column) => column.primaryKey())
    .addColumn('propuesta_id', 'int8', (column) =>
      column.notNull().references('propuesta.id').onDelete('cascade'),
    )
    .addColumn('concepto', 'text', (column) => column.notNull())
    .addColumn('monto', sql`numeric(14,2)`, (column) => column.notNull())
    .addColumn('metadata', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('nota')
    .addColumn('id', 'bigserial', (column) => column.primaryKey())
    .addColumn('propuesta_id', 'int8', (column) =>
      column.notNull().references('propuesta.id').onDelete('cascade'),
    )
    .addColumn('texto', 'text', (column) => column.notNull())
    .addColumn('metadata', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('conocimiento')
    .addColumn('id', 'bigserial', (column) => column.primaryKey())
    .addColumn('proyecto_id', 'int8', (column) =>
      column.notNull().references('proyecto.id').onDelete('cascade'),
    )
    .addColumn('titulo', 'text')
    .addColumn('contenido', 'text', (column) => column.notNull())
    .addColumn('metadata', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('conocimiento_proyecto_uniq', ['proyecto_id'])
    .execute();

  await db.schema
    .createIndex('idx_propuesta_proyecto')
    .on('propuesta')
    .column('proyecto_id')
    .execute();
  await db.schema
    .createIndex('idx_propuesta_proveedor')
    .on('propuesta')
    .column('proveedor_id')
    .execute();
  await db.schema.createIndex('idx_estatus_proyecto').on('estatus').column('proyecto_id').execute();
  await db.schema
    .createIndex('idx_estatus_propuesta')
    .on('estatus')
    .column('propuesta_id')
    .execute();
  await db.schema
    .createIndex('idx_recargos_propuesta')
    .on('recargos')
    .column('propuesta_id')
    .execute();
  await db.schema.createIndex('idx_nota_propuesta').on('nota').column('propuesta_id').execute();
  await sql`create index idx_conocimiento_metadata on conocimiento using gin (metadata)`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_conocimiento_metadata').ifExists().execute();
  await db.schema.dropIndex('idx_nota_propuesta').ifExists().execute();
  await db.schema.dropIndex('idx_recargos_propuesta').ifExists().execute();
  await db.schema.dropIndex('idx_estatus_propuesta').ifExists().execute();
  await db.schema.dropIndex('idx_estatus_proyecto').ifExists().execute();
  await db.schema.dropIndex('idx_propuesta_proveedor').ifExists().execute();
  await db.schema.dropIndex('idx_propuesta_proyecto').ifExists().execute();

  await db.schema.dropTable('conocimiento').ifExists().execute();
  await db.schema.dropTable('nota').ifExists().execute();
  await db.schema.dropTable('recargos').ifExists().execute();
  await db.schema.dropTable('estatus').ifExists().execute();
  await db.schema.dropTable('propuesta').ifExists().execute();
  await db.schema.dropTable('proveedor').ifExists().execute();
  await db.schema.dropTable('proyecto').ifExists().execute();
}
