import type {
  AlertaAntecedente,
  Evaluacion,
  EvaluacionDetalle,
  EvaluacionPaso,
  InformeEvaluacion,
} from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toIsoString } from '../documentos/documento.mapper.ts';
import type { EvaluacionReader } from './evaluacion.port.ts';

export class PostgresEvaluacionReader implements EvaluacionReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async get(id: string): Promise<EvaluacionDetalle | null> {
    const evaluacion = await this.#db
      .selectFrom('evaluacion')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!evaluacion) {
      return null;
    }

    const pasos = await this.#db
      .selectFrom('evaluacion_paso')
      .selectAll()
      .where('evaluacion_id', '=', id)
      .orderBy('orden', 'asc')
      .execute();

    const propuestas = await this.#db
      .selectFrom('evaluacion_propuesta')
      .selectAll()
      .where('evaluacion_id', '=', id)
      .orderBy('decision', 'asc')
      .execute();

    const detalle: EvaluacionDetalle = {
      evaluacion: this.#toEvaluacion(evaluacion),
      pasos: pasos.map((paso) => this.#toPaso(paso)),
      propuestas: propuestas.map((fila) => ({
        id: fila.id,
        propuestaId: fila.propuesta_id,
        decision: fila.decision as 'valida' | 'descartada',
        causas: (fila.causas as string[]) ?? [],
        costoReal: fila.costo_real === null ? null : String(fila.costo_real),
        puntaje: fila.puntaje === null ? null : Number(fila.puntaje),
        notas: fila.notas,
      })),
      informe: (evaluacion.informe as InformeEvaluacion | null) ?? null,
    };

    return detalle;
  }

  async listByProyecto(proyectoId: string): Promise<Evaluacion[]> {
    const filas = await this.#db
      .selectFrom('evaluacion')
      .selectAll()
      .where('proyecto_id', '=', proyectoId)
      .orderBy('inicio', 'desc')
      .execute();

    return filas.map((fila) => this.#toEvaluacion(fila));
  }

  async alertasProveedor(proveedorId: string): Promise<AlertaAntecedente[]> {
    const filas = await this.#db
      .selectFrom('evaluacion_propuesta')
      .innerJoin('propuesta', 'propuesta.id', 'evaluacion_propuesta.propuesta_id')
      .innerJoin('evaluacion', 'evaluacion.id', 'evaluacion_propuesta.evaluacion_id')
      .innerJoin('proyecto', 'proyecto.id', 'evaluacion.proyecto_id')
      .select([
        'evaluacion_propuesta.causas',
        'evaluacion_propuesta.propuesta_id',
        'proyecto.nombre as proyectoNombre',
        'evaluacion.inicio',
      ])
      .where('propuesta.proveedor_id', '=', proveedorId)
      .where('evaluacion_propuesta.decision', '=', 'descartada')
      .orderBy('evaluacion.inicio', 'desc')
      .limit(10)
      .execute();

    return filas.map((fila) => ({
      nivel: 'descarte' as const,
      mensaje: `Propuesta descartada en el proyecto "${fila.proyectoNombre}" (${toIsoString(fila.inicio).slice(0, 10)}): ${((fila.causas as string[]) ?? []).join('; ') || 'sin causas registradas'}`,
      referencia: fila.propuesta_id,
    }));
  }

  #toEvaluacion(fila: {
    id: string;
    proyecto_id: string;
    estado: string;
    inicio: Date | string;
    fin: Date | string | null;
  }): Evaluacion {
    return {
      id: fila.id,
      proyectoId: fila.proyecto_id,
      estado: fila.estado as Evaluacion['estado'],
      inicio: toIsoString(fila.inicio),
      fin: fila.fin === null ? null : toIsoString(fila.fin),
    };
  }

  #toPaso(fila: {
    id: string;
    orden: number;
    descripcion: string;
    detalle: unknown;
    created_at: Date | string;
  }): EvaluacionPaso {
    return {
      id: fila.id,
      orden: fila.orden,
      descripcion: fila.descripcion,
      detalle: fila.detalle ?? null,
      createdAt: toIsoString(fila.created_at),
    };
  }
}
