# Proveedores

## Overview

Directorio de proveedores y su historial de costos. El historial se calcula desde las propuestas y recargos reales, no desde texto libre.

## Interface

- `ProveedorService(reader, runInTransaction)`.
  - `list(): Promise<Proveedor[]>`.
  - `get(id): Promise<Proveedor>`.
  - `historial(id): Promise<ProveedorHistorial>`.
  - `create(input: CreateProveedorInput): Promise<Proveedor>`.
  - `actualizar(id, input: UpdateProveedorInput): Promise<Proveedor>`.
  - `eliminar(id): Promise<{ id: string }>`.
- `ProveedorReader` `{ list, get, historial }`, `ProveedorWriter` `{ create, update, remove }`.
- `CreateProveedorInput` `{ nombre, contacto? }`, `UpdateProveedorInput` `{ nombre?, contacto? }`.
- `ProveedorTransaction` `{ proveedores, audit }`, `ProveedorTransactionRunner`.
- `ProveedorNoEncontradoError`.
- Adaptadores: `PostgresProveedorReader`, `PostgresProveedorWriter`, `proveedor.mapper.ts`.

## Invariants

- `get` e `historial` lanzan `ProveedorNoEncontradoError` si el proveedor no existe.
- `create`, `actualizar` y `eliminar` comparten transacción con su auditoría (`proveedor.create` / `proveedor.update` / `proveedor.delete`).
- `actualizar` y `eliminar` lanzan `ProveedorNoEncontradoError` si la fila no existe.
- Borrar un proveedor con propuestas vivas falla por FK y el router lo traduce a `CONFLICT`.
- Tras crear o actualizar, el servicio relee la fila completa.

## Side Effects

- Inserta, actualiza o elimina en `proveedor` y escribe en `audit_events`.
- `historial` lee propuestas y recargos asociados.

## Verification

- Run: `pnpm --filter @repo/api test`
