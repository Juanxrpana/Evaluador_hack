import type { ConocimientoChunk } from './chunker.ts';

export type ConocimientoTipo = 'documento' | 'proveedor_historial';

export interface ConocimientoInsercion {
  proyectoId: string;
  tipo: ConocimientoTipo;
  titulo: string | null;
  chunks: ConocimientoChunk[];
  embeddings: number[][];
  documentoId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConocimientoWriter {
  /** Inserts chunks with their bge-m3 embeddings. Vectors go as raw SQL. */
  insertConEmbeddings(insercion: ConocimientoInsercion): Promise<number>;
  /** Deletes stale supplier-history chunks for one proveedor in one proyecto. */
  deleteProveedorHistorial(proyectoId: string, proveedorId: string): Promise<void>;
}
