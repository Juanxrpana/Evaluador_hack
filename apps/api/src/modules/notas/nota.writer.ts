import type { CreateNotaInput } from './nota.reader.ts';

export interface NotaWriter {
  create(input: CreateNotaInput): Promise<{ id: string }>;
  update(id: string, input: { texto?: string }): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}
