import type { Documento, DocumentoUploadResponse } from '@repo/contracts';
import { env } from '../../config/env.ts';
import type { EmbeddingClient } from '../ai/embedding.client.ts';
import { ProveedorNoEncontradoError } from '../proveedores/proveedor.service.ts';
import type { ProveedorReader } from '../proveedores/proveedor.reader.ts';
import type { PropuestaReader } from '../propuestas/propuesta.reader.ts';
import type { ProyectoReader } from '../proyectos/proyecto.reader.ts';
import type { DocumentoReader } from './documento.reader.ts';
import type { DocumentoTransactionRunner } from './documento.transaction.ts';
import { chunkText } from './chunker.ts';
import type { ExtractorContenido } from './extractor.port.ts';
import { ContenidoIlegibleError } from './extractor.port.ts';
import type { ExtractorMontos, MontosExtraidos } from './extraccion-montos.port.ts';
import { buildProveedorHistorialText } from './proveedor-historial.text.ts';

/**
 * Ingestion pipeline: upload → extract text (PDF local parse, image via the
 * vision model) → chunk → embed with bge-m3 → store the documento and its
 * knowledge chunks in one transaction. The supplier cost history is rebuilt
 * from real data on every upload of that proveedor, so the knowledge base
 * tracks the actual cost relationship over time.
 *
 * Embeddings are generated BEFORE the transaction opens: no external I/O
 * happens inside the unit of work.
 */
export class DocumentoService {
  readonly #reader: DocumentoReader;
  readonly #runInTransaction: DocumentoTransactionRunner;
  readonly #proyectos: ProyectoReader;
  readonly #propuestas: PropuestaReader;
  readonly #proveedores: ProveedorReader;
  readonly #extractor: ExtractorContenido;
  readonly #embeddings: EmbeddingClient;
  readonly #extractorMontos: ExtractorMontos;

  constructor(
    reader: DocumentoReader,
    runInTransaction: DocumentoTransactionRunner,
    proyectos: ProyectoReader,
    propuestas: PropuestaReader,
    proveedores: ProveedorReader,
    extractor: ExtractorContenido,
    embeddings: EmbeddingClient,
    extractorMontos: ExtractorMontos,
  ) {
    this.#reader = reader;
    this.#runInTransaction = runInTransaction;
    this.#proyectos = proyectos;
    this.#propuestas = propuestas;
    this.#proveedores = proveedores;
    this.#extractor = extractor;
    this.#embeddings = embeddings;
    this.#extractorMontos = extractorMontos;
  }

  async listByProyecto(proyectoId: string): Promise<Documento[]> {
    const proyecto = await this.#proyectos.get(proyectoId);

    if (!proyecto) {
      throw new ProyectoNoExisteError(proyectoId);
    }

    return this.#reader.listByProyecto(proyectoId);
  }

