import type { Proveedor, ProveedorHistorial } from '@repo/contracts';
import type {
  CreateProveedorInput,
  ProveedorReader,
  UpdateProveedorInput,
} from './proveedor.reader.ts';
import type { ProveedorTransactionRunner } from './proveedor.transaction.ts';

export class ProveedorService {
  readonly #reader: ProveedorReader;
  readonly #runInTransaction: ProveedorTransactionRunner;

  constructor(reader: ProveedorReader, runInTransaction: ProveedorTransactionRunner) {
    this.#reader = reader;
    this.#runInTransaction = runInTransaction;
  }

  list(): Promise<Proveedor[]> {
    return this.#reader.list();
  }

  async get(id: string): Promise<Proveedor> {
    const proveedor = await this.#reader.get(id);

    if (!proveedor) {
      throw new ProveedorNoEncontradoError(id);
    }

    return proveedor;
  }

  historial(id: string): Promise<ProveedorHistorial> {
    return this.#reader.historial(id).then((historial) => {
      if (!historial) {
        throw new ProveedorNoEncontradoError(id);
      }

      return historial;
    });
  }

  async create(input: CreateProveedorInput): Promise<Proveedor> {
    const { id } = await this.#runInTransaction(async ({ proveedores, audit }) => {
      const creado = await proveedores.create(input);

      await audit.record({
        action: 'proveedor.create',
        resource: 'proveedor',
        resourceId: creado.id,
      });

      return creado;
    });

    const creado = await this.#reader.get(id);

    if (!creado) {
      throw new ProveedorNoEncontradoError(id);
    }

    return creado;
  }

  async actualizar(id: string, input: UpdateProveedorInput): Promise<Proveedor> {
    await this.#runInTransaction(async ({ proveedores, audit }) => {
      const actualizado = await proveedores.update(id, input);

      if (!actualizado) {
        throw new ProveedorNoEncontradoError(id);
      }

      await audit.record({
        action: 'proveedor.update',
        resource: 'proveedor',
        resourceId: id,
      });
    });

    const actualizado = await this.#reader.get(id);

    if (!actualizado) {
      throw new ProveedorNoEncontradoError(id);
    }

    return actualizado;
  }

  async eliminar(id: string): Promise<{ id: string }> {
    return this.#runInTransaction(async ({ proveedores, audit }) => {
      const eliminado = await proveedores.remove(id);

      if (!eliminado) {
        throw new ProveedorNoEncontradoError(id);
      }

      await audit.record({
        action: 'proveedor.delete',
        resource: 'proveedor',
        resourceId: id,
      });

      return { id };
    });
  }
}

export class ProveedorNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Proveedor ${id} not found`);
    this.name = 'ProveedorNoEncontradoError';
  }
}
