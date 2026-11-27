import type { Estatus } from '@repo/contracts';

export interface EstatusReader {
  get(id: string): Promise<Estatus | null>;
  listByProyecto(proyectoId: string): Promise<Estatus[]>;
  listByPropuesta(propuestaId: string): Promise<Estatus[]>;
}

export interface CreateEstatusInput {
  proyectoId?: string | undefined;
  propuestaId?: string | undefined;
  estado: number;
  comentario?: string;
}

export interface UpdateEstatusInput {
  estado?: number;
  comentario?: string | null | undefined;
}
