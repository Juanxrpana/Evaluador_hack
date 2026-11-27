import type { CreateProyectoInput } from './proyecto.reader.ts';

export interface ProyectoWriter {
  create(input: CreateProyectoInput): Promise<{ id: string }>;
}
