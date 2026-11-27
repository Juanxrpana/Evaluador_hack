import type { Proyecto } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

/** The compiler-checked boundary between the generated row and the API type. */
export function toProyecto(row: Selectable<DB['proyecto']>): Proyecto {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
