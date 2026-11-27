# Mobile constants

## Overview

Tokens de diseño compartidos.

## Interface

- `theme.ts`: `Theme` con colores, superficies y tipografía.

## Invariants

- Las pantallas y componentes consumen `Theme`; no hay colores hardcodeados.
- Cambiar un token aquí afecta todas las pantallas móviles.

## Side Effects

- Ninguno.

## Verification

- Run: `pnpm --filter @repo/mobile typecheck`
