import type { UsuarioConRol } from '@repo/contracts';

export interface UsuarioWriter {
  asignarRol(usuarioId: string, rolId: string | null): Promise<boolean>;
}

export type { UsuarioConRol };
