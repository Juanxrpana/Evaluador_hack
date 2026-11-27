# Migraciones

## Overview

Historial congelado del esquema. Cada archivo exporta `up` y `down`; nunca se edita una migración ya aplicada.

## Interface

- `20261127120000_create_users.ts`
- `20261127121000_add_users_created_at_index.ts`
- `20261127130000_create_audit_events.ts`
- `20261127131000_add_authentication.ts`
- `20261127140000_create_core_domain_tables.ts` (UUID v7; `proyecto`, `proveedor`, `propuesta`, `estatus`, `recargos`, `nota`, `conocimiento`)
- `20261127150000_add_roles_and_permissions.ts`
- `20261127160000_add_pgvector_and_documentos.ts` (pgvector, extensiones y tablas de documentos)

## Invariants

- Cada `up` tiene un `down` real y reversible.
- Las migraciones son artefactos históricos: `Kysely<any>`, sin imports del esquema actual.
- No se edita una migración aplicada; se agrega una nueva.
- Se ejecutan manualmente (`pnpm db:migrate`), nunca al arrancar la API.
- Tras cambiar una migración se regenera `schema.generated.ts` con `pnpm db:types`.
- Las migraciones usan advisory locks de sesión; no ejecutarlas a través de PgBouncer en modo transacción.

## Side Effects

- DDL sobre PostgreSQL: crea/elimina tablas, índices y extensiones.

## Verification

- Run: `pnpm --filter @repo/api test`
