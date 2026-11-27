import { env } from '../../config/env.ts';
import { LlmError } from './llm.client.ts';
import type { LlmClient, LlmCompletion, LlmCompletionRequest, LlmErrorCode } from './llm.client.ts';

interface OpenRouterContentPart {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { filename: string; file_data: string };
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string | OpenRouterContentPart[] } }>;
  error?: { message?: string };
}

/**
 * OpenRouter adapter over the native fetch API. The OpenRouter API is
 * OpenAI-compatible: chat completions with multimodal content parts for
 * vision models. Every call is aborted after AI_TIMEOUT_MS and errors are
 * mapped to the safe LlmError taxonomy without leaking the API key.
 */
export class OpenRouterLlmClient implements LlmClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #model: string;
  readonly #visionModel: string;
  readonly #timeoutMs: number;

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    visionModel?: string;
    timeoutMs?: number;
  }) {
    this.#apiKey = options?.apiKey ?? env.OPENROUTER_API_KEY;
    this.#baseUrl = (options?.baseUrl ?? env.OPENROUTER_BASE_URL).replace(/\/$/, '');
    this.#model = options?.model ?? env.OPENROUTER_CHAT_MODEL;
    this.#visionModel = options?.visionModel ?? env.OPENROUTER_VISION_MODEL;
    this.#timeoutMs = options?.timeoutMs ?? env.AI_TIMEOUT_MS;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletion> {
    const multimodal =
      (request.images !== undefined && request.images.length > 0) ||
      (request.documents !== undefined && request.documents.length > 0);
    const model = multimodal ? this.#visionModel : this.#model;
    const response = await this.#post({
      model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: this.#userContent(request) },
      ],
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    });

    const text = response.choices?.[0]?.message?.content;
    const normalized = typeof text === 'string' ? text : null;

    if (normalized === null) {
      throw new LlmError('upstream', 502, 'OpenRouter returned an empty completion');
    }

    return { text: normalized, model };
  }

  #userContent(request: LlmCompletionRequest): string | OpenRouterContentPart[] {
    if (
      (!request.images || request.images.length === 0) &&
      (!request.documents || request.documents.length === 0)
    ) {
      return request.question;
    }

    const parts: OpenRouterContentPart[] = [{ type: 'text', text: request.question }];

    for (const documento of request.documents ?? []) {
      parts.push({
        type: 'file',
        file: {
          filename: documento.nombre,
          file_data: `data:${documento.mime};base64,${documento.base64}`,
        },
      });
    }

    for (const image of request.images ?? []) {
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${image.mime};base64,${image.base64}` },
      });
    }

    return parts;
  }

  async #post(body: unknown): Promise<OpenRouterResponse> {
    let response: Response;

    try {
      response = await fetch(`${this.#baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Evaluador',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (error) {
      throw this.#mapTransportError(error);
    }

    if (!response.ok) {
      await this.#mapHttpError(response);
    }

    return (await response.json()) as OpenRouterResponse;
  }

  #mapTransportError(error: unknown): LlmError {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new LlmError('timeout', 504, 'The AI provider did not answer in time');
    }

    return new LlmError('network', 502, 'Could not reach the AI provider');
  }

  async #mapHttpError(response: Response): Promise<never> {
    let code: LlmErrorCode = 'upstream';
    let status = 502;

    if (response.status === 401 || response.status === 403) {
      code = 'auth';
      status = 502;
    } else if (response.status === 429) {
      code = 'rate_limited';
      status = 429;
    }

    // Read the body for logging context but never echo credentials or raw
    // payloads into the error message.
    await response.text().catch(() => '');
    throw new LlmError(code, status, `AI provider request failed (${code})`);
  }
}
