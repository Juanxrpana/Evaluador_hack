import type { Nota } from '@repo/contracts';

export interface NotaReader {
  get(id: string): Promise<Nota | null>;
  listByPropuesta(propuestaId: string): Promise<Nota[]>;
}

export interface CreateNotaInput {
  propuestaId: string;
  texto: string;
}

export interface UpdateNotaInput {
  texto?: string;
}
