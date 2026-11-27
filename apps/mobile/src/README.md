# Mobile `src`

## Overview

App React Native + Expo con autenticación bearer y pantallas base. Consume el mismo contrato oRPC que el web, pero sin cookies: el token de sesión se persiste y se adjunta como `Authorization: Bearer`.

## Subdirectories & Boundaries

- [app](./app/README.md): rutas de Expo Router (auth y tabs).
- [components](./components/README.md): primitivas de UI.
- [constants](./constants/README.md): tokens de tema.
- [lib](./lib/README.md): auth, oRPC, sesión y token.

## Global Invariants

- El token vive en almacenamiento seguro/persistente y lo carga `lib/token.ts`.
- `SessionProvider` envuelve el árbol y expone `user`, `signIn`, `signUp`, `signOut`.
- El cliente oRPC usa `apiOrigin` y adjunta el bearer en cada petición.
- No hay cookie jar: no usar `credentials: 'include'`.

## Verification

- Run: `pnpm --filter @repo/mobile typecheck`
