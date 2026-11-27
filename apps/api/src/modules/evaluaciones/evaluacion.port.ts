import type {
  AlertaAntecedente,
  Evaluacion,
  EvaluacionDetalle,
  InformeEvaluacion,
} from '@repo/contracts';

export interface EvaluacionWriter {
  crear(proyectoId: string): Promise<{ id: string }>;
  /** Marks a run completed with its final report. */
  finalizar(id: string, informe: InformeEvaluacion): Promise<void>;
  /** Marks a run failed (kept for traceability). */
  fallar(id: string, causa: string): Promise<void>;
  agregarPaso(
    evaluacionId: string,
    orden: number,
    descripcion: string,
    detalle?: unknown,
  ): Promise<void>;
  registrarPropuesta(input: {
    evaluacionId: string;
    propuestaId: string;
    decision: 'valida' | 'descartada';
    causas: string[];
    costoReal: string | null;
    puntaje: number | null;
    notas: unknown;
  }): Promise<void>;
}

export interface EvaluacionReader {
  get(id: string): Promise<EvaluacionDetalle | null>;
  listByProyecto(proyectoId: string): Promise<Evaluacion[]>;
  /** Previous discard causes for one proveedor across other projects (E.3.c). */
  alertasProveedor(proveedorId: string): Promise<AlertaAntecedente[]>;
}

export type { InformeEvaluacion };
