# Web `lib`

## Overview

Infraestructura del cliente: transporte oRPC, sesión Better Auth, query client, formato y tema.

## Interface

- `orpc.ts`: `client` (`JsonifiedClient<ApiClient>`) y `orpc` (`createTanstackQueryUtils`).
- `auth-client.ts`: `authClient` (Better Auth).
- `session.ts`: `sessionQueryOptions` (query de sesión).
- `query-client.ts`: `queryClient`.
- `errors.ts`: `messageOf(cause)` para mostrar errores de mutación.
- `format.ts`: `fecha`, `fechaCorta`, `monto`, `numeroDe`.
- `theme.ts`: `Tema` (`dark` | `light`), `useTema()`.

## Invariants

- La URL base es absoluta: `VITE_API_URL` (sin barra final) u `window.location.origin`.
- Todas las peticiones usan `credentials: 'include'`.
- Las query keys y mutation options salen de `orpc`; no se escriben a mano.
- `sessionQueryOptions` es la fuente de verdad para saber si hay sesión.
- `monto` formatea montos decimales; no se hacen cálculos con `float`.

## Side Effects

- Red hacia `/api`, caché de TanStack Query y persistencia del tema.

## Verification

- Run: `pnpm --filter @repo/web typecheck`
