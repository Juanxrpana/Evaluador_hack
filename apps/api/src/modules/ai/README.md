# AI (embeddings y LLM)

## Overview

Puertos y adaptadores de IA. El dominio depende de las interfaces `EmbeddingClient` y `LlmClient`, no de un proveedor concreto. Hay dos adaptadores reales: embeddings locales con `bge-m3` (ONNX/transformers.js) y generación de texto vía OpenRouter (API OpenAI-compatible).

## Interface

- `EMBEDDING_DIMENSIONS` = `1024`.
- `EmbeddingClient`: `embed(texts: string[]): Promise<number[][]>`.
- `toPgVectorText(values: number[]): string`: serializa a literal pgvector `[x,y,...]`; lanza si la dimensión no es 1024.
- `LlmImage` `{ mime, base64 }`, `LlmCompletionRequest` `{ system, question, images?, maxTokens?, temperature? }`, `LlmCompletion` `{ text, model }`.
- `LlmErrorCode` (`auth` | `rate_limited` | `upstream` | `timeout` | `network`), `LlmError` (`code`, `status`), `LlmClient.complete(request)`.
- `LocalBgeM3EmbeddingClient(options?: { model?, cacheDir?, maxChars? })`.
- `OpenRouterLlmClient(options?: { apiKey?, baseUrl?, model?, visionModel?, timeoutMs? })`.

## Invariants

- Todo vector de embeddings tiene exactamente 1024 dimensiones; `toPgVectorText` lo verifica.
- `LocalBgeM3EmbeddingClient` serializa las llamadas a través de una cola interna: una sola sesión ONNX atiende una petición a la vez.
- El modelo local se descarga una vez en `EMBEDDING_CACHE_DIR`; `allowLocalModels` es `false`.
- `OpenRouterLlmClient` elige el modelo de visión solo cuando `request.images` no está vacío.
- Los errores de LLM nunca incluyen la API key ni el cuerpo crudo del proveedor.
- Cada llamada HTTP se aborta tras `AI_TIMEOUT_MS`.

## Side Effects

- Red: `POST {OPENROUTER_BASE_URL}/chat/completions` (texto o visión).
- Disco: descarga y caché del modelo ONNX en `EMBEDDING_CACHE_DIR`.
- CPU: inferencia ONNX local para embeddings.

## Verification

- Run: `pnpm --filter @repo/api test`
