import type { PropuestaItem } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

export function toPropuestaItem(row: Selectable<DB['propuesta_item']>): PropuestaItem {
  return {
    id: row.id,
    propuestaId: row.propuesta_id,
    linea: row.linea,
    nombre: row.nombre,
    cantidad: row.cantidad,
    precioUnitario: row.precio_unitario,
    moneda: row.moneda,
  };
}
