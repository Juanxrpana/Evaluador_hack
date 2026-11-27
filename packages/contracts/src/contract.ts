import { oc } from '@orpc/contract';
import { z } from 'zod';
import { healthResponseSchema } from './schemas/health.ts';
import { createUserSchema, userSchema } from './schemas/user.ts';

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

    create: oc
      .route({
        method: 'POST',
        path: '/users',
        successStatus: 201,
        tags: ['users'],
        summary: 'Create a user',
      })
      .input(createUserSchema)
      .output(userSchema),
  },
};

export type ApiContract = typeof contract;
