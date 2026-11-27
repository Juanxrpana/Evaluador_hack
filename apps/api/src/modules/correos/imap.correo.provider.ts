import { ImapFlow, type MessageStructureObject, type MessageAddressObject } from 'imapflow';
import type { Correo, CorreoAdjunto, CorreoAdjuntoContenido, CorreoDetalle } from '@repo/contracts';
import { env } from '../../config/env.ts';
import type {
  CorreoAdjuntoDescargaInput,
  CorreoDetalleInput,
  CorreoListarInput,
  CorreoProvider,
} from './correo.provider.ts';
import {
  AdjuntoDemasiadoGrandeError,
  CorreoNoDisponibleError,
  CorreoNoEncontradoError,
} from './correo.service.ts';

const CUERPO_MAX_CARACTERES = 100_000;
const ADJUNTO_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Attachment nodes live anywhere in the MIME tree, so this walks the whole
 * structure. Only metadata is read (BODYSTRUCTURE); bytes are never fetched.
 */
function extraerAdjuntos(node: MessageStructureObject | undefined): CorreoAdjunto[] {
  if (!node) {
    return [];
  }

  const encontrados: CorreoAdjunto[] = [];

  const esAdjunto =
    node.disposition?.toLowerCase() === 'attachment' ||
    (node.dispositionParameters?.filename ?? undefined) !== undefined;

  if (esAdjunto) {
    const nombre = node.dispositionParameters?.filename ?? node.id ?? 'adjunto';
    encontrados.push({
      nombre,
      mime: node.type ?? 'application/octet-stream',
      tamanoBytes: node.size ?? 0,
      parte: node.part || '1',
    });
  }

  for (const hijo of node.childNodes ?? []) {
    encontrados.push(...extraerAdjuntos(hijo));
  }

  return encontrados;
}

/** First readable text part (never an attachment) and its part number. */
function parteDeTexto(node: MessageStructureObject | undefined): MessageStructureObject | null {
  if (!node) {
    return null;
  }

  if (node.type === 'text/plain' && node.disposition?.toLowerCase() !== 'attachment') {
    return node;
  }

  for (const hijo of node.childNodes ?? []) {
    const encontrado = parteDeTexto(hijo);
    if (encontrado) {
      return encontrado;
    }
  }

  return null;
}

/** Finds a MIME part by its part number, anywhere in the tree. */
function buscarParte(
  node: MessageStructureObject | undefined,
  parte: string,
): MessageStructureObject | null {
  if (!node) {
    return null;
  }

  if (node.part === parte) {
    return node;
  }

  for (const hijo of node.childNodes ?? []) {
    const encontrado = buscarParte(hijo, parte);
    if (encontrado) {
      return encontrado;
    }
  }

  return null;
}

function direccionesATexto(direcciones: MessageAddressObject[] | undefined): string {
  const texto = (direcciones ?? [])
    .map((direccion) => {
      const correo = direccion.address ?? '';
      return direccion.name ? `${direccion.name} <${correo}>` : correo;
    })
    .filter(Boolean)
    .join(', ');

  return texto || '(sin remitente)';
}

/** Adapter: talks IMAP so the rest of the app never imports imapflow. */
export class ImapCorreoProvider implements CorreoProvider {
  private crearCliente(): ImapFlow {
    return new ImapFlow({
      host: env.IMAP_HOST,
      port: env.IMAP_PORT,
      secure: env.IMAP_TLS,
      auth: { user: env.IMAP_USER, pass: env.IMAP_PASSWORD },
      logger: false,
    });
  }

