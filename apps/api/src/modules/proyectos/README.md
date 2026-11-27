# Proyectos

## Overview

Caso de uso de proyectos (procesos de compra). Es la raíz del dominio: propuestas, documentos y conocimiento cuelgan de un proyecto.

## Interface

- `ProyectoService(reader, runInTransaction)`.
  - `list(): Promise<Proyecto[]>`.
  - `get(id): Promise<Proyecto>`.
  - `create(input: CreateProyectoInput): Promise<Proyecto>`.
  - `actualizar(id, input: UpdateProyectoInput): Promise<Proyecto>`.
  - `eliminar(id): Promise<{ id: string }>`.
- `ProyectoReader` `{ list, get }`, `ProyectoWriter` `{ create, update, remove }`.
- `CreateProyectoInput` `{ nombre, descripcion? }`, `UpdateProyectoInput` `{ nombre?, descripcion? }`.
- `ProyectoTransaction` `{ proyectos, audit }`, `ProyectoTransactionRunner`.
- `ProyectoNoEncontradoError`.
- Adaptadores: `PostgresProyectoReader`, `PostgresProyectoWriter`, `proyecto.mapper.ts`.

## Invariants

- `get` lanza `ProyectoNoEncontradoError` cuando no existe.
- `create`, `actualizar` y `eliminar` comparten transacción con su auditoría (`proyecto.create` / `proyecto.update` / `proyecto.delete`).
- `actualizar` y `eliminar` lanzan `ProyectoNoEncontradoError` si la fila no existe.
- Eliminar un proyecto arrastra propuestas, documentos y conocimiento por cascada.
- Tras crear o actualizar, el servicio relee la fila completa.

## Side Effects

- Inserta, actualiza o elimina en `proyecto` y escribe en `audit_events`.

## Verification

- Run: `pnpm --filter @repo/api test`
