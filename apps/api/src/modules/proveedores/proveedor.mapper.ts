import type { Proveedor } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

export function toProveedor(row: Selectable<DB['proveedor']>): Proveedor {
  return {
    id: row.id,
    nombre: row.nombre,
    contacto: row.contacto,
    rif: row.rif,
    ubicacion: row.ubicacion,
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