  async listarConAdjuntos(input: CorreoListarInput): Promise<Correo[]> {
    // Module disabled (no host configured) behaves like an empty mailbox.
    if (!env.IMAP_HOST || !env.IMAP_USER) {
      return [];
    }

    const client = this.crearCliente();

    try {
      await client.connect();
      const lock = await client.getMailboxLock(input.carpeta);
      const encontrados: Correo[] = [];

      try {
        for await (const mensaje of client.fetch(
          { all: true },
          { envelope: true, bodyStructure: true },
        )) {
          const adjuntos = extraerAdjuntos(mensaje.bodyStructure);

          if (adjuntos.length === 0) {
            continue;
          }

          encontrados.push({
            uid: mensaje.uid,
            messageId: mensaje.envelope?.messageId ?? `uid-${mensaje.uid}`,
            de: direccionesATexto(mensaje.envelope?.from),
            asunto: mensaje.envelope?.subject?.slice(0, 1000) || '(sin asunto)',
            fecha: (mensaje.envelope?.date ?? new Date()).toISOString(),
            carpeta: input.carpeta,
            adjuntos,
          });
        }
      } finally {
        lock.release();
      }

      // Arrival order (newest first), independent of the server fetch order.
      encontrados.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

      return encontrados.slice(0, input.limite);
    } catch (cause) {
      // Never surface provider internals (or the password) to callers.
      throw new CorreoNoDisponibleError(cause);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  async obtenerDetalle(input: CorreoDetalleInput): Promise<CorreoDetalle> {
    if (!env.IMAP_HOST || !env.IMAP_USER) {
      throw new CorreoNoDisponibleError();
    }

    const client = this.crearCliente();

    try {
      await client.connect();
      const lock = await client.getMailboxLock(input.carpeta);

      try {
        // Sequence strings with the { uid: true } option: IMAP sequence
        // numbers shift on expunge, so we always address messages by UID.
        const mensaje = await client.fetchOne(
          String(input.uid),
          { envelope: true, bodyStructure: true },
          { uid: true },
        );

        if (!mensaje) {
          throw new CorreoNoEncontradoError(input.uid);
        }

        // Only the text part is downloaded; attachments stay on the server.
        const parteTexto = parteDeTexto(mensaje.bodyStructure);
        let cuerpo = '';

        if (parteTexto?.part) {
          const descarga = await client.download(String(input.uid), parteTexto.part, { uid: true });
          const chunks: Buffer[] = [];

          for await (const chunk of descarga?.content ?? []) {
            chunks.push(chunk);
          }

          // A downloaded body part arrives already MIME-decoded (no RFC822
          // headers), so it just needs the charset from its Content-Type.
          const charset = (parteTexto.parameters?.charset ?? 'utf-8').toLowerCase();
          const texto = Buffer.concat(chunks).toString(charset as BufferEncoding);
          cuerpo = texto.slice(0, CUERPO_MAX_CARACTERES);
        }

        const adjuntos = extraerAdjuntos(mensaje.bodyStructure);

        if (adjuntos.length === 0) {
          throw new CorreoNoEncontradoError(input.uid);
        }

        return {
          uid: mensaje.uid,
          messageId: mensaje.envelope?.messageId ?? `uid-${mensaje.uid}`,
          de: direccionesATexto(mensaje.envelope?.from),
          para: direccionesATexto(mensaje.envelope?.to),
          asunto: mensaje.envelope?.subject?.slice(0, 1000) || '(sin asunto)',
          fecha: (mensaje.envelope?.date ?? new Date()).toISOString(),
          carpeta: input.carpeta,
          cuerpo,
          adjuntos,
        };
      } finally {
        lock.release();
      }
    } catch (cause) {
      if (cause instanceof CorreoNoEncontradoError) {
        throw cause;
      }

      throw new CorreoNoDisponibleError(cause);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /** Downloads one MIME part; imapflow hands us the transfer-decoded bytes. */
  async descargarAdjunto(input: CorreoAdjuntoDescargaInput): Promise<CorreoAdjuntoContenido> {
    if (!env.IMAP_HOST || !env.IMAP_USER) {
      throw new CorreoNoDisponibleError();
    }

    const client = this.crearCliente();

    try {
      await client.connect();
      const lock = await client.getMailboxLock(input.carpeta);

      try {
        const mensaje = await client.fetchOne(
          String(input.uid),
          { bodyStructure: true },
          { uid: true },
        );

        if (!mensaje) {
          throw new CorreoNoEncontradoError(input.uid);
        }

        const nodo = buscarParte(mensaje.bodyStructure, input.parte);

        if (!nodo) {
          throw new CorreoNoEncontradoError(input.uid);
        }

        const tamano = nodo.size ?? 0;

        if (tamano > ADJUNTO_MAX_BYTES) {
          throw new AdjuntoDemasiadoGrandeError(tamano);
        }

        const nombre = nodo.dispositionParameters?.filename ?? nodo.id ?? 'adjunto';
        const mime = nodo.type ?? 'application/octet-stream';

        const descarga = await client.download(String(input.uid), input.parte, { uid: true });
        const chunks: Buffer[] = [];

        for await (const chunk of descarga?.content ?? []) {
          chunks.push(chunk);
        }

        return {
          nombre,
          mime,
          contenidoBase64: Buffer.concat(chunks).toString('base64'),
        };
      } finally {
        lock.release();
      }
    } catch (cause) {
      if (
        cause instanceof CorreoNoEncontradoError ||
        cause instanceof AdjuntoDemasiadoGrandeError
      ) {
        throw cause;
      }

      throw new CorreoNoDisponibleError(cause);
    } finally {
      await client.logout().catch(() => {});
    }
  }
}
