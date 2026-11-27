# Contracts

## Overview

Paquete compartido `@repo/contracts`: esquemas Zod y contrato oRPC. Se compila a `dist` y se consume por el API, el web y el mobile.

## Subdirectories & Boundaries

- [src](./src/README.md): contrato y esquemas.
- [src/schemas](./src/schemas/README.md): Zod de salud, usuarios y dominio del evaluador.

## Global Invariants

- Depende solo de `zod` y `@orpc/contract`; no conoce Express, Kysely ni React.
- Se construye antes de typecheck/build de los consumidores (`pnpm --filter @repo/contracts build`).
- El `dist` es un artefacto derivado; no se edita a mano.

## Verification

- Run: `pnpm --filter @repo/contracts build`
