/**
 * Port for local embeddings. The knowledge pipeline chunks text and embeds
 * it with bge-m3 (1024 dimensions) before storing it in `conocimiento`.
 */
export const EMBEDDING_DIMENSIONS = 1024;

export interface EmbeddingClient {
  embed(texts: string[]): Promise<number[][]>;
}

/** Formats a float vector as the pgvector text literal, e.g. `[1.5,-0.25]`. */
export function toPgVectorText(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${values.length}`);
  }

  return `[${values.map((value) => value.toString()).join(',')}]`;
}
