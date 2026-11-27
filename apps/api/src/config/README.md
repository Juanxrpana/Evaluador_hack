# Config

## Overview

Entorno del proceso validado con Zod al importar el módulo. Un valor faltante o inválido aborta el arranque antes de tocar la red o la base.

## Interface

- `env`: objeto parseado con `envSchema.parse(process.env)`.
- `Env`: tipo inferido.
- `trustProxySchema`: transforma `true`/`false`/número/CIDR para `TRUST_PROXY`.

## Invariants

- `DATABASE_URL` y `BETTER_AUTH_SECRET` (mínimo 32 caracteres) son obligatorios.
- `OPENROUTER_API_KEY` es obligatorio para chat/visión.
- Los modelos y límites tienen defaults: `OPENROUTER_CHAT_MODEL`, `OPENROUTER_VISION_MODEL`, `EMBEDDING_MODEL` (`Xenova/bge-m3`), `EMBEDDING_CACHE_DIR`, `DOCUMENT_MAX_BYTES` (15 MiB), `AI_TIMEOUT_MS` (120 s).
- `TRUST_PROXY` debe coincidir con la topología; `true` es inseguro si el cliente alcanza la API directamente.

## Side Effects

- Ninguno; solo lectura de `process.env` en el arranque.

## Verification

- Run: `pnpm --filter @repo/api test`
