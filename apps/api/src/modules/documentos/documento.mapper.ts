import type { Documento } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

export function toDocumento(row: Selectable<DB['documento']>): Documento {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    propuestaId: row.propuesta_id,
    proveedorId: row.proveedor_id,
    nombre: row.nombre,
    mime: row.mime,
    tipo: row.tipo as Documento['tipo'],
    tamanoBytes: Number(row.tamano_bytes),
    createdAt: toIsoString(row.created_at),
  };
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
