import { sql, type Kysely } from 'kysely';

const etapas = [
  [1, 'Recepción', 'recepcion'],
  [2, 'Evaluación', 'evaluacion'],
  [3, 'Revisión del comité', 'revision-comite'],
  [4, 'Adjudicado', 'adjudicado'],
  [5, 'Cerrado', 'cerrado'],
] as const;

/**
 * Migrations are historical and intentionally untyped against the current
 * application schema. This one adds everything the evaluator engine needs:
 *
 * - proyecto: documento base context (ubicacion, presupuesto_referencial),
 * - proveedor: fiscal identity (rif) and location,
 * - propuesta/recargos: currency (moneda) and percentage surcharges,
 * - documento: `tipo` (propuesta | requerimientos) for the base document,
 * - propuesta_item: extracted line items for arithmetic verification,
 * - mercado_cache / tasa_bcv: market research and BCV rate caches,
 * - proceso_etapa: the named stage catalog (E.1.b) + estatus.etapa_id,
 * - evaluacion / evaluacion_paso / evaluacion_propuesta: agent runs with
 *   traceability (D.3) and the per-proposal verdicts (D.4),
 * - new permission `evaluacion.lanzar` granted to supervisor/superadmin.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('proyecto')
    .addColumn('ubicacion', 'text')
    .addColumn('presupuesto_referencial', sql`numeric(14,2)`)
    .execute();

  await db.schema
    .alterTable('proveedor')
    .addColumn('rif', 'text')
    .addColumn('ubicacion', 'text')
    .execute();

  await db.schema.alterTable('propuesta').addColumn('moneda', 'text').execute();
  await db.schema
    .alterTable('recargos')
    .addColumn('porcentaje', sql`numeric(7,2)`)
    .addColumn('moneda', 'text')
    .execute();
  await db.schema
    .alterTable('documento')
    .addColumn('tipo', 'text', (column) => column.notNull().defaultTo('propuesta'))
    .execute();

  await db.schema
    .createTable('propuesta_item')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('propuesta_id', 'uuid', (column) =>
      column.notNull().references('propuesta.id').onDelete('cascade'),
    )
    .addColumn('linea', 'int2', (column) => column.notNull())
    .addColumn('nombre', 'text', (column) => column.notNull())
    .addColumn('cantidad', sql`numeric(14,2)`, (column) => column.notNull())
    .addColumn('precio_unitario', sql`numeric(14,2)`, (column) => column.notNull())
    .addColumn('moneda', 'text')
    .execute();
  await db.schema
    .createIndex('idx_propuesta_item_propuesta')
    .on('propuesta_item')
    .column('propuesta_id')
    .execute();

  await db.schema
    .createTable('mercado_cache')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('termino', 'text', (column) => column.notNull().unique())
    .addColumn('resultado', 'jsonb', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('tasa_bcv')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('fecha', 'date', (column) => column.notNull().unique())
    .addColumn('tasa', sql`numeric(14,4)`, (column) => column.notNull())
    .addColumn('fuente', 'text', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('proceso_etapa')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('orden', 'int2', (column) => column.notNull().unique())
    .addColumn('nombre', 'text', (column) => column.notNull())
    .addColumn('slug', 'text', (column) => column.notNull().unique())
    .execute();
  await db
    .insertInto('proceso_etapa')
    .values(etapas.map(([orden, nombre, slug]) => ({ orden, nombre, slug })))
    .execute();

  await db.schema
    .alterTable('estatus')
    .addColumn('etapa_id', 'uuid', (column) =>
      column.references('proceso_etapa.id').onDelete('set null'),
    )
    .execute();

  await db.schema
    .createTable('evaluacion')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('proyecto_id', 'uuid', (column) =>
      column.notNull().references('proyecto.id').onDelete('cascade'),
    )
    .addColumn('estado', 'text', (column) => column.notNull().defaultTo('en_proceso'))
    .addColumn('informe', 'jsonb')
    .addColumn('inicio', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('fin', 'timestamptz')
    .execute();
  await db.schema
    .createIndex('idx_evaluacion_proyecto')
    .on('evaluacion')
    .column('proyecto_id')
    .execute();

  await db.schema
    .createTable('evaluacion_paso')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('evaluacion_id', 'uuid', (column) =>
      column.notNull().references('evaluacion.id').onDelete('cascade'),
    )
    .addColumn('orden', 'int2', (column) => column.notNull())
    .addColumn('descripcion', 'text', (column) => column.notNull())
    .addColumn('detalle', 'jsonb')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema
    .createIndex('idx_evaluacion_paso')
    .on('evaluacion_paso')
    .column('evaluacion_id')
    .execute();

  await db.schema
    .createTable('evaluacion_propuesta')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('evaluacion_id', 'uuid', (column) =>
      column.notNull().references('evaluacion.id').onDelete('cascade'),
    )
    .addColumn('propuesta_id', 'uuid', (column) =>
      column.notNull().references('propuesta.id').onDelete('cascade'),
    )
    .addColumn('decision', 'text', (column) => column.notNull())
    .addColumn('causas', 'jsonb', (column) => column.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn('costo_real', sql`numeric(14,2)`)
    .addColumn('puntaje', sql`numeric(5,2)`)
    .addColumn('notas', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .execute();
  await db.schema
    .createIndex('idx_evaluacion_propuesta')
    .on('evaluacion_propuesta')
    .column('evaluacion_id')
    .execute();

  await db
    .insertInto('permiso')
    .values({
      codigo: 'evaluacion.lanzar',
      descripcion: 'Lanzar la evaluación automática de propuestas',
    })
    .execute();

  const permisoDb = (await db
    .selectFrom('permiso')
    .select(['id'])
    .where('codigo', '=', 'evaluacion.lanzar')
    .executeTakeFirstOrThrow()) as { id: string };
  const rolesDb = (await db
    .selectFrom('rol')
    .select(['id', 'nombre'])
    .where('nombre', 'in', ['supervisor', 'superadmin'])
    .execute()) as Array<{ id: string }>;

  await db
    .insertInto('rol_permiso')
    .values(rolesDb.map((rol) => ({ rol_id: rol.id, permiso_id: permisoDb.id })))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_evaluacion_propuesta').ifExists().execute();
  await db.schema.dropIndex('idx_evaluacion_paso').ifExists().execute();
  await db.schema.dropIndex('idx_evaluacion_proyecto').ifExists().execute();
  await db.schema.dropTable('evaluacion_propuesta').ifExists().execute();
  await db.schema.dropTable('evaluacion_paso').ifExists().execute();
  await db.schema.dropTable('evaluacion').ifExists().execute();

  await db.schema.alterTable('estatus').dropColumn('etapa_id').execute();
  await db.schema.dropTable('proceso_etapa').ifExists().execute();
  await db.schema.dropTable('tasa_bcv').ifExists().execute();
  await db.schema.dropTable('mercado_cache').ifExists().execute();
  await db.schema.dropIndex('idx_propuesta_item_propuesta').ifExists().execute();
  await db.schema.dropTable('propuesta_item').ifExists().execute();
  await db.schema.alterTable('documento').dropColumn('tipo').execute();
  await db.schema.alterTable('recargos').dropColumn('moneda').dropColumn('porcentaje').execute();
  await db.schema.alterTable('propuesta').dropColumn('moneda').execute();
  await db.schema.alterTable('proveedor').dropColumn('ubicacion').dropColumn('rif').execute();
  await db.schema
    .alterTable('proyecto')
    .dropColumn('presupuesto_referencial')
    .dropColumn('ubicacion')
    .execute();

  await db
    .deleteFrom('rol_permiso')
    .where('permiso_id', 'in', (eb: any) =>
      eb.selectFrom('permiso').select('id').where('codigo', '=', 'evaluacion.lanzar'),
    )
    .execute();
  await db.deleteFrom('permiso').where('codigo', '=', 'evaluacion.lanzar').execute();
}
