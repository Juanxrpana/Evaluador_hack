import type { CreateEstatusInput } from './estatus.reader.ts';

export interface EstatusWriter {
  create(input: CreateEstatusInput): Promise<{ id: string }>;
  update(
    id: string,
    input: { estado?: number; comentario?: string | null | undefined },
  ): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}
