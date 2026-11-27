import type { Propuesta } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

export function toPropuesta(row: Selectable<DB['propuesta']>): Propuesta {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    proveedorId: row.proveedor_id,
    monto: row.monto,
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
