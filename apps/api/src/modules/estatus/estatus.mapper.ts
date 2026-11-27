import type { Estatus } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

export function toEstatus(row: Selectable<DB['estatus']>): Estatus {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    propuestaId: row.propuesta_id,
    estado: row.estado,
    comentario: row.comentario,
    createdAt: toIsoString(row.created_at),
  };
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
