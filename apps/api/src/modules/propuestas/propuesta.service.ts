import type { Propuesta } from '@repo/contracts';
import { ProyectoNoEncontradoError } from '../proyectos/proyecto.service.ts';
import { ProveedorNoEncontradoError } from '../proveedores/proveedor.service.ts';
import type { ProveedorReader } from '../proveedores/proveedor.reader.ts';
import type { ProyectoReader } from '../proyectos/proyecto.reader.ts';
import type { CreatePropuestaInput, PropuestaReader } from './propuesta.reader.ts';
import type { PropuestaTransactionRunner } from './propuesta.transaction.ts';

export class PropuestaService {
  readonly #reader: PropuestaReader;
  readonly #runInTransaction: PropuestaTransactionRunner;
  readonly #proyectos: ProyectoReader;
  readonly #proveedores: ProveedorReader;

  constructor(
    reader: PropuestaReader,
    runInTransaction: PropuestaTransactionRunner,
    proyectos: ProyectoReader,
    proveedores: ProveedorReader,
  ) {
    this.#reader = reader;
    this.#runInTransaction = runInTransaction;
    this.#proyectos = proyectos;
    this.#proveedores = proveedores;
  }

  async get(id: string): Promise<Propuesta> {
    const propuesta = await this.#reader.get(id);

    if (!propuesta) {
      throw new PropuestaNoEncontradaError(id);
    }

    return propuesta;
  }

  listByProyecto(proyectoId: string): Promise<Propuesta[]> {
    return this.#reader.listByProyecto(proyectoId);
  }

  async create(input: CreatePropuestaInput): Promise<Propuesta> {
    const proyecto = await this.#proyectos.get(input.proyectoId);
    if (!proyecto) {
      throw new ProyectoNoEncontradoError(input.proyectoId);
    }

    const proveedor = await this.#proveedores.get(input.proveedorId);
    if (!proveedor) {
      throw new ProveedorNoEncontradoError(input.proveedorId);
    }

    const { id } = await this.#runInTransaction(async ({ propuestas, audit }) => {
      const creada = await propuestas.create(input);

      await audit.record({
        action: 'propuesta.create',
        resource: 'propuesta',
        resourceId: creada.id,
      });

      return creada;
    });

    const creada = await this.#reader.get(id);

    if (!creada) {
      throw new PropuestaNoEncontradaError(id);
    }

    return creada;
  }
}

export class PropuestaNoEncontradaError extends Error {
  constructor(id: string) {
    super(`Propuesta ${id} not found`);
    this.name = 'PropuestaNoEncontradaError';
  }
}
