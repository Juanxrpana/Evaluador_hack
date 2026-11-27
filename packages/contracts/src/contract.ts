import { oc } from '@orpc/contract';
import { z } from 'zod';
import { healthResponseSchema } from './schemas/health.ts';
import { userSchema } from './schemas/user.ts';
import {
  chatAskInput,
  chatResponseSchema,
  documentoSchema,
  documentoUploadInput,
  documentoUploadResponse,
  proyectoInput,
  proyectoSchema,
  proveedorHistorialSchema,
  proveedorInput,
  proveedorSchema,
  propuestaInput,
  propuestaSchema,
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
    create: oc
      .route({
        method: 'POST',
        path: '/proyectos',
        tags: ['evaluador'],
        summary: 'Create a proyecto',
      })
      .input(proyectoInput)
      .output(proyectoSchema),
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
    create: oc
      .route({
        method: 'POST',
        path: '/proveedores',
        tags: ['evaluador'],
        summary: 'Create a proveedor',
      })
      .input(proveedorInput)
      .output(proveedorSchema),
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
    create: oc
      .route({
        method: 'POST',
        path: '/propuestas',
        tags: ['evaluador'],
        summary: 'Create a propuesta',
      })
      .input(propuestaInput)
      .output(propuestaSchema),
    list: oc
      .route({
        method: 'GET',
        path: '/propuestas',
        tags: ['evaluador'],
        summary: 'List propuestas of a proyecto',
      })
      .input(z.object({ proyectoId: z.uuid() }))
      .output(z.array(propuestaSchema)),
  },

  documentos: {
    upload: oc
      .route({
        method: 'POST',
        path: '/documentos',
        tags: ['evaluador'],
        summary:
          'Upload a PDF or image, store it in PostgreSQL, and ingest it into the vectorized knowledge base',
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
