import { oc } from '@orpc/contract';
import { z } from 'zod';
import { healthResponseSchema } from './schemas/health.ts';
import { userSchema } from './schemas/user.ts';
import {
  alertaSchema,
  chatAskInput,
  chatResponseSchema,
  conocimientoSchema,
  documentoSchema,
  documentoUploadInput,
  documentoUploadResponse,
  evaluacionDetalleSchema,
  evaluacionSchema,
  estatusInput,
  estatusSchema,
  estatusUpdate,
  notaInput,
  notaSchema,
  notaUpdate,
  procesoEtapaSchema,
  proyectoInput,
  proyectoSchema,
  proyectoUpdate,
  proveedorHistorialSchema,
  proveedorInput,
  proveedorSchema,
  proveedorUpdate,
  propuestaItemSchema,
  propuestaInput,
  propuestaSchema,
  propuestaUpdate,
  recargoSchema,
  rolSchema,
  usuarioRolInput,
  usuarioSchema,
} from './schemas/evaluador.ts';

/**
 * The API contract is the single source of truth for:
 * - server-side input/output validation,
 * - server handler types,
 * - client types,
 * - OpenAPI generation.
 *
 * The Zod schemas are also reused by React Hook Form.
 */
export const contract = {
  health: oc
    .route({
      method: 'GET',
      path: '/health',
      tags: ['system'],
      summary: 'Health check',
    })
    .output(healthResponseSchema),

  users: {
    list: oc
      .route({
        method: 'GET',
        path: '/users',
        tags: ['users'],
        summary: 'List users',
      })
      .output(z.array(userSchema)),
  },

  proyectos: {
    list: oc
      .route({
        method: 'GET',
        path: '/proyectos',
        tags: ['evaluador'],
        summary: 'List proyectos',
      })
      .output(z.array(proyectoSchema)),
    get: oc
      .route({
        method: 'GET',
        path: '/proyectos/{id}',
        tags: ['evaluador'],
        summary: 'Get one proyecto',
      })
      .input(z.object({ id: z.uuid() }))
      .output(proyectoSchema),
    create: oc
      .route({
        method: 'POST',
        path: '/proyectos',
        tags: ['evaluador'],
        summary: 'Create a proyecto',
      })
      .input(proyectoInput)
      .output(proyectoSchema),
    update: oc
      .route({
        method: 'PATCH',
        path: '/proyectos/{id}',
        tags: ['evaluador'],
        summary: 'Update a proyecto',
      })
      .input(z.object({ id: z.uuid() }).extend(proyectoUpdate.shape))
      .output(proyectoSchema),
    delete: oc
      .route({
        method: 'DELETE',
        path: '/proyectos/{id}',
        tags: ['evaluador'],
        summary: 'Delete a proyecto (cascades propuestas, documentos and knowledge)',
      })
      .input(z.object({ id: z.uuid() }))
      .output(z.object({ id: z.uuid() })),
  },

  proveedores: {
    list: oc
      .route({
        method: 'GET',
        path: '/proveedores',
        tags: ['evaluador'],
        summary: 'List proveedores',
      })
      .output(z.array(proveedorSchema)),
    get: oc
      .route({
        method: 'GET',
        path: '/proveedores/{id}',
        tags: ['evaluador'],
        summary: 'Get one proveedor',
      })
      .input(z.object({ id: z.uuid() }))
      .output(proveedorSchema),
    create: oc
      .route({
        method: 'POST',
        path: '/proveedores',
        tags: ['evaluador'],
        summary: 'Create a proveedor',
      })
      .input(proveedorInput)
      .output(proveedorSchema),
    update: oc
      .route({
        method: 'PATCH',
        path: '/proveedores/{id}',
        tags: ['evaluador'],
        summary: 'Update a proveedor',
      })
      .input(z.object({ id: z.uuid() }).extend(proveedorUpdate.shape))
      .output(proveedorSchema),
    delete: oc
      .route({
        method: 'DELETE',
        path: '/proveedores/{id}',
        tags: ['evaluador'],
        summary: 'Delete a proveedor (rejected while it has propuestas)',
      })
      .input(z.object({ id: z.uuid() }))
      .output(z.object({ id: z.uuid() })),
    historial: oc
      .route({
        method: 'GET',
        path: '/proveedores/{id}/historial',
        tags: ['evaluador'],
        summary: 'Cost history of a proveedor across proyectos',
      })
      .input(z.object({ id: z.uuid() }))
      .output(proveedorHistorialSchema),
  },

  propuestas: {
    list: oc
      .route({
        method: 'GET',
        path: '/propuestas',
        tags: ['evaluador'],
        summary: 'List propuestas of a proyecto',
      })
      .input(z.object({ proyectoId: z.uuid() }))
      .output(z.array(propuestaSchema)),
    get: oc
      .route({
        method: 'GET',
        path: '/propuestas/{id}',
        tags: ['evaluador'],
        summary: 'Get one propuesta',
      })
      .input(z.object({ id: z.uuid() }))
      .output(propuestaSchema),
    create: oc
      .route({
        method: 'POST',
        path: '/propuestas',
        tags: ['evaluador'],
        summary: 'Create a propuesta',
      })
      .input(propuestaInput)
      .output(propuestaSchema),
    update: oc
      .route({
        method: 'PATCH',
        path: '/propuestas/{id}',
        tags: ['evaluador'],
        summary: 'Update the monto of a propuesta',
      })
      .input(z.object({ id: z.uuid() }).extend(propuestaUpdate.shape))
      .output(propuestaSchema),
    delete: oc
      .route({
        method: 'DELETE',
        path: '/propuestas/{id}',
        tags: ['evaluador'],
        summary: 'Delete a propuesta (cascades recargos, notas, estatus, documentos)',
      })
      .input(z.object({ id: z.uuid() }))
      .output(z.object({ id: z.uuid() })),
  },

  /** Surcharges are created by the LLM during document ingestion, read-only here. */
  recargos: {
    list: oc
      .route({
        method: 'GET',
        path: '/recargos',
        tags: ['evaluador'],
        summary: 'List the recargos the LLM extracted for one propuesta',
      })
      .input(z.object({ propuestaId: z.uuid() }))
      .output(z.array(recargoSchema)),
  },

  /** Items the LLM extracted per propuesta (B.5). */
  items: {
    list: oc
      .route({
        method: 'GET',
        path: '/items',
        tags: ['evaluador'],
        summary: 'List the line items the LLM extracted for one propuesta',
      })
      .input(z.object({ propuestaId: z.uuid() }))
      .output(z.array(propuestaItemSchema)),
  },

  /** Agent evaluation runs (3.c / D.3 / D.4). */
  evaluaciones: {
    lanzar: oc
      .route({
        method: 'POST',
        path: '/evaluaciones',
        tags: ['evaluador'],
        summary: 'Run the evaluation engine for one proyecto (requires evaluacion.lanzar)',
      })
      .input(z.object({ proyectoId: z.uuid() }))
      .output(evaluacionDetalleSchema),
    get: oc
      .route({
        method: 'GET',
        path: '/evaluaciones/{id}',
        tags: ['evaluador'],
        summary: 'One evaluation run with pasos, verdicts and informe',
      })
      .input(z.object({ id: z.uuid() }))
      .output(evaluacionDetalleSchema),
    list: oc
      .route({
        method: 'GET',
        path: '/evaluaciones',
        tags: ['evaluador'],
        summary: 'List evaluation runs of a proyecto',
      })
      .input(z.object({ proyectoId: z.uuid() }))
      .output(z.array(evaluacionSchema)),
    informeMarkdown: oc
      .route({
        method: 'GET',
        path: '/evaluaciones/{id}/informe.md',
        tags: ['evaluador'],
        summary: 'Download the evaluation report as Markdown (E.5.b)',
      })
      .input(z.object({ id: z.uuid() }))
      .output(z.string()),
    informeCsv: oc
      .route({
        method: 'GET',
        path: '/evaluaciones/{id}/informe.csv',
        tags: ['evaluador'],
        summary: 'Download the comparative table as CSV (E.5.b)',
      })
      .input(z.object({ id: z.uuid() }))
      .output(z.string()),
  },

  /** E.1.b: named process stages. */
  procesos: {
    etapas: oc
      .route({
        method: 'GET',
        path: '/procesos/etapas',
        tags: ['evaluador'],
        summary: 'List the named process stages catalog',
      })
      .output(z.array(procesoEtapaSchema)),
  },

  /** E.2.b/E.2.c: users, roles and the final decision. */
  usuarios: {
    list: oc
      .route({
        method: 'GET',
        path: '/usuarios',
        tags: ['evaluador'],
        summary: 'List users with their roles (requires usuario.ver)',
      })
      .output(z.array(usuarioSchema)),
    roles: oc
      .route({
        method: 'GET',
        path: '/usuarios/roles',
        tags: ['evaluador'],
        summary: 'List the role catalog',
      })
      .output(z.array(rolSchema)),
    asignarRol: oc
      .route({
        method: 'PATCH',
        path: '/usuarios/{id}/rol',
        tags: ['evaluador'],
        summary: 'Assign a role to a user (requires usuario.asignar_rol)',
      })
      .input(z.object({ id: z.uuid() }).extend(usuarioRolInput.shape))
      .output(usuarioSchema),
  },

  decisiones: {
    final: oc
      .route({
        method: 'POST',
        path: '/propuestas/{id}/decision',
        tags: ['evaluador'],
        summary:
          'Record the human final decision (requires propuesta.aprobar or propuesta.rechazar)',
      })
      .input(
        z.object({
          id: z.uuid(),
          decision: z.enum(['adjudicada', 'rechazada']),
          comentario: z.string().trim().max(2000).optional(),
        }),
      )
      .output(estatusSchema),
  },

  alertas: {
    proveedor: oc
      .route({
        method: 'GET',
        path: '/alertas/{proveedorId}',
        tags: ['evaluador'],
        summary: 'Antecedent alerts for one proveedor (E.3.c)',
      })
      .input(z.object({ proveedorId: z.uuid() }))
      .output(z.array(alertaSchema)),
  },

  notas: {
    list: oc
      .route({
        method: 'GET',
        path: '/notas',
        tags: ['evaluador'],
        summary: 'List notas of a propuesta',
      })
      .input(z.object({ propuestaId: z.uuid() }))
      .output(z.array(notaSchema)),
    create: oc
      .route({
        method: 'POST',
        path: '/notas',
        tags: ['evaluador'],
        summary: 'Create a nota',
      })
      .input(notaInput)
      .output(notaSchema),
    update: oc
      .route({
        method: 'PATCH',
        path: '/notas/{id}',
        tags: ['evaluador'],
        summary: 'Update a nota',
      })
      .input(z.object({ id: z.uuid() }).extend(notaUpdate.shape))
      .output(notaSchema),
    delete: oc
      .route({
        method: 'DELETE',
        path: '/notas/{id}',
        tags: ['evaluador'],
        summary: 'Delete a nota',
      })
      .input(z.object({ id: z.uuid() }))
      .output(z.object({ id: z.uuid() })),
  },

  estatus: {
    list: oc
      .route({
        method: 'GET',
        path: '/estatus',
        tags: ['evaluador'],
        summary: 'List estatus by proyecto and/or propuesta',
      })
      .input(
        z
          .object({ proyectoId: z.uuid().optional(), propuestaId: z.uuid().optional() })
          .refine(
            (input) => Boolean(input.proyectoId) || Boolean(input.propuestaId),
            'estatus list needs proyectoId or propuestaId',
          ),
      )
      .output(z.array(estatusSchema)),
    create: oc
      .route({
        method: 'POST',
        path: '/estatus',
        tags: ['evaluador'],
        summary: 'Create an estatus (one of proyectoId/propuestaId)',
      })
      .input(estatusInput)
      .output(estatusSchema),
    update: oc
      .route({
        method: 'PATCH',
        path: '/estatus/{id}',
        tags: ['evaluador'],
        summary: 'Update an estatus',
      })
      .input(z.object({ id: z.uuid() }).extend(estatusUpdate.shape))
      .output(estatusSchema),
    delete: oc
      .route({
        method: 'DELETE',
        path: '/estatus/{id}',
        tags: ['evaluador'],
        summary: 'Delete an estatus',
      })
      .input(z.object({ id: z.uuid() }))
      .output(z.object({ id: z.uuid() })),
  },

  documentos: {
    upload: oc
      .route({
        method: 'POST',
        path: '/documentos',
        tags: ['evaluador'],
        summary:
          'Upload a PDF or image, store it in PostgreSQL, ingest it into the vectorized knowledge base, and (with propuestaId) let the LLM extract monto and recargos',
      })
      .input(documentoUploadInput)
      .output(documentoUploadResponse),
    list: oc
      .route({
        method: 'GET',
        path: '/documentos',
        tags: ['evaluador'],
        summary: 'List documentos of a proyecto',
      })
      .input(z.object({ proyectoId: z.uuid() }))
      .output(z.array(documentoSchema)),
    delete: oc
      .route({
        method: 'DELETE',
        path: '/documentos/{id}',
        tags: ['evaluador'],
        summary: 'Delete a documento and its knowledge chunks',
      })
      .input(z.object({ id: z.uuid() }))
      .output(z.object({ id: z.uuid() })),
  },

  conocimiento: {
    list: oc
      .route({
        method: 'GET',
        path: '/conocimiento',
        tags: ['evaluador'],
        summary: 'List the knowledge chunks of a proyecto',
      })
      .input(z.object({ proyectoId: z.uuid() }))
      .output(z.array(conocimientoSchema)),
  },

  chat: {
    ask: oc
      .route({
        method: 'POST',
        path: '/chat/ask',
        tags: ['evaluador'],
        summary:
          'Ask the AI about a proyecto using the vectorized knowledge base and the proveedor cost history',
      })
      .input(chatAskInput)
      .output(chatResponseSchema),
  },
};

export type ApiContract = typeof contract;
