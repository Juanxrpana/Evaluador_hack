import type { Documento } from '@repo/contracts';

export interface DocumentoReader {
  listByProyecto(proyectoId: string): Promise<Documento[]>;
}

export type TipoDocumento = 'propuesta' | 'requerimientos';

export interface CreateDocumentoInput {
  proyectoId: string;
  propuestaId?: string | null;
  proveedorId?: string | null;
  nombre: string;
  mime: string;
  tipo: TipoDocumento;
  bytes: Buffer;
  metadata?: Record<string, unknown>;
}
