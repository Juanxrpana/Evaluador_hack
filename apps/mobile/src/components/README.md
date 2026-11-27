# Mobile components

## Overview

Primitivas de UI compartidas por las pantallas móviles.

## Interface

- `ui.tsx`: componentes base (contenedores, textos, botones/inputs) usados por `(auth)` y `(tabs)`.

## Invariants

- Los colores y espaciados provienen de `constants/theme`.
- No contienen lógica de red ni de sesión; son presentacionales.

## Side Effects

- Ninguno.

## Verification

- Run: `pnpm --filter @repo/mobile typecheck`
