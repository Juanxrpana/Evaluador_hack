# Mobile `(auth)`

## Overview

Pantallas públicas de autenticación.

## Interface

- `sign-in.tsx`: formulario de inicio de sesión; llama `signIn` del `SessionProvider`.
- `sign-up.tsx`: formulario de registro; llama `signUp`.

## Invariants

- Usan el bearer plugin de Better Auth: la respuesta trae el `token`, que se persiste.
- La navegación posterior al login la decide el `SessionProvider`/layout de tabs.
- Los errores se muestran en la pantalla; no se filtran detalles del proveedor.

## Side Effects

- Peticiones de autenticación y persistencia del token.

## Verification

- Run: `pnpm --filter @repo/mobile typecheck`
