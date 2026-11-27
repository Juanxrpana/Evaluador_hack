# API

## Overview

Backend Express 5 + oRPC + PostgreSQL/Kysely. Implementa el contrato compartido, la autenticación Better Auth, el pipeline documental con IA y la consulta vectorizada.

## Subdirectories & Boundaries

- [src](./src/README.md): aplicación, composición y dominio.
- `test/`: pruebas (migraciones, HTTP, servicios). Es código de prueba; no expone contrato propio.

## Global Invariants

- `src/index.ts` es el composition root; verifica la base antes de escuchar.
- Las migraciones son un paso de despliegue, nunca automáticas.
- Los scripts `db:*` operan sobre `DATABASE_URL`; `db:types` usa PGlite y no requiere servidor.
- `OPENROUTER_API_KEY` es obligatorio para chat/visión; los embeddings son locales.

## Verification

- Run: `pnpm --filter @repo/api test`
- Typecheck: `pnpm --filter @repo/api typecheck`
