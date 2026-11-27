import { z } from 'zod';

/**
 * Evaluator domain schemas. Zod owns the API shape; Postgres owns storage.
 * Dates and numeric amounts cross the API as strings (ISO timestamps and
 * decimal(14,2)), matching the mapper boundary on the server.
 */

const montoSchema = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Monto must be a decimal with up to 2 fraction digits');

export const proyectoSchema = z.object({
  id: z.uuid(),
  nombre: z.string().trim().min(1).max(200),
  descripcion: z.string().trim().max(2000).nullable(),
  createdAt: z.iso.datetime(),
});

export const proyectoInput = z.object({
  nombre: z.string().trim().min(1).max(200),
  descripcion: z.string().trim().max(2000).optional(),
});

export const proveedorSchema = z.object({
  id: z.uuid(),
  nombre: z.string().trim().min(1).max(200),
  contacto: z.string().trim().max(300).nullable(),
  createdAt: z.iso.datetime(),
});

export const proveedorInput = z.object({
  nombre: z.string().trim().min(1).max(200),
  contacto: z.string().trim().max(300).optional(),
});

export const propuestaSchema = z.object({
  id: z.uuid(),
  proyectoId: z.uuid(),
  proveedorId: z.uuid(),
  monto: montoSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export const propuestaInput = z.object({
  proyectoId: z.uuid(),
  proveedorId: z.uuid(),
  monto: montoSchema.optional(),
});

/** Public metadata of an uploaded document. Bytes never leave the server. */
export const documentoSchema = z.object({
  id: z.uuid(),
  proyectoId: z.uuid(),
  propuestaId: z.uuid().nullable(),
  proveedorId: z.uuid().nullable(),
  nombre: z.string().trim().min(1).max(300),
  mime: z.string().max(100),
  tamanoBytes: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});

export const documentoUploadInput = z.object({
  proyectoId: z.uuid(),
  propuestaId: z.uuid().optional(),
  proveedorId: z.uuid().optional(),
  nombre: z.string().trim().min(1).max(300),
  mime: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  contenidoBase64: z.base64().max(20_971_520),
});

export const documentoUploadResponse = z.object({
  documento: documentoSchema,
  chunks: z.number().int().nonnegative(),
  proveedorHistorialChunks: z.number().int().nonnegative().optional(),
});

/** One historical cost entry of a proveedor, derived from propuestas. */
export const historialEntradaSchema = z.object({
  propuestaId: z.uuid(),
  proyectoId: z.uuid(),
  proyectoNombre: z.string(),
  monto: montoSchema.nullable(),
  recargosTotal: montoSchema,
  estado: z.number().int().nullable(),
  createdAt: z.iso.datetime(),
});

export const proveedorHistorialSchema = z.object({
  proveedor: proveedorSchema,
  entradas: z.array(historialEntradaSchema),
  resumen: z.object({
    totalPropuestas: z.number().int().nonnegative(),
    montoPromedio: montoSchema.nullable(),
    montoMinimo: montoSchema.nullable(),
    montoMaximo: montoSchema.nullable(),
    ultimoMonto: montoSchema.nullable(),
  }),
});

export const fuenteSchema = z.object({
  id: z.uuid(),
  titulo: z.string().nullable(),
  tipo: z.string(),
  chunkIndex: z.number().int().nullable(),
});

export const chatResponseSchema = z.object({
  respuesta: z.string(),
  modelo: z.string(),
  fuentes: z.array(fuenteSchema),
});

export const chatAskInput = z.object({
  proyectoId: z.uuid(),
  propuestaId: z.uuid().optional(),
  pregunta: z.string().trim().min(3).max(4000),
});

export type Proyecto = z.infer<typeof proyectoSchema>;
export type ProyectoInput = z.infer<typeof proyectoInput>;
export type Proveedor = z.infer<typeof proveedorSchema>;
export type ProveedorInput = z.infer<typeof proveedorInput>;
export type Propuesta = z.infer<typeof propuestaSchema>;
export type PropuestaInput = z.infer<typeof propuestaInput>;
export type Documento = z.infer<typeof documentoSchema>;
export type DocumentoUploadInput = z.infer<typeof documentoUploadInput>;
export type DocumentoUploadResponse = z.infer<typeof documentoUploadResponse>;
export type HistorialEntrada = z.infer<typeof historialEntradaSchema>;
export type ProveedorHistorial = z.infer<typeof proveedorHistorialSchema>;
export type Fuente = z.infer<typeof fuenteSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatAskInput = z.infer<typeof chatAskInput>;
