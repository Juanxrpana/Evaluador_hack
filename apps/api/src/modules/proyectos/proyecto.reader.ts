import type { Proyecto } from '@repo/contracts';

export interface ProyectoReader {
  list(): Promise<Proyecto[]>;
  get(id: string): Promise<Proyecto | null>;
}

export interface CreateProyectoInput {
  nombre: string;
  descripcion?: string;
}
