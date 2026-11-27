import { env } from '../../config/env.ts';
import type { BusquedaWeb, ResultadoBusqueda, WebSearchClient } from './web-search.client.ts';

interface SearXngRespuesta {
  results?: Array<{ title?: string; url?: string; content?: string }>;
}

/**
 * Local SearXNG metasearch adapter (JSON API). Confidence of privacy: the
 * query never leaves the machine.
 */
export class SearxngClient implements WebSearchClient {
  readonly #baseUrl: string;

  constructor(baseUrl?: string) {
    this.#baseUrl = (baseUrl ?? env.SEARXNG_URL).replace(/\/$/, '');
  }

  async buscar(termino: string): Promise<BusquedaWeb> {
    const url = `${this.#baseUrl}/search?q=${encodeURIComponent(termino)}&format=json`;

    try {
      const respuesta = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(env.SEARXNG_TIMEOUT_MS),
      });

      if (!respuesta.ok) {
        return { resultados: [], motor: this.#baseUrl };
      }

      const datos = (await respuesta.json()) as SearXngRespuesta;
      const resultados: ResultadoBusqueda[] = (datos.results ?? [])
        .filter((resultado) => resultado.url && resultado.title)
        .slice(0, 8)
        .map((resultado) => ({
          titulo: resultado.title ?? '',
          url: resultado.url ?? '',
          contenido: (resultado.content ?? '').slice(0, 500),
        }));

      return { resultados, motor: this.#baseUrl };
    } catch {
      // The search engine is unavailable: the evaluation continues without
      // market context instead of aborting.
      return { resultados: [], motor: this.#baseUrl };
    }
  }
}