  async subir(input: {
    proyectoId: string;
    propuestaId?: string | undefined;
    proveedorId?: string | undefined;
    nombre: string;
    mime: string;
    tipo?: 'propuesta' | 'requerimientos' | undefined;
    contenidoBase64: string;
  }): Promise<DocumentoUploadResponse> {
    const tipo = input.tipo ?? 'propuesta';
    const proyecto = await this.#proyectos.get(input.proyectoId);
    if (!proyecto) {
      throw new ProyectoNoExisteError(input.proyectoId);
    }

    if (input.propuestaId) {
      const propuesta = await this.#propuestas.get(input.propuestaId);
      if (!propuesta) {
        throw new PropuestaNoExisteError(input.propuestaId);
      }
      if (propuesta.proyectoId !== input.proyectoId) {
        throw new PropuestaOtroProyectoError(input.propuestaId);
      }
    }

    if (input.proveedorId) {
      const proveedor = await this.#proveedores.get(input.proveedorId);
      if (!proveedor) {
        throw new ProveedorNoEncontradoError(input.proveedorId);
      }
    }

    const bytes = Buffer.from(input.contenidoBase64, 'base64');
    if (bytes.byteLength === 0) {
      throw new DocumentoVacioError();
    }
    if (bytes.byteLength > env.DOCUMENT_MAX_BYTES) {
      throw new DocumentoDemasiadoGrandeError(bytes.byteLength, env.DOCUMENT_MAX_BYTES);
    }

    // 1) Extract text: PDFs parsed locally, images described by the vision model.
    const texto = await this.#extraer(input.mime, bytes, input.nombre);

    // Provenance (E.3.b): the AI must always know WHICH supplier a file
    // belongs to, even when the file is named 01.pdf. The knowledge chunk
    // titles carry the supplier + proposal + file name.
    const proveedorAsociado = input.proveedorId
      ? await this.#proveedores.get(input.proveedorId)
      : null;
    const nombreProveedor = proveedorAsociado?.nombre ?? null;
    const tituloConocimiento =
      tipo === 'requerimientos'
        ? `Requerimientos del proyecto — ${input.nombre}`
        : nombreProveedor
          ? `Propuesta de ${nombreProveedor} — ${input.nombre}`
          : input.nombre;
    const primeraLineaProcedencia = nombreProveedor
      ? `Documento presentado por el proveedor ${nombreProveedor}.`
      : null;

    // 2) Chunk and embed OUTSIDE the transaction.
    const chunks = chunkText(texto);
    if (chunks.length === 0) {
      throw new ContenidoIlegibleError(input.mime);
    }

    if (primeraLineaProcedencia) {
      chunks[0] = { index: 0, text: `${primeraLineaProcedencia}\n${chunks[0].text}` };
    }

    const embeddings = await this.#embeddings.embed(chunks.map((chunk) => chunk.text));

    // 3) Supplier cost history, rebuilt from real recorded data.
    let historialChunks: { index: number; text: string }[] = [];
    let historialEmbeddings: number[][] = [];
    let historialTitulo: string | null = null;

    if (input.proveedorId) {
      const historial = await this.#proveedores.historial(input.proveedorId);

      if (historial) {
        const textoHistorial = buildProveedorHistorialText(historial);
        historialTitulo = `Historial de costos: ${historial.proveedor.nombre}`;
        historialChunks = chunkText(textoHistorial);

        if (historialChunks.length > 0) {
          historialEmbeddings = await this.#embeddings.embed(
            historialChunks.map((chunk) => chunk.text),
          );
        }
      }
    }

    // 4) When the document belongs to a propuesta, the LLM extracts the
    // offered monto, currency, surcharges (fixed and %) and line items
    // BEFORE the transaction (no external I/O inside it).
    let extraccion: MontosExtraidos | null = null;

    if (input.propuestaId) {
      extraccion = await this.#extractorMontos.extraer(texto);
    }

