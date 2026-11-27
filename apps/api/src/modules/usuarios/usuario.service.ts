import type { Rol, UsuarioConRol } from '@repo/contracts';
import type { RolReader, UsuarioReader } from './usuario.reader.ts';
import type { UsuarioTransactionRunner } from './usuario.transaction.ts';

export class UsuarioNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Usuario ${id} not found`);
    this.name = 'UsuarioNoEncontradoError';
  }
}

export class UsuarioService {
  readonly #reader: UsuarioReader;
  readonly #roles: RolReader;
  readonly #runInTransaction: UsuarioTransactionRunner;

  constructor(reader: UsuarioReader, roles: RolReader, runInTransaction: UsuarioTransactionRunner) {
    this.#reader = reader;
    this.#roles = roles;
    this.#runInTransaction = runInTransaction;
  }

  list(): Promise<UsuarioConRol[]> {
    return this.#reader.list();
  }

  roles(): Promise<Rol[]> {
    return this.#roles.list();
  }

  async asignarRol(usuarioId: string, rolId: string | null): Promise<UsuarioConRol> {
    if (rolId !== null) {
      const roles = await this.#roles.list();
      if (!roles.some((rol) => rol.id === rolId)) {
        throw new RolNoExisteError(rolId);
      }
    }

    await this.#runInTransaction(async ({ usuarios, audit }) => {
      const actualizado = await usuarios.asignarRol(usuarioId, rolId);

      if (!actualizado) {
        throw new UsuarioNoEncontradoError(usuarioId);
      }

      await audit.record({
        action: 'usuario.asignar_rol',
        resource: 'usuario',
        resourceId: usuarioId,
      });
    });

    const usuario = await this.#reader.get(usuarioId);

    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }

    return usuario;
  }
}

export class RolNoExisteError extends Error {
  constructor(id: string) {
    super(`Rol ${id} does not exist`);
    this.name = 'RolNoExisteError';
  }
}
