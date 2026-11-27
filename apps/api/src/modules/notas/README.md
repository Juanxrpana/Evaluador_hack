# Notas

## Overview

Notas libres asociadas a una propuesta (observaciones del evaluador). Son texto editable y quedan auditadas en cada cambio.

## Interface

- `NotaService(reader, runInTransaction, propuestas)`.
  - `listByPropuesta(propuestaId): Promise<Nota[]>`.
  - `create(input: CreateNotaInput): Promise<Nota>`.
  - `actualizar(id, input: UpdateNotaInput): Promise<Nota>`.
  - `eliminar(id): Promise<{ id: string }>`.
- `NotaReader` `{ get, listByPropuesta }`, `NotaWriter` `{ create, update, remove }`.
- `CreateNotaInput` `{ propuestaId, texto }`, `UpdateNotaInput` `{ texto? }`.
- `NotaTransaction` `{ notas, audit }`, `NotaTransactionRunner`.
- `NotaNoEncontradaError`.
- Adaptadores: `PostgresNotaReader`, `PostgresNotaWriter`, `nota.mapper.ts`.

## Invariants

- La propuesta debe existir antes de listar o crear.
- `create`, `actualizar` y `eliminar` escriben auditoría (`nota.create` / `nota.update` / `nota.delete`) en la misma transacción.
- `actualizar` y `eliminar` lanzan `NotaNoEncontradaError` si la nota no existe.

## Side Effects

- Inserta, actualiza o elimina en `nota` y escribe en `audit_events`.

## Verification

- Run: `pnpm --filter @repo/api test`
