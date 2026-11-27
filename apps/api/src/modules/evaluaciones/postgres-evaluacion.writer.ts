import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { InformeEvaluacion } from '@repo/contracts';
import type { EvaluacionWriter } from './evaluacion.port.ts';

export class PostgresEvaluacionWriter implements EvaluacionWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  crear(proyectoId: string): Promise<{ id: string }> {
    return this.#trx
      .insertInto('evaluacion')
      .values({ proyecto_id: proyectoId, estado: 'en_proceso' })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  }

  async finalizar(id: string, informe: InformeEvaluacion): Promise<void> {
    await this.#trx
      .updateTable('evaluacion')
      .set({
        estado: 'completada',
        informe: informe as never,
        fin: new Date(),
      })
      .where('id', '=', id)
      .execute();
  }

  async fallar(id: string, causa: string): Promise<void> {
    await this.#trx
      .updateTable('evaluacion')
      .set({ estado: 'fallida', fin: new Date(), informe: { error: causa } as never })
      .where('id', '=', id)
      .execute();
  }

  async agregarPaso(
    evaluacionId: string,
    orden: number,
    descripcion: string,
    detalle?: unknown,
  ): Promise<void> {
    await this.#trx
      .insertInto('evaluacion_paso')
      .values({
        evaluacion_id: evaluacionId,
        orden,
        descripcion,
        detalle: (detalle ?? null) as never,
      })
      .execute();
  }

  async registrarPropuesta(input: {
    evaluacionId: string;
    propuestaId: string;
    decision: 'valida' | 'descartada';
    causas: string[];
    costoReal: string | null;
    puntaje: number | null;
    notas: unknown;
  }): Promise<void> {
    await this.#trx
      .insertInto('evaluacion_propuesta')
      .values({
        evaluacion_id: input.evaluacionId,
        propuesta_id: input.propuestaId,
        decision: input.decision,
        // pg serializes plain arrays as Postgres array literals even in jsonb
        // columns: stringify explicitly to keep a JSON array.
        causas: JSON.stringify(input.causas) as never,
        costo_real: input.costoReal,
        puntaje: input.puntaje === null ? null : String(input.puntaje),
        notas: (input.notas ?? {}) as never,
      })
      .execute();
  }
}
