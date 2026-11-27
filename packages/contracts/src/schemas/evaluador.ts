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
  ubicacion: z.string().trim().max(300).nullable(),
  presupuestoReferencial: montoSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export const proyectoInput = z.object({
  nombre: z.string().trim().min(1).max(200),
  descripcion: z.string().trim().max(2000).optional(),
  ubicacion: z.string().trim().max(300).optional(),
  presupuestoReferencial: montoSchema.optional(),
});

export const proyectoUpdate = z.object({
  nombre: z.string().trim().min(1).max(200).optional(),
  descripcion: z.string().trim().max(2000).nullish(),
  ubicacion: z.string().trim().max(300).nullish(),
  presupuestoReferencial: montoSchema.nullish(),
});

export const proveedorSchema = z.object({
  id: z.uuid(),
  nombre: z.string().trim().min(1).max(200),
  contacto: z.string().trim().max(300).nullable(),
  rif: z.string().trim().max(30).nullable(),
  ubicacion: z.string().trim().max(300).nullable(),
  createdAt: z.iso.datetime(),
});

export const proveedorInput = z.object({
  nombre: z.string().trim().min(1).max(200),
  contacto: z.string().trim().max(300).optional(),
  rif: z.string().trim().max(30).optional(),
  ubicacion: z.string().trim().max(300).optional(),
});

export const proveedorUpdate = z.object({
  nombre: z.string().trim().min(1).max(200).optional(),
  contacto: z.string().trim().max(300).nullish(),
  rif: z.string().trim().max(30).nullish(),
  ubicacion: z.string().trim().max(300).nullish(),
});

export const propuestaSchema = z.object({
  id: z.uuid(),
  proyectoId: z.uuid(),
  proveedorId: z.uuid(),
  monto: montoSchema.nullable(),
  moneda: z.string().trim().max(8).nullable(),
  createdAt: z.iso.datetime(),
});

export const propuestaInput = z.object({
  proyectoId: z.uuid(),
  proveedorId: z.uuid(),
  monto: montoSchema.optional(),
  moneda: z.string().trim().max(8).optional(),
});

export const propuestaUpdate = z.object({
  monto: montoSchema.nullish(),
  moneda: z.string().trim().max(8).nullish(),
});

/** A line item extracted by the LLM (B.5): basis for arithmetic checks. */
export const propuestaItemSchema = z.object({
  id: z.uuid(),
  propuestaId: z.uuid(),
  linea: z.number().int().nonnegative(),
  nombre: z.string().trim().min(1).max(300),
  cantidad: montoSchema,
  precioUnitario: montoSchema,
  moneda: z.string().trim().max(8).nullable(),
});

/** Surcharges the LLM extracts from proposal documents (flete, %, etc.). */
export const recargoSchema = z.object({
  id: z.uuid(),
  propuestaId: z.uuid(),
  concepto: z.string().trim().min(1).max(200),
  monto: montoSchema.nullable(),
  porcentaje: montoSchema.nullable(),
  moneda: z.string().trim().max(8).nullable(),
  createdAt: z.iso.datetime(),
});

export const recargoExtraido = z.object({
  concepto: z.string().trim().min(1).max(200),
  monto: montoSchema.nullable(),
  porcentaje: montoSchema.nullable(),
});

