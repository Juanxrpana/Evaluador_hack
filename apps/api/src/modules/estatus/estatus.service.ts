import type { Estatus } from '@repo/contracts';
import { ProyectoNoEncontradoError } from '../proyectos/proyecto.service.ts';
import type { ProyectoReader } from '../proyectos/proyecto.reader.ts';
import { PropuestaNoEncontradaError } from '../propuestas/propuesta.service.ts';
import type { PropuestaReader } from '../propuestas/propuesta.reader.ts';
import type { CreateEstatusInput, EstatusReader, UpdateEstatusInput } from './estatus.reader.ts';
import type { EstatusTransactionRunner } from './estatus.transaction.ts';

export class EstatusService {
  readonly #reader: EstatusReader;
  readonly #runInTransaction: EstatusTransactionRunner;
  readonly #proyectos: ProyectoReader;
  readonly #propuestas: PropuestaReader;

  constructor(
    reader: EstatusReader,
    runInTransaction: EstatusTransactionRunner,
    proyectos: ProyectoReader,
    propuestas: PropuestaReader,
  ) {
    this.#reader = reader;
    this.#runInTransaction = runInTransaction;
    this.#proyectos = proyectos;
    this.#propuestas = propuestas;
  }

  async list(input: { proyectoId?: string; propuestaId?: string }): Promise<Estatus[]> {
    if (input.proyectoId) {
      await this.#asegurarProyecto(input.proyectoId);
      return this.#reader.listByProyecto(input.proyectoId);
    }

    await this.#asegurarPropuesta(input.propuestaId ?? '');
    return this.#reader.listByPropuesta(input.propuestaId ?? '');
  }

  async get(id: string): Promise<Estatus> {
    const estatus = await this.#reader.get(id);

    if (!estatus) {
      throw new EstatusNoEncontradoError(id);
    }

    return estatus;
  }

  async create(input: CreateEstatusInput): Promise<Estatus> {
    if (input.proyectoId) {
      await this.#asegurarProyecto(input.proyectoId);
    } else if (input.propuestaId) {
      await this.#asegurarPropuesta(input.propuestaId);
    }

    const { id } = await this.#runInTransaction(async ({ estatus, audit }) => {
      const creado = await estatus.create(input);

      await audit.record({
        action: 'estatus.create',
        resource: 'estatus',
        resourceId: creado.id,
      });

      return creado;
    });

    return this.get(id);
  }

  async actualizar(id: string, input: UpdateEstatusInput): Promise<Estatus> {
    await this.#runInTransaction(async ({ estatus, audit }) => {
      const actualizado = await estatus.update(id, input);

      if (!actualizado) {
        throw new EstatusNoEncontradoError(id);
      }

      await audit.record({
        action: 'estatus.update',
        resource: 'estatus',
        resourceId: id,
      });
    });

    return this.get(id);
  }

  async eliminar(id: string): Promise<{ id: string }> {
    return this.#runInTransaction(async ({ estatus, audit }) => {
      const eliminado = await estatus.remove(id);

      if (!eliminado) {
        throw new EstatusNoEncontradoError(id);
      }

      await audit.record({
        action: 'estatus.delete',
        resource: 'estatus',
        resourceId: id,
      });

      return { id };
    });
  }

  async #asegurarProyecto(proyectoId: string): Promise<void> {
    const proyecto = await this.#proyectos.get(proyectoId);

    if (!proyecto) {
      throw new ProyectoNoEncontradoError(proyectoId);
    }
  }

  async #asegurarPropuesta(propuestaId: string): Promise<void> {
    const propuesta = await this.#propuestas.get(propuestaId);

    if (!propuesta) {
      throw new PropuestaNoEncontradaError(propuestaId);
    }
  }
}

export class EstatusNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Estatus ${id} not found`);
    this.name = 'EstatusNoEncontradoError';
  }
}
