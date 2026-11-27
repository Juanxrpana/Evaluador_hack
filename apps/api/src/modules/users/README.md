# Users

## Overview

Caso de uso de usuarios del starter. Better Auth es dueño del alta pública; este servicio conserva `create` como referencia del patrón de transacción multi-repositorio y `list` sirve el endpoint autenticado.

## Interface

- `UserService(reader, runInTransaction)`.
  - `list(): Promise<User[]>`.
  - `create(input: CreateUserInput): Promise<User>`.
- `UserReader` `{ list }`, `UserWriter` `{ create }`.
- `CreateUserInput = Pick<User, 'name' | 'email'>`.
- `UserTransaction` `{ users, audit }`, `UserTransactionRunner`.
- `EmailAlreadyExistsError`.
- Adaptadores: `PostgresUserReader`, `PostgresUserWriter`, `user.mapper.ts`.

## Invariants

- `create` no se expone por HTTP mientras Better Auth gestione el registro.
- La fila de auditoría (`user.create`) se escribe en la misma transacción; si falla, se revierte el usuario.
- Un email duplicado en PostgreSQL se traduce a `EmailAlreadyExistsError`.
- `UserReader.list` usa la conexión raíz, fuera de transacción.

## Side Effects

- Inserta en `users` y `audit_events`.

## Verification

- Run: `pnpm --filter @repo/api test`
