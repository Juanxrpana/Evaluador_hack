import { createORPCClient } from '@orpc/client';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { contract, type ApiClient } from '@repo/contracts';

import { apiOrigin } from '@/lib/auth-client';
import { loadToken } from '@/lib/token';

/**
 * Same typed oRPC surface the web app uses, but authenticated with the
 * persisted bearer token instead of cookies (React Native has no cookie jar).
 */
const link = new OpenAPILink(contract, {
  url: `${apiOrigin}/api`,
  fetch: async (request, init) => {
    const token = await loadToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return globalThis.fetch(request, { ...init, headers });
  },
});

export const client: JsonifiedClient<ApiClient> = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
