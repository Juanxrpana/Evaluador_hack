import type { Kysely } from 'kysely';

/**
 * Percentage surcharges (B.2) carry no fixed amount: make `monto` nullable
 * so a recargo is either a fixed amount or a percentage over the base.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('recargos')
    .alterColumn('monto', (column) => column.dropNotNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.updateTable('recargos').set({ monto: '0.00' }).where('monto', 'is', null).execute();
  await db.schema
    .alterTable('recargos')
    .alterColumn('monto', (column) => column.setNotNull())
    .execute();
}
