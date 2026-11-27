import type { ProcesoEtapa } from '@repo/contracts';
import type { EtapasReader } from './postgres-etapas.reader.ts';

/** E.1.b: the named process stage catalog (Recepción → … → Cerrado). */
export class EtapasService {
  readonly #reader: EtapasReader;

  constructor(reader: EtapasReader) {
    this.#reader = reader;
  }

  list(): Promise<ProcesoEtapa[]> {
    return this.#reader.list();
  }

  async ordenDe(etapaId: string): Promise<number | null> {
    const etapas = await this.#reader.list();
    const etapa = etapas.find((item) => item.id === etapaId);

    return etapa?.orden ?? null;
  }
}
