# Recargos

## Overview

Cargos cobrados aparte del monto base de una propuesta (flete, instalación, seguro, impuestos adicionales). El pipeline de documentos los extrae con el LLM y este módulo los persiste por propuesta.

## Interface

- `RecargoReader` `{ listByPropuesta(propuestaId): Promise<Recargo[]> }`.
- `RecargoWriter` `{ replaceForPropuesta(propuestaId, recargos: RecargoEscritura[]): Promise<number> }`.
- `RecargoEscritura` `{ concepto: string; monto: string }`.
- Adaptadores: `PostgresRecargoReader`, `PostgresRecargoWriter`, `recargo.mapper.ts`.

## Invariants

- `monto` es un string decimal (`numeric`), nunca `float`.
- `replaceForPropuesta` reemplaza el conjunto completo de recargos de una propuesta; se usa desde la ingesta documental.
- Los recargos pertenecen a una propuesta existente (`propuesta_id` FK con cascada).

## Side Effects

- Lee e inserta/borra filas en `recargos`.

## Verification

- Run: `pnpm --filter @repo/api test`
