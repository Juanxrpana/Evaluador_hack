# Web `src`

## Overview

SPA React 19 + Vite + TanStack Router/Query. Consume la API con un cliente oRPC tipado derivado del contrato; no hay cliente generado aparte.

## Interface

- `main.tsx`: monta `QueryClientProvider` + `RouterProvider`.
- `router.ts`: `router` con `queryClient` en contexto y `routeTree` generado.
- `routeTree.gen.ts`: árbol de rutas generado por `tsr generate`; no se edita a mano.
- Subdirectorios:
  - [components](./components/README.md): shell del sistema, iconografía, primitivas y formularios de autenticación.
  - [lib](./lib/README.md): cliente oRPC, sesión, query client, formato y tema.
  - [routes](./routes/README.md): pantallas y guards.

## Invariants

- `OpenAPILink` usa una URL absoluta (`VITE_API_URL` u origen actual) y `credentials: 'include'`.
- La sesión se resuelve con Better Auth (`sessionQueryOptions`) antes de entrar a rutas `_authed`.
- `routeTree.gen.ts` se regenera con `pnpm --filter @repo/web routes:generate` (o `typecheck`/`build`).
- El cliente se tipa desde `@repo/contracts`; un cambio de contrato rompe la compilación.
- El tema se aplica en `<html data-theme="dark|light">`; el valor inicial se lee antes del primer render.

## Side Effects

- Peticiones HTTP a `/api` (cookies de sesión).
- `localStorage` para la preferencia de tema (`evaluador.tema`) y el parámetro `?tema=claro|oscuro`.

## Verification

- Run: `pnpm --filter @repo/web typecheck`
