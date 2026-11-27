# Estatus

## Overview

Bitácora de estados de un proyecto o de una propuesta. Cada fila de `estatus` pertenece exactamente a uno de los dos (lo garantiza un check constraint), y el servicio valida el padre antes de escribir.

## Interface

- `EstatusService(reader, runInTransaction, proyectos, propuestas)`.
  - `list({ proyectoId?, propuestaId? }): Promise<Estatus[]>`.
  - `get(id): Promise<Estatus>`.
  - `create(input: CreateEstatusInput): Promise<Estatus>`.
  - `actualizar(id, input: UpdateEstatusInput): Promise<Estatus>`.
  - `eliminar(id): Promise<{ id: string }>`.
- `EstatusReader` `{ get, listByProyecto, listByPropuesta }`.
- `EstatusWriter` `{ create, update, remove }`.
- `CreateEstatusInput` `{ proyectoId?, propuestaId?, estado: number, comentario? }`.
- `UpdateEstatusInput` `{ estado?, comentario? }`.
- `EstatusTransaction` `{ estatus, audit }`, `EstatusTransactionRunner`.
- `EstatusNoEncontradoError`.
- Adaptadores: `PostgresEstatusReader`, `PostgresEstatusWriter`, `estatus.mapper.ts`.

## Invariants

- `list` exige un `proyectoId` o un `propuestaId`; si hay `proyectoId` lista por proyecto, si no, por propuesta.
- `create` valida que exista el proyecto o la propuesta referenciada.
- `actualizar` y `eliminar` lanzan `EstatusNoEncontradoError` si la fila no existe.
- Cada escritura registra su auditoría (`estatus.create` / `estatus.update` / `estatus.delete`) en la misma transacción.

## Side Effects

- Inserta, actualiza o elimina en `estatus` y escribe en `audit_events`.

## Verification

- Run: `pnpm --filter @repo/api test`
