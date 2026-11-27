# Mobile `(tabs)`

## Overview

Navegación principal autenticada mediante `Tabs` de Expo Router.

## Interface

- `_layout.tsx`: `Tabs` con cuatro pantallas y estilos de `Theme`.
- `index.tsx`: Proyectos.
- `usuarios.tsx`: Usuarios.
- `conocimiento.tsx`: Conocimiento.
- `perfil.tsx`: Perfil (sesión y cierre).

## Invariants

- Los títulos y colores salen de `constants/theme`.
- Las pantallas consumen `orpc` con el bearer del `SessionProvider`.
- `perfil` es el punto de cierre de sesión (`signOut`).

## Side Effects

- Peticiones autenticadas y navegación por tabs.

## Verification

- Run: `pnpm --filter @repo/mobile typecheck`
