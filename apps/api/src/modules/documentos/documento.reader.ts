import type { Documento } from '@repo/contracts';

export interface DocumentoReader {
  listByProyecto(proyectoId: string): Promise<Documento[]>;
}

export interface CreateDocumentoInput {
  proyectoId: string;
  propuestaId?: string | null;
  proveedorId?: string | null;
  nombre: string;
  mime: string;
  bytes: Buffer;
  metadata?: Record<string, unknown>;
}
