import type { CreateProyectoInput, UpdateProyectoInput } from './proyecto.reader.ts';

export interface ProyectoWriter {
  create(input: CreateProyectoInput): Promise<{ id: string }>;
  update(id: string, input: UpdateProyectoInput): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}
