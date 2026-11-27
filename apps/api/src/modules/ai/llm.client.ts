/**
 * Port for text generation. The service layer depends on this interface, not
 * on OpenRouter, so the provider is replaceable and tests use fakes.
 */
export interface LlmImage {
  mime: string;
  base64: string;
}

/** Native document (e.g. PDF) sent to a multimodal model that accepts files. */
export interface LlmDocumento {
  nombre: string;
  mime: string;
  base64: string;
}

export interface LlmCompletionRequest {
  system: string;
  question: string;
  /** Optional images (PNG/JPEG) sent to a vision-capable model. */
  images?: LlmImage[];
  /** Optional native documents (PDF) for models with file input support. */
  documents?: LlmDocumento[];
  maxTokens?: number;
  temperature?: number;
}

export interface LlmCompletion {
  text: string;
  model: string;
}

export type LlmErrorCode = 'auth' | 'rate_limited' | 'upstream' | 'timeout' | 'network';

/**
 * Safe error type for LLM failures. It never carries the API key or raw
 * upstream bodies; the API key is deliberately excluded from messages.
 */
export class LlmError extends Error {
  readonly code: LlmErrorCode;
  readonly status: number;

  constructor(code: LlmErrorCode, status: number, message: string) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
    this.status = status;
  }
}

export interface LlmClient {
  complete(request: LlmCompletionRequest): Promise<LlmCompletion>;
}
