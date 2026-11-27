# Router

## Overview

Implementación del contrato oRPC. El router recibe servicios ya construidos, valida la sesión, traduce errores de dominio a `ORPCError` y no conoce Kysely ni transacciones.

## Interface

- `ApiContext` `{ session }`.
- `RouterDependencies` `{ users, proyectos, proveedores, propuestas, documentos, chat, notas, estatus, recargos, conocimiento }`.
- `createRouter(dependencies)`.
- Middleware `authenticated`: exige sesión y llama `setRequestActor`.
- `mapDomainError`: traduce errores de dominio a `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_CONTENT`, `TOO_MANY_REQUESTS` o `INTERNAL`.

## Invariants

- Toda ruta de dominio usa `authenticated`.
- Los handlers no abren transacciones ni ven el pool.
- Los errores no mapeados se registran y responden `INTERNAL` sin filtrar el cause.
- Las violaciones FK (`23503`/`23001`) se traducen a `CONFLICT`.
- `LlmError` con `rate_limited` responde 429; el resto de fallos de IA responde 500 genérico.

## Side Effects

- Ninguno propio; delega en los servicios y en la auditoría de request.

## Verification

- Run: `pnpm --filter @repo/api test`
