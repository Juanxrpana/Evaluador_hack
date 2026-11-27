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

export const proyectoUpdate = z.object({
  nombre: z.string().trim().min(1).max(200).optional(),
  descripcion: z.string().trim().max(2000).nullish(),
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

export const proveedorUpdate = z.object({
  nombre: z.string().trim().min(1).max(200).optional(),
  contacto: z.string().trim().max(300).nullish(),
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

export const propuestaUpdate = z.object({
  monto: montoSchema.nullish(),
});

/** Surcharges the LLM extracts from proposal documents (flete, etc.). */
export const recargoSchema = z.object({
  id: z.uuid(),
  propuestaId: z.uuid(),
  concepto: z.string().trim().min(1).max(200),
  monto: montoSchema,
  createdAt: z.iso.datetime(),
});

export const recargoExtraido = z.object({
  concepto: z.string().trim().min(1).max(200),
  monto: montoSchema,
});

export const notaSchema = z.object({
  id: z.uuid(),
  propuestaId: z.uuid(),
  texto: z.string().trim().min(1).max(5000),
  createdAt: z.iso.datetime(),
});

export const notaInput = z.object({
  propuestaId: z.uuid(),
  texto: z.string().trim().min(1).max(5000),
});

export const notaUpdate = z.object({
  texto: z.string().trim().min(1).max(5000),
});

export const estatusSchema = z.object({
  id: z.uuid(),
  proyectoId: z.uuid().nullable(),
  propuestaId: z.uuid().nullable(),
  estado: z.number().int().min(0).max(32767),
  comentario: z.string().trim().max(2000).nullable(),
  createdAt: z.iso.datetime(),
});

export const estatusInput = z
  .object({
    proyectoId: z.uuid().optional(),
    propuestaId: z.uuid().optional(),
    estado: z.number().int().min(0).max(32767),
    comentario: z.string().trim().max(2000).optional(),
  })
  .refine(
    (input) => Boolean(input.proyectoId) !== Boolean(input.propuestaId),
    'estatus needs exactly one of proyectoId or propuestaId',
  );

export const estatusUpdate = z.object({
  estado: z.number().int().min(0).max(32767).optional(),
  comentario: z.string().trim().max(2000).nullish(),
});

export const conocimientoSchema = z.object({
  id: z.uuid(),
  proyectoId: z.uuid(),
  titulo: z.string().nullable(),
  tipo: z.string(),
  chunkIndex: z.number().int().nullable(),
  documentoId: z.uuid().nullable(),
  contenido: z.string(),
  createdAt: z.iso.datetime(),
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
  /** LLM extraction result when the document was attached to a propuesta. */
  extraccion: z
    .object({
      montoTotal: montoSchema.nullable(),
      recargos: z.number().int().nonnegative(),
    })
    .nullable(),
});

/** One historical cost entry of a proveedor, derived from propuestas. */
export const historialEntradaSchema = z.object({
  propuestaId: z.uuid(),
  proyectoId: z.uuid(),
  proyectoNombre: z.string(),
  monto: montoSchema.nullable(),
  recargosTotal: montoSchema,
  recargos: z.array(recargoSchema),
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

/** BCV reference rate. Amounts in the system are USD; VES is a presentation currency. */
export const tasaBcvSchema = z.object({
  valor: z.string().regex(/^\d{1,8}(\.\d{1,8})?$/, 'Tasa must be a decimal'),
  fuente: z.string().trim().min(1).max(100),
  fecha: z.iso.datetime(),
  verificada: z.boolean(),
});

export type TasaBcv = z.infer<typeof tasaBcvSchema>;

export type Proyecto = z.infer<typeof proyectoSchema>;
export type ProyectoInput = z.infer<typeof proyectoInput>;
export type ProyectoUpdate = z.infer<typeof proyectoUpdate>;
export type Proveedor = z.infer<typeof proveedorSchema>;
export type ProveedorInput = z.infer<typeof proveedorInput>;
export type ProveedorUpdate = z.infer<typeof proveedorUpdate>;
export type Propuesta = z.infer<typeof propuestaSchema>;
export type PropuestaInput = z.infer<typeof propuestaInput>;
export type PropuestaUpdate = z.infer<typeof propuestaUpdate>;
export type Recargo = z.infer<typeof recargoSchema>;
export type RecargoExtraido = z.infer<typeof recargoExtraido>;
export type Nota = z.infer<typeof notaSchema>;
export type NotaInput = z.infer<typeof notaInput>;
export type NotaUpdate = z.infer<typeof notaUpdate>;
export type Estatus = z.infer<typeof estatusSchema>;
export type EstatusInput = z.infer<typeof estatusInput>;
export type EstatusUpdate = z.infer<typeof estatusUpdate>;
export type Conocimiento = z.infer<typeof conocimientoSchema>;
export type Documento = z.infer<typeof documentoSchema>;
export type DocumentoUploadInput = z.infer<typeof documentoUploadInput>;
export type DocumentoUploadResponse = z.infer<typeof documentoUploadResponse>;
export type HistorialEntrada = z.infer<typeof historialEntradaSchema>;
export type ProveedorHistorial = z.infer<typeof proveedorHistorialSchema>;
export type Fuente = z.infer<typeof fuenteSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatAskInput = z.infer<typeof chatAskInput>;