/** Line item shape returned by the LLM extractor (B.5). */
export const recursoItemExtraido = z.object({
  nombre: z.string().trim().min(1).max(300),
  cantidad: montoSchema,
  precioUnitario: montoSchema,
  moneda: z.string().trim().max(8).nullable(),
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
  etapaId: z.uuid().nullable(),
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

/** Named process stages (E.1.b). */
export const procesoEtapaSchema = z.object({
  id: z.uuid(),
  orden: z.number().int().positive(),
  nombre: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100),
});

export const evaluacionSchema = z.object({
  id: z.uuid(),
  proyectoId: z.uuid(),
  estado: z.enum(['en_proceso', 'completada', 'fallida']),
  inicio: z.iso.datetime(),
  fin: z.iso.datetime().nullable(),
});

export const evaluacionPasoSchema = z.object({
  id: z.uuid(),
  orden: z.number().int().nonnegative(),
  descripcion: z.string(),
  detalle: z.unknown().nullable(),
  createdAt: z.iso.datetime(),
});

export const alertaSchema = z.object({
  nivel: z.enum(['info', 'advertencia', 'descarte']),
  mensaje: z.string().min(1),
  referencia: z.string().nullable(),
});

export const desviacionSchema = z.object({
  insumo: z.string(),
  precioItem: montoSchema.nullable(),
  precioReferencial: montoSchema.nullable(),
  desviacionPct: z.number().nullable(),
  fuente: z.string().nullable(),
  fuenteUrl: z.string().nullable(),
});

export const informeSchema = z.object({
  recomendada: z.uuid().nullable(),
  resumen: z.string(),
  tablaComparativa: z.array(
    z.object({
      propuestaId: z.uuid(),
      proveedor: z.string(),
      montoDeclarado: montoSchema.nullable(),
      moneda: z.string().nullable(),
      recargosFijos: montoSchema,
      recargosPorcentuales: montoSchema,
      costoTotalReal: montoSchema.nullable(),
      costoRealUsd: montoSchema.nullable(),
      puntaje: z.number().nullable(),
      decision: z.enum(['valida', 'descartada']),
    }),
  ),
  desgloses: z.array(
    z.object({
      propuestaId: z.uuid(),
      proveedor: z.string(),
      renglones: z.array(
        z.object({
          concepto: z.string(),
          tipo: z.enum(['monto_base', 'recargo_fijo', 'recargo_porcentual']),
          monto: montoSchema,
        }),
      ),
      pendientes: z.array(z.string()),
    }),
  ),
  desviaciones: z.array(z.object({ propuestaId: z.uuid(), mercado: z.array(desviacionSchema) })),
  descartes: z.array(
    z.object({ propuestaId: z.uuid(), proveedor: z.string(), causas: z.array(z.string()) }),
  ),
  alertas: z.array(alertaSchema),
  tasaBcv: montoSchema.nullable(),
  generadoEn: z.iso.datetime(),
});

export const evaluacionDetalleSchema = z.object({
  evaluacion: evaluacionSchema,
  pasos: z.array(evaluacionPasoSchema),
  propuestas: z.array(
    z.object({
      id: z.uuid(),
      propuestaId: z.uuid(),
      decision: z.enum(['valida', 'descartada']),
      causas: z.array(z.string()),
      costoReal: montoSchema.nullable(),
      puntaje: z.number().nullable(),
      notas: z.unknown(),
    }),
  ),
  informe: informeSchema.nullable(),
});

/** Roles and users (E.2.b). */
export const rolSchema = z.object({
  id: z.uuid(),
  nombre: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().max(500).nullable(),
  createdAt: z.iso.datetime(),
});

export const usuarioSchema = z.object({
  id: z.uuid(),
  nombre: z.string().trim().min(1).max(200),
  email: z.string().trim().max(300),
  rolId: z.uuid().nullable(),
  rol: z.string().trim().max(100).nullable(),
});

export const usuarioRolInput = z.object({
  rolId: z.uuid().nullable(),
});

/** Public metadata of an uploaded document. Bytes never leave the server. */
export const documentoSchema = z.object({
  id: z.uuid(),
  proyectoId: z.uuid(),
  propuestaId: z.uuid().nullable(),
  proveedorId: z.uuid().nullable(),
  nombre: z.string().trim().min(1).max(300),
  mime: z.string().max(120),
  tamanoBytes: z.number().int().positive(),
  tipo: z.enum(['propuesta', 'requerimientos']),
  createdAt: z.iso.datetime(),
});

export const documentoUploadInput = z.object({
  proyectoId: z.uuid(),
  propuestaId: z.uuid().optional(),
  proveedorId: z.uuid().optional(),
  nombre: z.string().trim().min(1).max(300),
  mime: z.enum([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]),
  tipo: z.enum(['propuesta', 'requerimientos']).default('propuesta'),
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
      moneda: z.string().trim().max(8).nullable(),
      recargos: z.number().int().nonnegative(),
      items: z.number().int().nonnegative(),
      instruccionesOcultas: z.number().int().nonnegative(),
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
export type PropuestaItem = z.infer<typeof propuestaItemSchema>;
export type Recargo = z.infer<typeof recargoSchema>;
export type RecargoExtraido = z.infer<typeof recargoExtraido>;
export type RecursoItemExtraido = z.infer<typeof recursoItemExtraido>;
export type Nota = z.infer<typeof notaSchema>;
export type NotaInput = z.infer<typeof notaInput>;
export type NotaUpdate = z.infer<typeof notaUpdate>;
export type Estatus = z.infer<typeof estatusSchema>;
export type EstatusInput = z.infer<typeof estatusInput>;
export type EstatusUpdate = z.infer<typeof estatusUpdate>;
export type Conocimiento = z.infer<typeof conocimientoSchema>;
export type ProcesoEtapa = z.infer<typeof procesoEtapaSchema>;
export type UsuarioRolInput = z.infer<typeof usuarioRolInput>;
export type Evaluacion = z.infer<typeof evaluacionSchema>;
export type EvaluacionPaso = z.infer<typeof evaluacionPasoSchema>;
export type AlertaAntecedente = z.infer<typeof alertaSchema>;
export type DesviacionMercado = z.infer<typeof desviacionSchema>;
export type InformeEvaluacion = z.infer<typeof informeSchema>;
export type EvaluacionDetalle = z.infer<typeof evaluacionDetalleSchema>;
export type Rol = z.infer<typeof rolSchema>;
export type UsuarioConRol = z.infer<typeof usuarioSchema>;
export type Documento = z.infer<typeof documentoSchema>;
export type DocumentoUploadInput = z.infer<typeof documentoUploadInput>;
export type DocumentoUploadResponse = z.infer<typeof documentoUploadResponse>;
export type HistorialEntrada = z.infer<typeof historialEntradaSchema>;
export type ProveedorHistorial = z.infer<typeof proveedorHistorialSchema>;
export type Fuente = z.infer<typeof fuenteSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatAskInput = z.infer<typeof chatAskInput>;
