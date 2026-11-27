# Rutas

## Overview

Rutas file-based de TanStack Router. `__root.tsx` monta el `SystemShell`; `_authed.tsx` es el guard de sesión.

## Interface

- `__root.tsx`: envuelve `<Outlet />` con `SystemShell` (navegación, tema, cierre de sesión).
- `index.tsx`: redirige a `/proyectos` si hay sesión, a `/login` si no.
- `login.tsx` / `signup.tsx`: pantallas de autenticación.
- `_authed.tsx`: guard; si no hay sesión redirige a `/login`.
- [_authed](./_authed/README.md): pantallas protegidas.

## Invariants

- Ninguna ruta protegida renderiza sin sesión: el guard de `_authed` corre en `beforeLoad`.
- La navegación autenticada es coherente: `/` y `AuthForm` llevan a `/proyectos`.
- `routeTree.gen.ts` se regenera; no se edita a mano.

## Side Effects

- Navegación del router y consultas de sesión.

## Verification

- Run: `pnpm --filter @repo/web typecheck`