    // 5) One transaction: documento + knowledge chunks + propuesta/recargos/ítems + audit.
    const resultado = await this.#runInTransaction(
      async ({ documentos, conocimiento, propuestas, propuestaItems, recargos, audit }) => {
        const { id: documentoId } = await documentos.create({
          proyectoId: input.proyectoId,
          propuestaId: input.propuestaId ?? null,
          proveedorId: input.proveedorId ?? null,
          nombre: input.nombre,
          mime: input.mime,
          tipo,
          bytes,
        });

        const chunksInsertados = await conocimiento.insertConEmbeddings({
          proyectoId: input.proyectoId,
          tipo: 'documento',
          titulo: tituloConocimiento,
          documentoId,
          chunks,
          embeddings,
          metadata: {
            ...(input.proveedorId ? { proveedorId: input.proveedorId } : {}),
            ...(input.propuestaId ? { propuestaId: input.propuestaId } : {}),
          },
        });

        let historialInsertados = 0;
        if (input.proveedorId && historialChunks.length > 0) {
          await conocimiento.deleteProveedorHistorial(input.proyectoId, input.proveedorId);
          historialInsertados = await conocimiento.insertConEmbeddings({
            proyectoId: input.proyectoId,
            tipo: 'proveedor_historial',
            titulo: historialTitulo,
            documentoId: null,
            chunks: historialChunks,
            embeddings: historialEmbeddings,
            metadata: { proveedorId: input.proveedorId },
          });
        }

        let recargosInsertados = 0;
        let itemsInsertados = 0;
        if (input.propuestaId && extraccion) {
          if (extraccion.montoTotal !== null || extraccion.moneda !== null) {
            await propuestas.update(input.propuestaId, {
              monto: extraccion.montoTotal ?? undefined,
              moneda: extraccion.moneda ?? undefined,
            });
          }

          recargosInsertados = await recargos.replaceForPropuesta(
            input.propuestaId,
            extraccion.recargos.map((recargo) => ({ ...recargo, moneda: extraccion.moneda })),
          );
          itemsInsertados = await propuestaItems.replaceForPropuesta(
            input.propuestaId,
            extraccion.items,
          );
        }

        await audit.record({
          action: 'documento.upload',
          resource: 'documento',
          resourceId: documentoId,
        });

        return {
          documentoId,
          chunksInsertados,
          historialInsertados,
          recargosInsertados,
          itemsInsertados,
        };
      },
    );

    const documento = await this.#reader.listByProyecto(input.proyectoId);
    const creado = documento.find((item) => item.id === resultado.documentoId);

    if (!creado) {
      throw new Error('Uploaded document could not be read back');
    }

    return {
      documento: creado,
      chunks: resultado.chunksInsertados,
      proveedorHistorialChunks: input.proveedorId ? resultado.historialInsertados : undefined,
      extraccion: input.propuestaId
        ? {
            montoTotal: extraccion?.montoTotal ?? null,
            moneda: extraccion?.moneda ?? null,
            recargos: resultado.recargosInsertados,
            items: resultado.itemsInsertados,
            instruccionesOcultas: extraccion?.instruccionesOcultas.length ?? 0,
          }
        : null,
    };
  }

  async eliminar(id: string): Promise<{ id: string }> {
    return this.#runInTransaction(async ({ documentos, audit }) => {
      const eliminado = await documentos.remove(id);

      if (!eliminado) {
        throw new DocumentoNoEncontradoError(id);
      }

      // Knowledge chunks cascade with the documento (documento_id FK).
      await audit.record({
        action: 'documento.delete',
        resource: 'documento',
        resourceId: id,
      });

      return { id };
    });
  }

  async #extraer(mime: string, bytes: Buffer, nombre: string): Promise<string> {
    const texto = await this.#extractor.extraer({ nombre, mime, bytes }).catch((error: unknown) => {
      if (error instanceof ContenidoIlegibleError) {
        throw error;
      }

      throw new ExtractorFallidoError(mime, error);
    });

    return texto;
  }
}

export class ProyectoNoExisteError extends Error {
  constructor(id: string) {
    super(`Proyecto ${id} does not exist`);
    this.name = 'ProyectoNoExisteError';
  }
}

export class PropuestaNoExisteError extends Error {
  constructor(id: string) {
    super(`Propuesta ${id} does not exist`);
    this.name = 'PropuestaNoExisteError';
  }
}

export class PropuestaOtroProyectoError extends Error {
  constructor(id: string) {
    super(`Propuesta ${id} belongs to a different proyecto`);
    this.name = 'PropuestaOtroProyectoError';
  }
}

export class DocumentoVacioError extends Error {
  constructor() {
    super('The uploaded document is empty');
    this.name = 'DocumentoVacioError';
  }
}

export class DocumentoNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Documento ${id} not found`);
    this.name = 'DocumentoNoEncontradoError';
  }
}

export class DocumentoDemasiadoGrandeError extends Error {
  constructor(bytes: number, maximo: number) {
    super(`Documento is ${bytes} bytes; the maximum is ${maximo}`);
    this.name = 'DocumentoDemasiadoGrandeError';
  }
}

export class ExtractorFallidoError extends Error {
  constructor(mime: string, causa: unknown) {
    super(`Content extraction failed for ${mime}`);
    this.name = 'ExtractorFallidoError';
    this.cause = causa;
  }
}
