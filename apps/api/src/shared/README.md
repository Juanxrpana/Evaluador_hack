# Shared

## Overview

Utilidades transversales sin dependencias del dominio.

## Interface

- `uuidv7(): string`: genera un UUID v7 (RFC 9562) con timestamp de 48 bits y 62 bits aleatorios.

## Invariants

- El identificador es ordenable por tiempo y compatible con los defaults `uuidv7()` de PostgreSQL 18+.
- No usa `node:crypto`; usa `crypto.getRandomValues` (Web Crypto).

## Side Effects

- Ninguno.

## Verification

- Run: `pnpm --filter @repo/api test`
