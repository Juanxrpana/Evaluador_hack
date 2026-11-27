# Tasa BCV

## Overview

Reference exchange rate for presentation. Proposal and charge amounts are stored in USD; the front derives VES with this rate. The service fetches the official BCV rate from `dolarapi.com`, caches it for 15 minutes, and falls back to the last known value marked `verificada: false` when the upstream is unavailable.

## Interface

- `TasaBcvService` — constructor `(fetchImpl?: FetchLike, cacheMs?: number)`.
- `TasaBcvService.obtener()` — `Promise<{ tasa: TasaBcv; desdeCache: boolean }>`.
- `TasaNoDisponibleError` — thrown when there is no live rate and no last known value.
- `FetchLike` — `(input: string, init?: RequestInit) => Promise<Response>`.

## Invariants

- `valor` is a decimal string with up to 8 fraction digits, in VES per USD.
- A fresh upstream response sets `verificada: true`; a fallback sets `verificada: false` and keeps the last `fuente`/`fecha`.
- The cache lasts 15 minutes by default; constructors can inject a shorter window for tests.
- No amount is converted inside this service; it only exposes the rate.

## Side Effects

- HTTPS request to `https://ve.dolarapi.com/v1/dolares/oficial` with a 5-second timeout.
- In-memory cache and last-known value.

## Verification

- Run: `pnpm --filter @repo/api test`
