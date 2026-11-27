import type { Estatus } from '@repo/contracts';
import type { EstatusReader } from '../estatus/estatus.reader.ts';
import type { EstatusTransactionRunner } from '../estatus/estatus.transaction.ts';
import type { ProveedorReader } from '../proveedores/proveedor.reader.ts';
import type { PropuestaReader } from './propuesta.reader.ts';

export interface EntradaDecisionFinal {
  id: string;
  decision: 'adjudicada' | 'rechazada';
  comentario?: string | undefined;
}

/** Who may record which decision (E.2.c). */
const PERMISOS_DECISION = {
  adjudicada: 'propuesta.aprobar',
  rechazada: 'propuesta.rechazar',
} as const;

/**
 * E.2.c: the human final decision. A role with propuesta.aprobar confirms an
 * award or with propuesta.rechazar rejects the AI recommendation; the result
 * lands in the process history as an estatus row, durably audited.
 */
export class DecisionFinalService {
  readonly #propuestas: PropuestaReader;
  readonly #proveedores: ProveedorReader;
  readonly #estatusReader: EstatusReader;
  readonly #runInTransaction: EstatusTransactionRunner;

  constructor(
    propuestas: PropuestaReader,
    proveedores: ProveedorReader,
    estatusReader: EstatusReader,
    runInTransaction: EstatusTransactionRunner,
  ) {
    this.#propuestas = propuestas;
    this.#proveedores = proveedores;
    this.#estatusReader = estatusReader;
    this.#runInTransaction = runInTransaction;
  }

  async registrar(
    input: EntradaDecisionFinal,
    usuarioId: string,
    permisosDe: (usuarioId: string) => Promise<Set<string>>,
  ): Promise<Estatus> {
    const permisos = await permisosDe(usuarioId);
    const requerido = PERMISOS_DECISION[input.decision];

    if (!permisos.has(requerido)) {
      const error = new Error(`Requiere el permiso ${requerido}`);
      error.name = 'PermisoFaltanteError';
      throw error;
    }

    const propuesta = await this.#propuestas.get(input.id);

    if (!propuesta) {
      const error = new Error(`Propuesta ${input.id} not found`);
      error.name = 'PropuestaNoEncontradaError';
      throw error;
    }

    const proveedor = await this.#proveedores.get(propuesta.proveedorId);

    await this.#runInTransaction(async ({ estatus, audit }) => {
      await estatus.create({
        propuestaId: input.id,
        estado: input.decision === 'adjudicada' ? 1 : 2,
        comentario:
          input.comentario ??
          `${input.decision} de la propuesta de ${proveedor?.nombre ?? 'proveedor'} registrada por el comité`,
      });

      await audit.record({
        action: `propuesta.${input.decision}`,
        resource: 'propuesta',
        resourceId: input.id,
      });
    });

    const registrados = await this.#estatusReader.listByPropuesta(input.id);
    const ultimo = registrados[0];

    if (!ultimo) {
      const error = new Error('No se pudo leer el estatus registrado');
      error.name = 'EstatusNoEncontradoError';
      throw error;
    }

    return ultimo;
  }
}
