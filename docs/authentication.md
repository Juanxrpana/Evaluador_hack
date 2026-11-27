# Authentication

Better Auth is embedded in `@repo/api` and owns password hashing, session tokens, cookie attributes,
CSRF checks, and auth-specific rate limits. The project owns the database migration, the user-facing
forms, authorization decisions, and the oRPC context.

## Decisions

| Question           | Decision                                                             |
| ------------------ | -------------------------------------------------------------------- |
| Provider           | Better Auth 1.7.28, embedded in the API                              |
| Methods            | Email + password only                                                |
| Identity table     | The existing `users` table                                           |
| User creation      | Better Auth sign-up replaces the old public `POST /api/users` demo   |
| Email verification | Deferred                                                             |
| Password reset     | Deferred until an email provider is configured                       |
| Session cache      | Off; each API request resolves the session against the database      |
| Schema ownership   | Kysely migrations, not Better Auth CLI migrations                    |
| Production origin  | Same site as the web app; cross-site cookies are a deployment change |

OAuth can be added later without a schema migration because credentials and provider identities
already live in `accounts`.

## Schema mapping

Better Auth defaults to camelCase columns and text IDs. This project already has a `users` table
with `uuid` IDs and snake_case columns, so `createAuth()` maps its model fields explicitly:

| Better Auth model | Table           | Notes                                               |
| ----------------- | --------------- | --------------------------------------------------- |
| `user`            | `users`         | Adds `email_verified`, `image`, `updated_at`        |
| `session`         | `sessions`      | `user_id` FK → `users.id`, `ON DELETE CASCADE`      |
| `account`         | `accounts`      | Password hash and future OAuth provider credentials |
| `verification`    | `verifications` | Short-lived tokens for future email flows           |

`advanced.database.generateId: "uuid"` keeps every new ID a UUID, so `users.id` remains compatible
with `userSchema` (`z.uuid()`) and the session/account foreign keys match its type.

The migration is
[`20261127131000_add_authentication.ts`](../apps/api/src/db/migrations/20261127131000_add_authentication.ts).
It is a normal Kysely migration with a real `down()` reversal. Do **not** run `auth migrate` against
an application database: it bypasses the Kysely history and the reversible migration test. The CLI
or `getMigrations(auth.options)` is useful as a reference and as a parity check, not as the
deployment mechanism.

## API integration

### Configuration

`apps/api/src/auth/auth.ts` creates the instance from the Kysely client and explicit config:

- `BETTER_AUTH_SECRET` — at least 32 random characters. Generate with
  `openssl rand -base64 32`.
- `BETTER_AUTH_URL` — the public API origin, default `http://localhost:3000`.
- `CORS_ORIGIN` — also registered as a trusted origin so the Vite dev proxy and a separate web
  deployment pass Better Auth's Origin check.

### Middleware order

`apps/api/src/app.ts` mounts, in order:

1. correlation IDs, access logging, request context;
2. Helmet and CORS;
3. `/api` no-store + mutation audit;
4. Better Auth at `/api/auth/{*any}`;
5. the generic API rate limiters;
6. the oRPC/OpenAPI handler;
7. `express.json()`.

Better Auth must run before `express.json()` and before oRPC because both Better Auth and oRPC read
the raw request stream. Auth routes bypass the generic write limiter because Better Auth has
stricter per-endpoint rules (`/sign-in/email` is limited separately). The mutation audit middleware
still records an `http.request` event for auth POSTs.

### Session context

The oRPC handler resolves the session once per request:

```ts
const session = await auth.api.getSession({
  headers: fromNodeHeaders(req.headers),
});

openAPIHandler.handle(req, res, {
  prefix: '/api',
  context: { session },
});
```

`createRouter()` declares `ApiContext` and uses a single `authenticated` middleware for protected
procedures:

```ts
const authenticated = os.middleware(({ context, next }) => {
  if (!context.session) {
    throw new ORPCError('UNAUTHORIZED');
  }

  setRequestActor(context.session.user.id);
  return next();
});

users: {
  list: os.users.list.use(authenticated).handler(() => users.list()),
}
```

`setRequestActor()` makes later audit records carry the authenticated user ID. `users.list` is the
only user-facing API procedure; user creation belongs to Better Auth sign-up.

### Rate-limit identity

Better Auth trusts `X-Forwarded-For` by default. The auth mount overwrites `x-client-ip` with
Express `req.ip` (which already honors `TRUST_PROXY`) and Better Auth reads only that header. This
keeps both rate limiters keyed on the same trusted address and prevents clients from rotating a
spoofed header.

## Web integration

- `apps/web/src/lib/auth-client.ts` creates the React client with `credentials: 'include'`.
- `apps/web/src/lib/session.ts` wraps `getSession()` in a TanStack Query option with a 30-second
  stale time.
- `apps/web/src/routes/_authed.tsx` is a pathless guard. It resolves the session in `beforeLoad` and
  redirects anonymous visitors to `/login`.
- `/users` lives under `_authed`; `/login` and `/signup` redirect authenticated users to `/users`.
- The root header uses `authClient.useSession()` for the name and sign-out control.

The client's `baseURL` is the API origin when `VITE_API_URL` is set. Otherwise it is `undefined`, so
Better Auth uses the current origin and the Vite `/api` proxy.

## Environment

```env
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
```

In production set `BETTER_AUTH_URL` to the public API origin and include the web origin in
`CORS_ORIGIN`. If web and API are on different registrable sites rather than sibling subdomains,
cookies need `SameSite=None; Secure`; the simpler deployment is a reverse proxy that serves the web
app and API from one site.

## Tests

`apps/api/test/auth.test.ts` runs against the same PGlite database as the migration tests:

1. apply every Kysely migration;
2. assert `getMigrations(auth.options)` reports zero pending tables and columns;
3. sign up through the real Better Auth handler;
4. resolve the session cookie and assert the user and session rows use matching UUIDs.

Step 2 is the upgrade canary. If a Better Auth upgrade needs a new column or table, the test fails
until a migration is added.

## Operational notes

- Sessions are database-backed by default. With cookie caching off, a deleted session row takes
  effect on the next request.
- `auth.api.signOut` deletes the session server-side and clears the cookie.
- Rotate the secret without invalidating existing data by adding the new value to
  `BETTER_AUTH_SECRETS`; see the Better Auth options reference before changing it in production.
- Email verification and password reset require an email transport and a `sendResetPassword`
  callback. Do not advertise those flows until they are configured.
- Rows created by the removed demo `POST /api/users` endpoint have no `accounts` row, so they
  cannot sign in. Delete them or attach credentials in a one-off script if the data matters.
- Better Auth's production rate limiter is enabled automatically. Development disables it by
  default; set `rateLimit.enabled: true` if a development environment is reachable by untrusted
  clients.

## Follow-ups

- Add OAuth providers (accounts table is ready).
- Add email verification and password reset once an email provider exists.
- Add roles and authorization policy when a second permission level appears.
- Move both rate limiters to a shared store before running multiple API replicas.
