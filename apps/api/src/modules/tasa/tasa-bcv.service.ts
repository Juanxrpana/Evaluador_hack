import type { TasaBcv } from '@repo/contracts';

const URL_TASA = 'https://ve.dolarapi.com/v1/dolares/oficial';
const CACHE_MS = 15 * 60 * 1000;

interface RespuestaDolarApi {
  fuente?: unknown;
  promedio?: unknown;
  fechaActualizacion?: unknown;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class TasaNoDisponibleError extends Error {
  constructor(message = 'No se pudo obtener la tasa BCV.') {
    super(message);
    this.name = 'TasaNoDisponibleError';
  }
}

/**
 * BCV reference rate for presentation. Amounts are stored in USD; VES is a
 * derived value. The live rate is cached for 15 minutes; if the upstream
 * fails, the last known rate is returned marked as unverified.
 */
export class TasaBcvService {
  readonly #fetch: FetchLike;
  readonly #cacheMs: number;
  #cache: { tasa: TasaBcv; at: number } | null = null;
  #ultima: TasaBcv | null = null;

  constructor(fetchImpl: FetchLike = fetch, cacheMs = CACHE_MS) {
    this.#fetch = fetchImpl;
    this.#cacheMs = cacheMs;
  }

  async obtener(): Promise<{ tasa: TasaBcv; desdeCache: boolean }> {
    if (this.#cache && Date.now() - this.#cache.at < this.#cacheMs) {
      return { tasa: this.#cache.tasa, desdeCache: true };
    }

    try {
      const respuesta = await this.#fetch(URL_TASA, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!respuesta.ok) {
        throw new Error(`la fuente respondió ${respuesta.status}`);
      }

      const datos = (await respuesta.json()) as RespuestaDolarApi;
      const promedio =
        typeof datos.promedio === 'number' && Number.isFinite(datos.promedio) && datos.promedio > 0
          ? datos.promedio
          : null;

      if (promedio === null) {
        throw new Error('la fuente no trajo un promedio válido');
      }

      const fechaCruda =
        typeof datos.fechaActualizacion === 'string' ? new Date(datos.fechaActualizacion) : null;
      const fecha =
        fechaCruda && !Number.isNaN(fechaCruda.getTime())
          ? fechaCruda.toISOString()
          : new Date().toISOString();

      const tasa: TasaBcv = {
        valor: promedio.toFixed(4),
        fuente: 'BCV (oficial)',
        fecha,
        verificada: true,
      };

      this.#cache = { tasa, at: Date.now() };
      this.#ultima = tasa;

      return { tasa, desdeCache: false };
    } catch (error) {
      if (this.#ultima) {
        return { tasa: { ...this.#ultima, verificada: false }, desdeCache: true };
      }

      throw new TasaNoDisponibleError(
        error instanceof Error
          ? `No se pudo obtener la tasa BCV: ${error.message}`
          : 'No se pudo obtener la tasa BCV.',
      );
    }
  }
}
