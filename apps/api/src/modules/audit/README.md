# Audit

## Overview

Puerto y adaptador de auditoría durable. La auditoría es “solo éxito”: se escribe dentro de la misma transacción que produjo el hecho auditado, así que si la escritura falla, la operación también se revierte.

## Interface

- `AuditCorrelation` `{ actorId?, requestId?, traceId? }`.
- `AuditRecord` `{ action, resource, resourceId }`.
- `AuditWriter.record(event: AuditRecord): Promise<void>`.
- `PostgresAuditWriter(trx: Transaction<DB>, correlation?: AuditCorrelation)`.

## Invariants

- `record()` escribe en la transacción del llamador; nunca abre una transacción propia.
- La correlación (`actorId`, `requestId`, `traceId`) la captura el composition root mientras el contexto HTTP está activo; los jobs en segundo plano pasan `{}`.
- Un fallo al insertar la auditoría debe hacer fallar la operación completa.

## Side Effects

- Inserta una fila en la tabla `audit_events` (`action`, `resource`, `resource_id`, `actor_id`, `request_id`, `trace_id`).

## Verification

- Run: `pnpm --filter @repo/api test`
