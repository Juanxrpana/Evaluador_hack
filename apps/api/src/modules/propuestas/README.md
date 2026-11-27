# Propuestas

## Overview

Caso de uso de propuestas de proveedores para un proyecto. Aplica el patrón reader/writer/service con la transacción y la auditoría en el servicio.

## Interface

- `PropuestaService(reader, runInTransaction, proyectos, proveedores)`.
  - `get(id): Promise<Propuesta>`.
  - `listByProyecto(proyectoId): Promise<Propuesta[]>`.
  - `create(input: CreatePropuestaInput): Promise<Propuesta>`.
  - `actualizar(id, input: UpdatePropuestaInput): Promise<Propuesta>`.
  - `eliminar(id): Promise<{ id: string }>`.
- `PropuestaReader` `{ get, listByProyecto }`, `PropuestaWriter` `{ create, update, remove }`.
- `CreatePropuestaInput` `{ proyectoId, proveedorId, monto? }`, `UpdatePropuestaInput` `{ monto? }`.
- `PropuestaTransaction` `{ propuestas, audit }`, `PropuestaTransactionRunner`.
- `PropuestaNoEncontradaError`.
- Adaptadores: `PostgresPropuestaReader`, `PostgresPropuestaWriter`, `propuesta.mapper.ts`.

## Invariants

- `create` valida que el proyecto y el proveedor existan antes de escribir.
- `actualizar` solo modifica `monto`; `eliminar` borra la propuesta (cascada a recargos, notas, estatus y documentos).
- Cada escritura registra su auditoría (`propuesta.create` / `propuesta.update` / `propuesta.delete`) en la misma transacción.
- `actualizar` y `eliminar` lanzan `PropuestaNoEncontradaError` si la fila no existe.
- Tras crear o actualizar, el servicio relee la fila completa.

## Side Effects

- Inserta, actualiza o elimina en `propuesta` y escribe en `audit_events`.

## Verification

- Run: `pnpm --filter @repo/api test`
