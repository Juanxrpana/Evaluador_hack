import type { Correo, CorreoAdjuntoContenido, CorreoDetalle } from '@repo/contracts';
import type {
  CorreoAdjuntoDescargaInput,
  CorreoDetalleInput,
  CorreoListarInput,
  CorreoProvider,
} from './correo.provider.ts';

export class CorreoNoDisponibleError extends Error {
  constructor(cause?: unknown) {
    super('El servidor de correo no está disponible o las credenciales son inválidas');
    this.name = 'CorreoNoDisponibleError';
    this.cause = cause;
  }
}

export class CorreoNoEncontradoError extends Error {
  constructor(uid: number) {
    super(`Correo ${uid} no encontrado o sin adjuntos`);
    this.name = 'CorreoNoEncontradoError';
  }
}

export class AdjuntoDemasiadoGrandeError extends Error {
  constructor(tamanoBytes: number) {
    super(`El adjunto (${tamanoBytes} bytes) supera el límite de descarga`);
    this.name = 'AdjuntoDemasiadoGrandeError';
  }
}

/** Stateless service: v1 scans the mailbox on demand, nothing is persisted. */
export class CorreoService {
  readonly #provider: CorreoProvider;

  constructor(provider: CorreoProvider) {
    this.#provider = provider;
  }

  async listar(input: CorreoListarInput): Promise<Correo[]> {
    return this.#provider.listarConAdjuntos(input);
  }

  async obtenerDetalle(input: CorreoDetalleInput): Promise<CorreoDetalle> {
    return this.#provider.obtenerDetalle(input);
  }

  async descargarAdjunto(input: CorreoAdjuntoDescargaInput): Promise<CorreoAdjuntoContenido> {
    return this.#provider.descargarAdjunto(input);
  }
}
