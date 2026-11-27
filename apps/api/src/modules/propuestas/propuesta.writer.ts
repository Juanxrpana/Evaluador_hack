import type { CreatePropuestaInput } from './propuesta.reader.ts';

export interface PropuestaWriter {
  create(input: CreatePropuestaInput): Promise<{ id: string }>;
}
