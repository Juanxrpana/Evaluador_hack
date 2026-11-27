/**
 * Port for turning an uploaded file into text for the knowledge pipeline.
 * PDFs are parsed locally; images are described by the vision model.
 */
export interface ExtraerInput {
  nombre: string;
  mime: string;
  bytes: Buffer;
}

export interface ExtractorContenido {
  extraer(input: ExtraerInput): Promise<string>;
}

export class ContenidoIlegibleError extends Error {
  constructor(mime: string) {
    super(`No readable text could be extracted from ${mime}`);
    this.name = 'ContenidoIlegibleError';
  }
}
