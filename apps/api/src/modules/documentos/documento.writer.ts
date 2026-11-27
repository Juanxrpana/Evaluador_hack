import type { CreateDocumentoInput } from './documento.reader.ts';

export interface DocumentoWriter {
  create(input: CreateDocumentoInput): Promise<{ id: string }>;
  remove(id: string): Promise<boolean>;
}
