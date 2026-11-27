import type { Proyecto } from '@repo/contracts';

export interface ProyectoReader {
  list(): Promise<Proyecto[]>;
  get(id: string): Promise<Proyecto | null>;
}

export interface CreateProyectoInput {
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  presupuestoReferencial?: string;
}

export interface UpdateProyectoInput {
  nombre?: string;
  descripcion?: string | null | undefined;
  ubicacion?: string | null | undefined;
  presupuestoReferencial?: string | null | undefined;
}
