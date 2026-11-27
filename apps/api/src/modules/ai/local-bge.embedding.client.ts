import path from 'node:path';
import { env } from '../../config/env.ts';
import { EMBEDDING_DIMENSIONS, type EmbeddingClient } from './embedding.client.ts';

interface EmbeddingOutput {
  dims: number[];
  tolist(): number[][];
}

type Extractor = (
  input: string[],
  options: { pooling: 'cls'; normalize: boolean; truncation?: boolean },
) => Promise<EmbeddingOutput>;

/**
 * Local bge-m3 embeddings via transformers.js (ONNX, CPU). The quantized
 * Xenova/bge-m3 model produces 1024-dimension vectors and downloads once
 * into EMBEDDING_CACHE_DIR. Calls are serialized: one ONNX session serves
 * them sequentially so concurrent requests cannot interleave on the same
 * pipeline.
 */
export class LocalBgeM3EmbeddingClient implements EmbeddingClient {
  readonly #model: string;
  readonly #cacheDir: string;
  readonly #maxChars: number;
  #pipeline: Extractor | null = null;
  #loading: Promise<Extractor> | null = null;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(options?: { model?: string; cacheDir?: string; maxChars?: number }) {
    this.#model = options?.model ?? env.EMBEDDING_MODEL;
    this.#cacheDir = path.resolve(options?.cacheDir ?? env.EMBEDDING_CACHE_DIR);
    this.#maxChars = options?.maxChars ?? env.EMBEDDING_MAX_CHARS;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const run = async (): Promise<number[][]> => {
      const extractor = await this.#getPipeline();
      const truncated = texts.map((text) => text.slice(0, this.#maxChars));
      const output = await extractor(truncated, {
        pooling: 'cls',
        normalize: true,
        truncation: true,
      });
      const matrix = output.tolist();

      if (matrix.length !== texts.length) {
        throw new Error('Embedding pipeline returned an unexpected shape');
      }

      return matrix.map((vector) =>
        Array.from(vector, (value) => (typeof value === 'number' ? value : Number(value))),
      );
    };

    const result = this.#queue.then(run, run);
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #getPipeline(): Promise<Extractor> {
    if (this.#pipeline) {
      return this.#pipeline;
    }

    if (!this.#loading) {
      this.#loading = this.#load();
    }

    return this.#loading;
  }

  async #load(): Promise<Extractor> {
    const transformers = await import('@huggingface/transformers');
    transformers.env.cacheDir = this.#cacheDir;
    transformers.env.allowLocalModels = false;

    const extractor = await transformers.pipeline('feature-extraction', this.#model, {
      dtype: 'q8',
    });

    const wrapped = extractor as unknown as Extractor;

    const check = await wrapped(['dimension-check'], { pooling: 'cls', normalize: true });
    const dims = check.dims[check.dims.length - 1];
    if (dims !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding model produced ${dims} dimensions, expected ${EMBEDDING_DIMENSIONS}`,
      );
    }

    this.#pipeline = wrapped;
    return wrapped;
  }
}
