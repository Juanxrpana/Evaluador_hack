import { createORPCClient } from '@orpc/client';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { contract, type ApiClient } from '@repo/contracts';

const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const link = new OpenAPILink(contract, {
  url: `${apiOrigin}/api`,
  fetch: (request, init) =>
    globalThis.fetch(request, {
      ...init,
      credentials: 'include',
    }),
});

export const client: JsonifiedClient<ApiClient> = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
