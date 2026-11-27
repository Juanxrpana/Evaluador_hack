# Observability

## Overview

Correlación, logging estructurado, auditoría y rate limiting. El pipeline HTTP garantiza que toda petición tenga IDs antes de escribir cualquier log.

## Interface

- `requestId`: `X-Request-Id` válido o UUID; reutiliza `traceparent` válido.
- `httpLogger`: un log de acceso por petición; ignora `/healthz` y preflight CORS; 5xx → `error`, 429 → `warn`.
- `requestContext`: `AsyncLocalStorage` con `{ requestId, traceId, method, path, ip, userAgent, actorId, log }`; `getRequestContext`, `getRequestLogger`, `setRequestActor`.
- `auditMutations` / `recordAuditEvent`: auditoría de escrituras (`POST/PUT/PATCH/DELETE`) y eventos de dominio.
- `apiLimiter` / `writeLimiter`: límites por IP por ventana, headers draft-8, 429 con `requestId`.
- `errorHandler` / `notFound`: envelopes JSON con `requestId`.
- `exposedHeaders` / `noStore`: headers CORS y `Cache-Control: no-store`.

## Invariants

- Los logs no incluyen bodies, query strings, cookies ni cabeceras de autorización (redactados).
- La auditoría no se muestrea ni se apaga bajando `LOG_LEVEL`; se emite a `info`.
- La auditoría corre antes de los rate limiters para registrar rechazos.
- 4xx esperados no generan stack; los 5xx sí.
- Los rate limits son por proceso; para varias réplicas hace falta un store compartido.

## Side Effects

- Escribe logs JSON en stdout y filas en `audit_events` (vía el writer del módulo audit).

## Verification

- Run: `pnpm --filter @repo/api test`
