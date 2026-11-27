# Contratos `src`

## Overview

Contrato oRPC que describe rutas, métodos, entradas y salidas. El API lo implementa y el web/mobile lo consumen como cliente tipado; no hay cliente generado aparte.

## Interface

- `contract`: rutas `health`, `users`, `proyectos`, `proveedores`, `propuestas`, `recargos`, `notas`, `estatus`, `documentos`, `conocimiento`, `chat`, `tasa`.
- `contract.tasa.bcv`: `GET /tasa/bcv`, salida `tasaBcvSchema`; tasa BCV de referencia (los montos se guardan en USD).
- `ApiContract = typeof contract`.
- `index.ts`: re-exporta `contract`, `ApiContract`, los esquemas y `ApiClient`.

## Invariants

- Cada procedimiento declara `method`, `path`, `tags` y `output`; las escrituras declaran `input`.
- Los ids de ruta se validan con `z.uuid()`.
- El contrato es la única fuente de verdad de la API: si cambia, el servidor y los clientes fallan en compilación.
- No contiene lógica de red ni de persistencia.
- OpenAPI se genera desde este contrato (`pnpm openapi`).

## Side Effects

- Ninguno; es un artefacto declarativo.

## Verification

- Run: `pnpm --filter @repo/contracts build`
