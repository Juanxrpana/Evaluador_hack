import { z } from 'zod';

/**
 * Correo domain schemas. Only metadata crosses the API: the IMAP adapter
 * reads envelopes and BODYSTRUCTURE data, never attachment bytes.
 */

export const correoAdjuntoSchema = z.object({
  nombre: z.string().trim().min(1).max(300),
  mime: z.string().max(100),
  tamanoBytes: z.number().int().nonnegative(),
  parte: z.string().trim().min(1).max(20),
});

export const correoSchema = z.object({
  uid: z.number().int().positive(),
  messageId: z.string().trim().min(1).max(200),
  de: z.string().trim().max(500),
  asunto: z.string().trim().max(1000),
  fecha: z.iso.datetime(),
  carpeta: z.string().trim().min(1).max(200),
  adjuntos: z.array(correoAdjuntoSchema).min(1),
});

export const correoListInput = z.object({
  carpeta: z.string().trim().min(1).max(200).default('INBOX'),
  // Coerced: GET query params cross the wire as strings.
  limite: z.coerce.number().int().min(1).max(200).default(50),
});

/** Full view of one correo, including its decoded text body. */
export const correoDetalleSchema = z.object({
  uid: z.number().int().positive(),
  messageId: z.string().trim().min(1).max(200),
  de: z.string().trim().max(500),
  para: z.string().trim().max(1000),
  asunto: z.string().trim().max(1000),
  fecha: z.iso.datetime(),
  carpeta: z.string().trim().min(1).max(200),
  cuerpo: z.string(),
  adjuntos: z.array(correoAdjuntoSchema).min(1),
});

export const correoGetInput = z.object({
  uid: z.coerce.number().int().positive(),
  carpeta: z.string().trim().min(1).max(200).default('INBOX'),
});

/** Download one attachment (decoded) as base64. POST to avoid GET query quirks. */
export const correoAdjuntoInput = z.object({
  uid: z.number().int().positive(),
  parte: z.string().trim().min(1).max(20),
  carpeta: z.string().trim().min(1).max(200).default('INBOX'),
});

// 25 MiB of bytes is ~34 MiB of base64. Gmail caps attachments at 25 MiB anyway.
export const correoAdjuntoContenidoSchema = z.object({
  nombre: z.string().trim().min(1).max(300),
  mime: z.string().max(100),
  contenidoBase64: z.base64().max(34_000_000),
});

export type CorreoAdjunto = z.infer<typeof correoAdjuntoSchema>;
export type Correo = z.infer<typeof correoSchema>;
export type CorreoListInput = z.infer<typeof correoListInput>;
export type CorreoDetalle = z.infer<typeof correoDetalleSchema>;
export type CorreoGetInput = z.infer<typeof correoGetInput>;
export type CorreoAdjuntoInput = z.infer<typeof correoAdjuntoInput>;
export type CorreoAdjuntoContenido = z.infer<typeof correoAdjuntoContenidoSchema>;
