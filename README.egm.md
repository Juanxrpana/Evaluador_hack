# Evaluador de Propuestas — Repository Blueprint

## System Overview

Monorepo contract-first para evaluar propuestas de proveedores. `packages/contracts` define la API con Zod + oRPC; `apps/api` la implementa sobre Express 5, PostgreSQL/Kysely y Better Auth; `apps/web` y `apps/mobile` la consumen con un cliente tipado. El pipeline documental usa OpenRouter (chat/visión) y embeddings locales `bge-m3`; el conocimiento se guarda con pgvector.

## Subdirectories & System Boundaries

- [apps](./apps/README.md): aplicaciones ejecutables (API, web, mobile).
  - [apps/api](./apps/api/README.md): backend, dominio, IA y persistencia.
  - [apps/web](./apps/web/README.md): SPA React para el evaluador.
  - [apps/mobile](./apps/mobile/README.md): app Expo/React Native.
- [packages](./packages/README.md): paquetes compartidos.
  - [packages/contracts](./packages/contracts/README.md): contrato oRPC y esquemas Zod.
- `docs/`: arquitectura, base de datos, autenticación y ADR (documentación, sin contrato EGM propio).
- `docker/`: init de PostgreSQL para tests (fixture, sin contrato EGM propio).

## Global Invariants

- **Contract-first:** la forma de la API vive solo en `packages/contracts`; servidor y clientes fallan en compilación si divergen.
- **Dos fuentes de verdad deliberadas:** Zod para la API, migraciones PostgreSQL para el almacenamiento; el mapper es el límite tipado.
- **Sin I/O externo dentro de transacciones:** red, LLM y embeddings ocurren antes de abrir la unidad de trabajo.
- **Migraciones congeladas:** nunca se editan; todo cambio es aditivo y con `down`.
- **Identificadores UUID v7** en dominio y autenticación.
- **Montos como decimal string** (`numeric(14,2)`), nunca `float`.
- **Aislamiento por proyecto:** propuestas, documentos y conocimiento cuelgan de `proyecto_id`.
- **Auth:** web por cookie de sesión; mobile por bearer token.
- **Auditoría durable** en la misma transacción que el hecho auditado.

## Global Side Effects

- PostgreSQL (con `pgvector`) como almacén primario.
- OpenRouter para chat/visión y extracción de montos.
- Descarga/caché local del modelo ONNX `Xenova/bge-m3`.
- Logs JSON y tabla `audit_events`.

## System Verification

- Run: `pnpm check`
- Tests focalizados: `pnpm --filter @repo/api test`
