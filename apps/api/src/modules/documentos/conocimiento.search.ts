import type { ConocimientoTipo } from './conocimiento.writer.ts';

export interface ConocimientoCoincidencia {
  id: string;
  titulo: string | null;
  contenido: string;
  tipo: string;
  chunkIndex: number | null;
  distancia: number;
}

/**
 * Vector similarity search port. Implementations query pgvector directly
 * with raw SQL; results are always scoped to one proyecto so the chat never
 * mixes knowledge across projects.
 */
export interface ConocimientoSearch {
  buscar(input: {
    proyectoId: string;
    vector: number[];
    limite: number;
    tipo?: ConocimientoTipo | undefined;
  }): Promise<ConocimientoCoincidencia[]>;
}
