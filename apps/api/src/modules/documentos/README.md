# Documentos (ingesta y conocimiento)

## Overview

Pipeline de ingesta: subida → extracción de texto (PDF local o visión para imágenes) → chunking → embeddings `bge-m3` → extracción LLM del monto y recargos de la propuesta → persistencia del documento, sus fragmentos de conocimiento, el monto/recargos de la propuesta y la auditoría en una sola transacción. El historial de costos del proveedor se reconstruye desde datos reales en cada subida.

## Interface

- `DocumentoService(reader, runInTransaction, proyectos, propuestas, proveedores, extractor, embeddings, extractorMontos)`.
  - `listByProyecto(proyectoId): Promise<Documento[]>`.
  - `subir({ proyectoId, propuestaId?, proveedorId?, nombre, mime, contenidoBase64 }): Promise<DocumentoUploadResponse>`.
  - `eliminar(id): Promise<{ id: string }>`.
- Puertos: `DocumentoReader`, `DocumentoWriter`, `DocumentoTransaction` `{ documentos, conocimiento, propuestas, recargos, audit }`, `DocumentoTransactionRunner`.
- Conocimiento: `ConocimientoWriter`, `ConocimientoSearch`, `ConocimientoListReader`, `ConocimientoListService`.
- Extracción de texto: `ExtractorContenido`, `ExtraerInput`, `ContenidoIlegibleError`, `PdfExtractor` (unpdf), `ImagenDescriber` (visión).
- Extracción de montos: `ExtractorMontos`, `MontosExtraidos`, `LlmMontosExtractor`.
- Chunking: `ConocimientoChunk`, `chunkText(text, size=1200, overlap=150)`, `buildProveedorHistorialText`.
- Adaptadores: `PostgresDocumentoReader`, `PostgresDocumentoWriter`, `PostgresConocimientoSearch`, `PostgresConocimientoWriter`, `PostgresConocimientoListReader`, `ConocimientoListService`.
- Errores: `ProyectoNoExisteError`, `PropuestaNoExisteError`, `PropuestaOtroProyectoError`, `DocumentoNoEncontradoError`, `DocumentoVacioError`, `DocumentoDemasiadoGrandeError`, `ExtractorFallidoError`.

## Invariants

- El proyecto debe existir; si se pasa propuesta, debe existir y pertenecer a ese proyecto; si se pasa proveedor, debe existir.
- Un documento vacío se rechaza; uno mayor que `DOCUMENT_MAX_BYTES` se rechaza antes de tocar la base.
- PDFs se extraen localmente; imágenes pasan por el modelo de visión.
- Los chunks usan 1200 caracteres con 150 de solape; un texto sin chunks legibles lanza `ContenidoIlegibleError`.
- Embeddings, extracción de montos y reconstrucción del historial se ejecutan **antes** de abrir la transacción; no hay I/O externo dentro de la unidad de trabajo.
- Cada fragmento queda ligado a un `proyectoId`.
- Si hay `propuestaId`, el monto extraído (si existe) actualiza `propuesta.monto` y los recargos reemplazan el conjunto de esa propuesta.
- El historial del proveedor se borra y reconstruye en cada subida de ese proveedor.
- La fila de auditoría (`documento.upload` / `documento.delete`) se escribe en la misma transacción.
- `eliminar` lanza `DocumentoNoEncontradoError` si el documento no existe; los chunks caen por cascada.

## Side Effects

- Inserta en `documento`, `conocimiento` y `audit_events`.
- Actualiza `propuesta.monto` y reemplaza filas de `recargos` cuando se sube para una propuesta.
- Borra e inserta fragmentos `proveedor_historial` del proyecto/proveedor.
- CPU: embeddings locales.
- Red: modelo de visión y extractor de montos (LLM).

## Verification

- Run: `pnpm --filter @repo/api test`
