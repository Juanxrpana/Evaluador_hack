# Web

## Overview

SPA React + Vite que consume el contrato compartido. Es la interfaz de escritorio para gestionar proyectos, proveedores, propuestas, documentos y chat. Comparte el sistema visual (tokens, tipografía y componentes) con la app móvil y aplica modo oscuro por defecto con alternativa clara.

## Subdirectories & Boundaries

- [src](./src/README.md): entrada, router, componentes, lib y rutas.
- `public/assets/fonts`: Archivo variable, autoalojada.
- `vite.config.ts`: plugin de TanStack Router y proxy `/api`.
- `index.html`: shell de la SPA, tema inicial y metadatos.
- `tsr.config.json`: configuración del generador de rutas.
- [DESIGN.md](./DESIGN.md): sistema visual y tokens.
- [PRODUCT.md](./PRODUCT.md): verdad de producto.

## Global Invariants

- Requiere el contrato compilado (`@repo/contracts`) para typecheck/build.
- `routeTree.gen.ts` es generado; no se edita a mano.
- La sesión es por cookie; el mobile usa bearer.
- En desarrollo, Vite proxya `/api` al backend.
- La UI no promete ranking, revisión ni dictamen hasta que existan sus endpoints.

## Verification

- Run: `pnpm --filter @repo/web typecheck`
- Build: `pnpm --filter @repo/web build`
