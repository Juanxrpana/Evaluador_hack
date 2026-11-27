import type { Recargo } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

export function toRecargo(row: Selectable<DB['recargos']>): Recargo {
  return {
    id: row.id,
    propuestaId: row.propuesta_id,
    concepto: row.concepto,
    monto: row.monto,
    createdAt: toIsoString(row.created_at),
  };
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
