# Módulos del dominio

## Overview

Cada submódulo implementa un caso de uso con el patrón reader/writer/service/transaction. Los servicios son el límite de transacción y el router solo los invoca; los adaptadores Postgres viven al lado del puerto.

## Subdirectories & Boundaries

- [ai](./ai/README.md): puertos y adaptadores de embeddings y LLM.
- [audit](./audit/README.md): auditoría durable en la transacción.
- [chat](./chat/README.md): consulta en lenguaje natural sobre conocimiento vectorizado.
- [documentos](./documentos/README.md): ingesta, chunking, embeddings y montos/recargos.
- [estatus](./estatus/README.md): bitácora de estados de proyecto/propuesta.
- [notas](./notas/README.md): notas libres por propuesta.
- [propuestas](./propuestas/README.md): propuestas de proveedores por proyecto.
- [proveedores](./proveedores/README.md): directorio e historial de costos.
- [proyectos](./proyectos/README.md): raíz del dominio.
- [recargos](./recargos/README.md): cargos extraídos por propuesta.
- [users](./users/README.md): usuarios del starter y patrón de transacción.

## Global Invariants

- Los servicios dependen de interfaces, no de Kysely.
- La auditoría se escribe en la misma transacción que el hecho auditado.
- Los errores de dominio se traducen a códigos HTTP solo en el router.
- Ningún módulo llama a otro servicio para abrir una segunda transacción; comparte repositorios en un solo callback.

## Verification

- Run: `pnpm --filter @repo/api test`
