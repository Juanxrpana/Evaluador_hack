# Schemas

## Overview

Esquemas Zod que definen la forma pública de la API. Son la fuente única para validación de servidor, tipos del cliente, formularios y OpenAPI.

## Interface

- `health.ts`: `healthResponseSchema`.
- `user.ts`: `userSchema`, `User`.
- `evaluador.ts`:
  - Proyecto: `proyectoSchema`, `proyectoInput`, `proyectoUpdate`.
  - Proveedor: `proveedorSchema`, `proveedorInput`, `proveedorUpdate`, `proveedorHistorialSchema`, `historialEntradaSchema`.
  - Propuesta: `propuestaSchema`, `propuestaInput`, `propuestaUpdate`.
  - Recargo: `recargoSchema`, `recargoExtraido`.
  - Nota: `notaSchema`, `notaInput`, `notaUpdate`.
  - Estatus: `estatusSchema`, `estatusInput`, `estatusUpdate`.
  - Documento: `documentoSchema`, `documentoUploadInput`, `documentoUploadResponse`.
  - Conocimiento: `conocimientoSchema`.
  - Chat: `fuenteSchema`, `chatResponseSchema`, `chatAskInput`.
  - Tipos inferidos: `Proyecto`, `Proveedor`, `Propuesta`, `Recargo`, `Nota`, `Estatus`, `Documento`, `Conocimiento`, `ChatResponse`, etc.

## Invariants

- Zod es dueño de la forma de la API; Postgres es dueño del almacenamiento.
- Los montos viajan como **string decimal** (`montoSchema`: hasta 12 enteros y 2 decimales), nunca `float`.
- Las fechas viajan como ISO 8601 (`z.iso.datetime()`).
- Los ids son `z.uuid()`.
- `estatusInput` exige exactamente uno de `proyectoId` o `propuestaId`.
- `documentoUploadInput` acepta solo `application/pdf`, `image/png`, `image/jpeg` y un base64 de hasta 20 MiB.
- `propuestaUpdate` solo permite cambiar `monto`; los recargos los extrae el LLM.

## Side Effects

- Ninguno; son validadores puros.

## Verification

- Run: `pnpm --filter @repo/contracts build`
