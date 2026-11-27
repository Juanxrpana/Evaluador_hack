import type { Rol } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toIsoString } from '../documentos/documento.mapper.ts';
import type { RolReader, UsuarioReader, UsuarioConRol } from './usuario.reader.ts';

export class PostgresUsuarioReader implements UsuarioReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async list(): Promise<UsuarioConRol[]> {
    const filas = await this.#db
      .selectFrom('users')
      .leftJoin('rol', 'rol.id', 'users.rol_id')
      .select(['users.id', 'users.name', 'users.email', 'users.rol_id', 'rol.nombre as rolNombre'])
      .orderBy('users.created_at', 'asc')
      .execute();

    return filas.map((fila) => ({
      id: fila.id,
      nombre: fila.name,
      email: fila.email,
      rolId: fila.rol_id,
      rol: fila.rolNombre ?? null,
    }));
  }

  async get(id: string): Promise<UsuarioConRol | null> {
    const fila = await this.#db
      .selectFrom('users')
      .leftJoin('rol', 'rol.id', 'users.rol_id')
      .select(['users.id', 'users.name', 'users.email', 'users.rol_id', 'rol.nombre as rolNombre'])
      .where('users.id', '=', id)
      .executeTakeFirst();

    return fila
      ? {
          id: fila.id,
          nombre: fila.name,
          email: fila.email,
          rolId: fila.rol_id,
          rol: fila.rolNombre ?? null,
        }
      : null;
  }
}

export class PostgresRolReader implements RolReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async list(): Promise<Rol[]> {
    const filas = await this.#db.selectFrom('rol').selectAll().orderBy('nombre', 'asc').execute();

    return filas.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      createdAt: toIsoString(fila.created_at),
    }));
  }
}
