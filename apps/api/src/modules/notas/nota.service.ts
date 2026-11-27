import type { Nota } from '@repo/contracts';
import { PropuestaNoEncontradaError } from '../propuestas/propuesta.service.ts';
import type { PropuestaReader } from '../propuestas/propuesta.reader.ts';
import type { CreateNotaInput, NotaReader, UpdateNotaInput } from './nota.reader.ts';
import type { NotaTransactionRunner } from './nota.transaction.ts';

export class NotaService {
  readonly #reader: NotaReader;
  readonly #runInTransaction: NotaTransactionRunner;
  readonly #propuestas: PropuestaReader;

  constructor(
    reader: NotaReader,
    runInTransaction: NotaTransactionRunner,
    propuestas: PropuestaReader,
  ) {
    this.#reader = reader;
    this.#runInTransaction = runInTransaction;
    this.#propuestas = propuestas;
  }

  async listByPropuesta(propuestaId: string): Promise<Nota[]> {
    await this.#asegurarPropuesta(propuestaId);
    return this.#reader.listByPropuesta(propuestaId);
  }

  async create(input: CreateNotaInput): Promise<Nota> {
    await this.#asegurarPropuesta(input.propuestaId);

    const { id } = await this.#runInTransaction(async ({ notas, audit }) => {
      const creada = await notas.create(input);

      await audit.record({
        action: 'nota.create',
        resource: 'nota',
        resourceId: creada.id,
      });

      return creada;
    });

    const creada = await this.#reader.get(id);

    if (!creada) {
      throw new NotaNoEncontradaError(id);
    }

    return creada;
  }

  async actualizar(id: string, input: UpdateNotaInput): Promise<Nota> {
    await this.#runInTransaction(async ({ notas, audit }) => {
      const actualizada = await notas.update(id, input);

      if (!actualizada) {
        throw new NotaNoEncontradaError(id);
      }

      await audit.record({
        action: 'nota.update',
        resource: 'nota',
        resourceId: id,
      });
    });

    const actualizada = await this.#reader.get(id);

    if (!actualizada) {
      throw new NotaNoEncontradaError(id);
    }

    return actualizada;
  }

  async eliminar(id: string): Promise<{ id: string }> {
    return this.#runInTransaction(async ({ notas, audit }) => {
      const eliminada = await notas.remove(id);

      if (!eliminada) {
        throw new NotaNoEncontradaError(id);
      }

      await audit.record({
        action: 'nota.delete',
        resource: 'nota',
        resourceId: id,
      });

      return { id };
    });
  }

  async #asegurarPropuesta(propuestaId: string): Promise<void> {
    const propuesta = await this.#propuestas.get(propuestaId);

    if (!propuesta) {
      throw new PropuestaNoEncontradaError(propuestaId);
    }
  }
}

export class NotaNoEncontradaError extends Error {
  constructor(id: string) {
    super(`Nota ${id} not found`);
    this.name = 'NotaNoEncontradaError';
  }
}
