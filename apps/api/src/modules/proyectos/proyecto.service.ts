import type { Proyecto } from '@repo/contracts';
import type { ProyectoReader, CreateProyectoInput } from './proyecto.reader.ts';
import type { ProyectoTransactionRunner } from './proyecto.transaction.ts';

/**
 * Application service for proyecto use cases. Owns the transaction boundary:
 * the router never opens a transaction and never sees Kysely. The durable
 * audit row commits together with the proyecto.
 */
export class ProyectoService {
  readonly #reader: ProyectoReader;
  readonly #runInTransaction: ProyectoTransactionRunner;

  constructor(reader: ProyectoReader, runInTransaction: ProyectoTransactionRunner) {
    this.#reader = reader;
    this.#runInTransaction = runInTransaction;
  }

  list(): Promise<Proyecto[]> {
    return this.#reader.list();
  }

  async get(id: string): Promise<Proyecto> {
    const proyecto = await this.#reader.get(id);

    if (!proyecto) {
      throw new ProyectoNoEncontradoError(id);
    }

    return proyecto;
  }

  async create(input: CreateProyectoInput): Promise<Proyecto> {
    const { id } = await this.#runInTransaction(async ({ proyectos, audit }) => {
      const creado = await proyectos.create(input);

      await audit.record({
        action: 'proyecto.create',
        resource: 'proyecto',
        resourceId: creado.id,
      });

      return creado;
    });

    const creado = await this.#reader.get(id);

    if (!creado) {
      throw new ProyectoNoEncontradoError(id);
    }

    return creado;
  }
}

export class ProyectoNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Proyecto ${id} not found`);
    this.name = 'ProyectoNoEncontradoError';
  }
}
