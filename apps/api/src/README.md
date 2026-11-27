# API `src`

## Overview

Composición del backend: `app.ts` monta Express + Better Auth + oRPC, `index.ts` es el composition root que construye la base, los clientes de IA, los servicios y arranca el servidor. El resto de carpetas son infraestructura y el dominio por módulos.

## Interface

- `app.ts`: `createApp(dependencies: AppDependencies)`, `AppDependencies`.
- `index.ts`: bootstrap de proceso (no exporta; ejecuta).
- Subdirectorios:
  - [auth](./auth/README.md): Better Auth sobre `users`, sesiones, cuentas.
  - [config](./config/README.md): entorno validado con Zod.
  - [db](./db/README.md): Kysely, transacciones, migraciones y tipos.
  - [modules](./modules/README.md): dominio por caso de uso.
  - [observability](./observability/README.md): IDs, logs, auditoría, rate limit.
  - [router](./router/README.md): contrato oRPC implementado.
  - [scripts](./scripts/README.md): generación de OpenAPI.
  - [shared](./shared/README.md): utilidades compartidas (`uuidv7`).

## Invariants

- oRPC se monta **antes** de `express.json()` porque consume el body crudo.
- Better Auth se monta antes del handler oRPC y antes de `express.json()`.
- La auditoría HTTP corre antes de los rate limiters para registrar escrituras rechazadas.
- `index.ts` verifica la base con `select 1` antes de escuchar; si falla, el proceso no arranca.
- Las migraciones no se ejecutan automáticamente desde la API.
- `SIGINT`/`SIGTERM` cierran el servidor y destruyen el pool.
- Ningún servicio abre transacciones fuera de su `TransactionRunner`.

## Side Effects

- Abre un pool PostgreSQL y un servidor HTTP en `PORT`.
- Crea clientes de IA (OpenRouter y embeddings locales) al arrancar.
- Emite logs JSON y filas de auditoría.

## Verification

- Run: `pnpm --filter @repo/api test`
