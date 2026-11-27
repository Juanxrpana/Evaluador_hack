# DB

## Overview

Capa de persistencia: pool Kysely/Postgres, transacciones y migraciones. Los tipos de las tablas se generan desde la base migrada, no se escriben a mano.

## Interface

- `createDatabase(options: DatabaseOptions): Kysely<DB>` (`client.ts`).
- `TransactionRunner<Tx>` y `createTransactionRunner<Tx>(db, createContext)` (`transaction.ts`).
- `createMigrator(db: Kysely<any>)` (`migrator.ts`).
- CLI `migrate.ts` (`up` | `down` | `status`) y `generate-types.ts`.
- `schema.generated.ts`: tipos generados por `kysely-typegen`.

## Invariants

- `createTransactionRunner` es el único lugar que abre transacciones; el callback recibe repositorios ligados a la transacción.
- No se permite I/O de red, email o colas dentro de la transacción.
- Las transacciones no se anidan; se componen repositorios en un solo callback.
- Las migraciones usan `Kysely<any>` y no importan el esquema actual.
- `db:rollback` se bloquea en producción sin `ALLOW_DB_ROLLBACK=1`.
- `schema.generated.ts` se regenera con `pnpm db:types`; no se edita a mano.
- El pool se destruye en el apagado.

## Side Effects

- Abre conexiones PostgreSQL y ejecuta DDL/DML.
- `generate-types.ts` levanta PGlite, aplica migraciones y escribe el archivo de tipos.

## Verification

- Run: `pnpm --filter @repo/api test`
