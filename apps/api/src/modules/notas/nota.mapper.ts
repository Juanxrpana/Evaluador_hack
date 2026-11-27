import type { Nota } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

export function toNota(row: Selectable<DB['nota']>): Nota {
  return {
    id: row.id,
    propuestaId: row.propuesta_id,
    texto: row.texto,
    createdAt: toIsoString(row.created_at),
  };
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
