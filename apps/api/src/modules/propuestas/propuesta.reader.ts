import type { Propuesta } from '@repo/contracts';

export interface PropuestaReader {
  get(id: string): Promise<Propuesta | null>;
  listByProyecto(proyectoId: string): Promise<Propuesta[]>;
}

export interface CreatePropuestaInput {
  proyectoId: string;
  proveedorId: string;
  monto?: string;
  moneda?: string;
}

export interface UpdatePropuestaInput {
  monto?: string | null | undefined;
  moneda?: string | null | undefined;
}
