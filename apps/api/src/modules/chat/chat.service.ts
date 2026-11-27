import type { ChatResponse, Fuente } from '@repo/contracts';
import type { LlmClient } from '../ai/llm.client.ts';
import type { EmbeddingClient } from '../ai/embedding.client.ts';
import type { ProveedorReader } from '../proveedores/proveedor.reader.ts';
import type { PropuestaReader } from '../propuestas/propuesta.reader.ts';
import { PropuestaNoEncontradaError } from '../propuestas/propuesta.service.ts';
import type { ProyectoReader } from '../proyectos/proyecto.reader.ts';
import type { ConocimientoSearch } from '../documentos/conocimiento.search.ts';

const TOP_K = 6;

const SYSTEM_PROMPT = [
  'Eres el asistente de evaluación de propuestas de un equipo comprador.',
  'Responde SIEMPRE en español, de forma directa y basada únicamente en el contexto entregado.',
  'Si el contexto no alcanza para responder, dilo explícitamente y sugiere qué documento falta.',
  'Cuando cites datos numéricos (montos, recargos, promedios), menciona el documento o entrada de historial de la que provienen.',
].join(' ');

/**
 * Chat use case over the vectorized knowledge base. Retrieval is always
 * scoped to one proyecto (the `conocimiento.proyecto_id` foreign key keeps
 * every chunk project-bound), and when the question targets a propuesta the
 * live cost history of its proveedor is injected from SQL so amounts are
 * accurate, not just semantically similar.
 */
export class ChatService {
  readonly #proyectos: ProyectoReader;
  readonly #propuestas: PropuestaReader;
  readonly #proveedores: ProveedorReader;
  readonly #search: ConocimientoSearch;
  readonly #embeddings: EmbeddingClient;
  readonly #llm: LlmClient;

  constructor(
    proyectos: ProyectoReader,
    propuestas: PropuestaReader,
    proveedores: ProveedorReader,
    search: ConocimientoSearch,
    embeddings: EmbeddingClient,
    llm: LlmClient,
  ) {
    this.#proyectos = proyectos;
    this.#propuestas = propuestas;
    this.#proveedores = proveedores;
    this.#search = search;
    this.#embeddings = embeddings;
    this.#llm = llm;
  }

  async preguntar(input: {
    proyectoId: string;
    propuestaId?: string;
    pregunta: string;
  }): Promise<ChatResponse> {
    const proyecto = await this.#proyectos.get(input.proyectoId);

    if (!proyecto) {
      throw new ProyectoNoEncontradoChatError(input.proyectoId);
    }

    // 1) Embed the question (external I/O, deliberately outside any transaction).
    const [vector] = await this.#embeddings.embed([input.pregunta]);

    // 2) Retrieve the most similar knowledge chunks of this project.
    const coincidencias = await this.#search.buscar({
      proyectoId: input.proyectoId,
      vector,
      limite: TOP_K,
    });

    const fuentes: Fuente[] = coincidencias.map((coincidencia) => ({
      id: coincidencia.id,
      titulo: coincidencia.titulo,
      tipo: coincidencia.tipo,
      chunkIndex: coincidencia.chunkIndex,
    }));

    // 3) Live supplier cost history when the question targets a propuesta.
    let historialContexto = '';

    if (input.propuestaId) {
      const propuesta = await this.#propuestas.get(input.propuestaId);

      if (!propuesta) {
        throw new PropuestaNoEncontradaError(input.propuestaId);
      }

      const historial = await this.#proveedores.historial(propuesta.proveedorId);

      if (historial) {
        historialContexto = [
          '\n## Historial de costos del proveedor (datos reales, actualizados)',
          `Proveedor: ${historial.proveedor.nombre}`,
          `Propuestas registradas: ${historial.resumen.totalPropuestas}; promedio ${historial.resumen.montoPromedio ?? 'n/d'}; mínimo ${historial.resumen.montoMinimo ?? 'n/d'}; máximo ${historial.resumen.montoMaximo ?? 'n/d'}; último monto ${historial.resumen.ultimoMonto ?? 'n/d'}.`,
          ...historial.entradas.map(
            (entrada) =>
              `- Proyecto "${entrada.proyectoNombre}" (${entrada.createdAt.slice(0, 10)}): monto ${entrada.monto ?? 'n/d'}, recargos aparte: ${
                entrada.recargos.length > 0
                  ? entrada.recargos
                      .map((recargo) => `${recargo.concepto} ${recargo.monto}`)
                      .join(', ')
                  : entrada.recargosTotal
              }.`,
          ),
        ].join('\n');
      }
    }

    // 4) Grounded generation.
    const contexto = coincidencias
      .map((coincidencia, indice) => {
        const titulo = coincidencia.titulo ?? 'sin título';
        return `[${indice + 1}] ${titulo} (${coincidencia.tipo}${coincidencia.chunkIndex === null ? '' : `, parte ${coincidencia.chunkIndex + 1}`}):\n${coincidencia.contenido}`;
      })
      .join('\n\n');

    const completion = await this.#llm.complete({
      system: SYSTEM_PROMPT,
      question: [
        `Proyecto: ${proyecto.nombre}${proyecto.descripcion ? ` — ${proyecto.descripcion}` : ''}`,
        '',
        '## Contexto recuperado de la base de conocimiento del proyecto',
        contexto || '(sin fragmentos recuperados)',
        historialContexto,
        '',
        '## Pregunta',
        input.pregunta,
      ].join('\n'),
      maxTokens: 1500,
    });

    return { respuesta: completion.text, modelo: completion.model, fuentes };
  }
}

export class ProyectoNoEncontradoChatError extends Error {
  constructor(id: string) {
    super(`Proyecto ${id} not found`);
    this.name = 'ProyectoNoEncontradoChatError';
  }
}
