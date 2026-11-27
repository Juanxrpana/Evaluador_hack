import type { ProveedorHistorial } from '@repo/contracts';
import type { Proveedor } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toProveedor } from './proveedor.mapper.ts';
import type { ProveedorReader } from './proveedor.reader.ts';

interface PropuestaHistorialRow {
  propuestaId: string;
  proyectoId: string;
  proyectoNombre: string;
  monto: string | null;
  estado: number | null;
  createdAt: Date | string;
}

/**
 * Read adapter. `historial` is a cross-aggregate read: it derives the cost
 * relationship of one proveedor from every propuesta and recargo ever
 * recorded, across all proyectos. Reads may join; writes may not.
 */
export class PostgresProveedorReader implements ProveedorReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async list(): Promise<Proveedor[]> {
    const rows = await this.#db
      .selectFrom('proveedor')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(toProveedor);
  }

  async get(id: string): Promise<Proveedor | null> {
    const row = await this.#db
      .selectFrom('proveedor')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? toProveedor(row) : null;
  }

  async historial(id: string): Promise<ProveedorHistorial | null> {
    const proveedor = await this.get(id);

    if (!proveedor) {
      return null;
    }

    const propuestas = await this.#db
      .selectFrom('propuesta')
      .innerJoin('proyecto', 'proyecto.id', 'propuesta.proyecto_id')
      .leftJoin('estatus', 'estatus.propuesta_id', 'propuesta.id')
      .select([
        'propuesta.id as propuestaId',
        'propuesta.proyecto_id as proyectoId',
        'proyecto.nombre as proyectoNombre',
        'propuesta.monto as monto',
        'propuesta.created_at as createdAt',
        'estatus.estado as estado',
      ])
      .where('propuesta.proveedor_id', '=', id)
      .orderBy('propuesta.created_at', 'asc')
      .execute();

    const recargosPorPropuesta = new Map<string, number>();
    if (propuestas.length > 0) {
      const recargos = await this.#db
        .selectFrom('recargos')
        .select(['propuesta_id', 'monto'])
        .where(
          'propuesta_id',
          'in',
          propuestas.map((propuesta) => propuesta.propuestaId),
        )
        .execute();

      for (const recargo of recargos) {
        const actual = recargosPorPropuesta.get(recargo.propuesta_id) ?? 0;
        recargosPorPropuesta.set(recargo.propuesta_id, actual + Number(recargo.monto));
      }
    }

    const entradas = propuestas.map((propuesta) =>
      this.#toEntrada(propuesta, recargosPorPropuesta),
    );
    const montos = entradas
      .map((entrada) => (entrada.monto === null ? null : Number(entrada.monto)))
      .filter((monto): monto is number => monto !== null);

    return {
      proveedor,
      entradas,
      resumen: {
        totalPropuestas: entradas.length,
        montoPromedio: promedio(montos),
        montoMinimo: minimo(montos),
        montoMaximo: maximo(montos),
        ultimoMonto: montos.length > 0 ? aMonto(montos[montos.length - 1]) : null,
      },
    };
  }

  #toEntrada(
    propuesta: PropuestaHistorialRow,
    recargosPorPropuesta: Map<string, number>,
  ): ProveedorHistorial['entradas'][number] {
    const recargosTotal = recargosPorPropuesta.get(propuesta.propuestaId) ?? 0;

    return {
      propuestaId: propuesta.propuestaId,
      proyectoId: propuesta.proyectoId,
      proyectoNombre: propuesta.proyectoNombre,
      monto: propuesta.monto,
      recargosTotal: aMonto(recargosTotal),
      estado: propuesta.estado,
      createdAt: toIsoString(propuesta.createdAt),
    };
  }
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function aMonto(value: number): string {
  return value.toFixed(2);
}

function promedio(montos: number[]): string | null {
  if (montos.length === 0) {
    return null;
  }

  const total = montos.reduce((sum, monto) => sum + monto, 0);
  return aMonto(total / montos.length);
}

function minimo(montos: number[]): string | null {
  return montos.length > 0 ? aMonto(Math.min(...montos)) : null;
}

function maximo(montos: number[]): string | null {
  return montos.length > 0 ? aMonto(Math.max(...montos)) : null;
}
