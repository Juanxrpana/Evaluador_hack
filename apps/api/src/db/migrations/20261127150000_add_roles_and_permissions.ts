import { sql, type Kysely } from 'kysely';

const roles = [
  ['gestor', 'Gestor: crea y administra proyectos y sus requerimientos'],
  ['proyectista', 'Proyectista: elabora propuestas, notas y recargos de los proyectos'],
  ['supervisor', 'Supervisor: revisa y aprueba propuestas y gestiona el conocimiento'],
  ['superadmin', 'Superadministrador: acceso total y administración de roles y permisos'],
] as const;

const permisos = [
  ['proyecto.ver', 'Ver proyectos'],
  ['proyecto.crear', 'Crear proyectos'],
  ['proyecto.editar', 'Editar proyectos'],
  ['proyecto.eliminar', 'Eliminar proyectos'],
  ['propuesta.ver', 'Ver propuestas'],
  ['propuesta.crear', 'Crear propuestas'],
  ['propuesta.editar', 'Editar propuestas'],
  ['propuesta.aprobar', 'Aprobar propuestas'],
  ['propuesta.rechazar', 'Rechazar propuestas'],
  ['recargo.crear', 'Registrar recargos'],
  ['nota.crear', 'Registrar notas'],
  ['conocimiento.ver', 'Ver base de conocimiento'],
  ['conocimiento.crear', 'Añadir conocimiento'],
  ['conocimiento.editar', 'Editar conocimiento'],
  ['usuario.ver', 'Ver usuarios'],
  ['usuario.asignar_rol', 'Asignar roles y permisos'],
] as const;

const rolPermisos: Record<(typeof roles)[number][0], string[]> = {
  gestor: [
    'proyecto.ver',
    'proyecto.crear',
    'proyecto.editar',
    'propuesta.ver',
    'conocimiento.ver',
  ],
  proyectista: [
    'proyecto.ver',
    'propuesta.ver',
    'propuesta.crear',
    'propuesta.editar',
    'recargo.crear',
    'nota.crear',
    'conocimiento.ver',
  ],
  supervisor: [
    'proyecto.ver',
    'propuesta.ver',
    'propuesta.aprobar',
    'propuesta.rechazar',
    'recargo.crear',
    'conocimiento.ver',
    'conocimiento.crear',
    'conocimiento.editar',
    'usuario.ver',
  ],
  superadmin: permisos.map(([codigo]) => codigo),
};

/**
 * Migrations are historical and intentionally untyped against the current
 * application schema.
 *
 * Identifiers are UUID v7 (time-ordered); see the core domain migration.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('rol')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('nombre', 'text', (column) => column.notNull().unique())
    .addColumn('descripcion', 'text')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('permiso')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn('codigo', 'text', (column) => column.notNull().unique())
    .addColumn('descripcion', 'text')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('rol_permiso')
    .addColumn('rol_id', 'uuid', (column) =>
      column.notNull().references('rol.id').onDelete('cascade'),
    )
    .addColumn('permiso_id', 'uuid', (column) =>
      column.notNull().references('permiso.id').onDelete('cascade'),
    )
    .addPrimaryKeyConstraint('rol_permiso_pkey', ['rol_id', 'permiso_id'])
    .execute();

  await db.schema
    .alterTable('users')
    .addColumn('rol_id', 'uuid', (column) => column.references('rol.id').onDelete('set null'))
    .execute();
  await db.schema.createIndex('idx_users_rol').on('users').column('rol_id').execute();

  await db
    .insertInto('rol')
    .values(roles.map(([nombre, descripcion]) => ({ nombre, descripcion })))
    .execute();
  await db
    .insertInto('permiso')
    .values(permisos.map(([codigo, descripcion]) => ({ codigo, descripcion })))
    .execute();

  const rolesDb = (await db.selectFrom('rol').select(['id', 'nombre']).execute()) as Array<{
    id: string;
    nombre: string;
  }>;
  const permisosDb = (await db.selectFrom('permiso').select(['id', 'codigo']).execute()) as Array<{
    id: string;
    codigo: string;
  }>;

  const rolIdPorNombre = new Map(rolesDb.map((row) => [row.nombre, row.id]));
  const permisoIdPorCodigo = new Map(permisosDb.map((row) => [row.codigo, row.id]));

  const filas = Object.entries(rolPermisos).flatMap(([rolNombre, codigos]) =>
    codigos.map((codigo) => ({
      rol_id: rolIdPorNombre.get(rolNombre)!,
      permiso_id: permisoIdPorCodigo.get(codigo)!,
    })),
  );
  await db.insertInto('rol_permiso').values(filas).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_users_rol').ifExists().execute();
  await db.schema.dropTable('rol_permiso').ifExists().execute();
  await db.schema.alterTable('users').dropColumn('rol_id').execute();
  await db.schema.dropTable('permiso').ifExists().execute();
  await db.schema.dropTable('rol').ifExists().execute();
}
