import type { CreatePropuestaInput, UpdatePropuestaInput } from './propuesta.reader.ts';

export interface PropuestaWriter {
  create(input: CreatePropuestaInput): Promise<{ id: string }>;
  update(id: string, input: UpdatePropuestaInput): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}
