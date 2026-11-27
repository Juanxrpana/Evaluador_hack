# Apps

## Overview

Aplicaciones ejecutables del monorepo: API, web y mobile. Comparten el paquete `@repo/contracts`.

## Subdirectories & Boundaries

- [api](./api/README.md): backend Express/oRPC, IA y persistencia.
- [web](./web/README.md): SPA React + Vite + TanStack Router/Query.
- [mobile](./mobile/README.md): app React Native + Expo (login bearer y pantallas base).

## Global Invariants

- Todas consumen el contrato compartido; ninguna duplica los tipos de la API.
- El API es el único que habla con PostgreSQL y con los proveedores de IA.
- El web usa cookies de sesión; el mobile usa bearer token.

## Verification

- Run: `pnpm check`
