# Chat

## Overview

Caso de uso de consulta en lenguaje natural sobre la base de conocimiento vectorizada de un proyecto. Recupera fragmentos por similitud, inyecta el historial real de costos del proveedor cuando la pregunta apunta a una propuesta y genera una respuesta anclada al contexto.

## Interface

- `ChatService(proyectos, propuestas, proveedores, search, embeddings, llm)`.
- `ChatService.preguntar({ proyectoId, propuestaId?, pregunta }): Promise<ChatResponse>`.
- `ProyectoNoEncontradoChatError`.

## Invariants

- La recuperación está siempre acotada a **un** `proyectoId`; `conocimiento.proyecto_id` mantiene cada fragmento ligado a su proyecto.
- `TOP_K = 6` fragmentos recuperados.
- El embedding de la pregunta se calcula **fuera** de cualquier transacción.
- Si se pasa `propuestaId`, la propuesta debe existir; el historial del proveedor se consulta en SQL y se inyecta como contexto con montos reales.
- El `SYSTEM_PROMPT` exige responder en español, solo con el contexto y citar la fuente de los datos numéricos.
- Si el proyecto no existe, lanza `ProyectoNoEncontradoChatError`.

## Side Effects

- Inferencia de embeddings (CPU local).
- Búsqueda vectorial en `conocimiento` (pgvector).
- Llamada al LLM (OpenRouter).
- Lecturas de `proyectos`, `propuestas` y `proveedores`.

## Verification

- Run: `pnpm --filter @repo/api test`
