import { createHash } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { TasaCambio, TasaClient } from './tasa.client.ts';

const URL_BCV = 'https://ve.dolarapi.com/v1/dolares';
interface DolarApiRespuesta {
  nombre?: string;
  fuente?: string;
  promedio?: number;
  rate?: number;
}

/**
 * Official BCV rate via ve.dolarapi.com with a daily cache row in `tasa_bcv`.
 * On any failure it returns null so evaluations continue without currency
 * conversion instead of aborting.
 */
export class BcvTasaClient implements TasaClient {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async obtenerTasa(): Promise<TasaCambio | null> {
    const fecha = new Date().toISOString().slice(0, 10);

    const cacheada = await this.#db
      .selectFrom('tasa_bcv')
      .select(['tasa', 'fuente', 'fecha'])
      .where('fecha', '=', new Date(fecha))
      .executeTakeFirst();

    if (cacheada) {
      return { tasa: cacheada.tasa, fuente: cacheada.fuente, fecha };
    }

    const remota = await this.#consultarApi();
    if (!remota || remota.tasa === null) {
      return null;
    }

    await this.#db
      .insertInto('tasa_bcv')
      .values({
        fecha: new Date(fecha),
        tasa: remota.tasa,
        fuente: remota.fuente,
      })
      .onConflict((oc) => oc.column('fecha').doNothing())
      .execute();

    return remota;
  }

  async #consultarApi(): Promise<{ tasa: string; fuente: string; fecha: string } | null> {
    try {
      const respuesta = await fetch(URL_BCV, { signal: AbortSignal.timeout(10_000) });

      if (!respuesta.ok) {
        return null;
      }

      const datos = (await respuesta.json()) as DolarApiRespuesta[];
      const oficial = Array.isArray(datos)
        ? datos.find(
            (dolar) => /oficial/i.test(dolar.fuente ?? '') || /oficial/i.test(dolar.nombre ?? ''),
          )
        : undefined;
      const bruto = oficial?.promedio ?? oficial?.rate;

      if (typeof bruto !== 'number' || !Number.isFinite(bruto) || bruto <= 0) {
        return null;
      }

      return {
        tasa: bruto.toFixed(4),
        fuente: URL_BCV,
        fecha: new Date().toISOString().slice(0, 10),
      };
    } catch {
      return null;
    }
  }
}

/** Stable cache key: the insumo name plus its specs, nothing else (F.3). */
export function claveDeInvestigacion(nombre: string, especificaciones: string[]): string {
  return createHash('sha256')
    .update(`${nombre.toLowerCase()}|${especificaciones.join('|').toLowerCase()}`)
    .digest('hex')
    .slice(0, 24);
}
