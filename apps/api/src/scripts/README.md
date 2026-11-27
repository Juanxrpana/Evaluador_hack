# Scripts

## Overview

Utilidades de línea de comandos que no forman parte del proceso HTTP.

## Interface

- `generate-openapi.ts`: genera `apps/api/openapi.json` (OpenAPI 3.1.1) desde el contrato oRPC y el conversor Zod.

## Invariants

- El artefacto `openapi.json` es derivado y está ignorado por git.
- El script no necesita base de datos ni claves de IA.
- El servidor base se construye con `PORT` (default 3000).

## Side Effects

- Escribe `apps/api/openapi.json`.

## Verification

- Run: `pnpm openapi`
