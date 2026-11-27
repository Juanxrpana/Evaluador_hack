# Web

## Overview

SPA React + Vite que consume el contrato compartido. Es la interfaz de escritorio para gestionar proyectos, propuestas, proveedores, documentos y chat.

## Subdirectories & Boundaries

- [src](./src/README.md): entrada, router, componentes, lib y rutas.
- `vite.config.ts`: plugin de TanStack Router y proxy `/api`.
- `index.html`: shell de la SPA.
- `tsr.config.json`: configuración del generador de rutas.

## Global Invariants

- Requiere el contrato compilado (`@repo/contracts`) para typecheck/build.
- `routeTree.gen.ts` es generado; no se edita a mano.
- La sesión es por cookie; el mobile usa bearer.
- En desarrollo, Vite proxya `/api` al backend.

## Verification

- Run: `pnpm --filter @repo/web typecheck`
- Build: `pnpm --filter @repo/web build`
