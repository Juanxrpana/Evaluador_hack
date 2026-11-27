import type { Rol } from '@repo/contracts';

export interface UsuarioConRol {
  id: string;
  nombre: string;
  email: string;
  rolId: string | null;
  rol: string | null;
}

export interface UsuarioReader {
  list(): Promise<UsuarioConRol[]>;
  get(id: string): Promise<UsuarioConRol | null>;
}

export interface RolReader {
  list(): Promise<Rol[]>;
}

export type { Rol };
