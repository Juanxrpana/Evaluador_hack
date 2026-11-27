# Mobile `lib`

## Overview

Infraestructura del cliente móvil: autenticación, sesión, persistencia del token y transporte oRPC.

## Interface

- `auth-client.ts`: `authClient` y `apiOrigin`.
- `session.tsx`: `SessionProvider`, `SessionUser`, `SessionValue` (`user`, `signIn`, `signUp`, `signOut`).
- `token.ts`: `loadToken`, `saveToken` (persistencia del bearer).
- `orpc.ts`: `client` y `orpc` con bearer adjunto.

## Invariants

- El token se carga antes de cada petición y se envía como `Authorization: Bearer`.
- `SessionProvider` resuelve la sesión al arrancar y expone el usuario.
- No se usan cookies.
- El cliente se tipa desde `@repo/contracts`.

## Side Effects

- Almacenamiento persistente del token, red hacia `/api` y caché de TanStack Query.

## Verification

- Run: `pnpm --filter @repo/mobile typecheck`
