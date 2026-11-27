# Mobile `app` (Expo Router)

## Overview

Rutas de Expo Router. El layout raíz monta `QueryClientProvider` y `SessionProvider`; los grupos `(auth)` y `(tabs)` separan el flujo público del autenticado.

## Interface

- `_layout.tsx`: `QueryClientProvider` + `SessionProvider` + `Stack` con `index`, `(auth)` y `(tabs)`.
- `index.tsx`: entrada/redirección.
- [(auth)](./%28auth%29/README.md): `sign-in`, `sign-up`.
- [(tabs)](./%28tabs%29/README.md): `index`, `usuarios`, `conocimiento`, `perfil`.

## Invariants

- El header del `Stack` está oculto; cada grupo define su propio chrome.
- La sesión se resuelve en `lib/session.tsx` antes de las pantallas autenticadas.
- Las rutas usan el alias `@/` configurado por Expo/TypeScript.

## Side Effects

- Navegación y consultas de sesión.

## Verification

- Run: `pnpm --filter @repo/mobile typecheck`
