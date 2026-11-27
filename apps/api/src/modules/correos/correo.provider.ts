import type { Correo, CorreoAdjuntoContenido, CorreoDetalle } from '@repo/contracts';

export interface CorreoListarInput {
  carpeta: string;
  limite: number;
}

export interface CorreoDetalleInput {
  uid: number;
  carpeta: string;
}

export interface CorreoAdjuntoDescargaInput {
  uid: number;
  parte: string;
  carpeta: string;
}

/** Port: the only way the service talks to any mailbox (IMAP, Gmail API, ...). */
export interface CorreoProvider {
  /** Returns only messages that have at least one attachment. */
  listarConAdjuntos(input: CorreoListarInput): Promise<Correo[]>;
  /** Full view of one message, with its decoded text body. */
  obtenerDetalle(input: CorreoDetalleInput): Promise<CorreoDetalle>;
  /** Downloads and decodes one attachment. */
  descargarAdjunto(input: CorreoAdjuntoDescargaInput): Promise<CorreoAdjuntoContenido>;
}
