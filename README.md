# Contract-first TypeScript monorepo

An Express API, a Vite/React frontend, and PostgreSQL in one pnpm workspace. A single Zod-backed
[oRPC](https://orpc.dev) contract is the source of truth for API validation, server types, client
types, and OpenAPI output. [Better Auth](https://www.better-auth.com) owns email/password
authentication and database-backed sessions without an external identity service.

There is no Axios client and no generated API client file. The contract package **is** the client
type generator: the web app creates a typed `OpenAPILink` from it and derives TanStack Query helpers
from that client.

Persistence is separate by design: **Zod owns the API shape**, **Postgres migrations own durable
schema**, and **Kysely types are generated from the migrated database**. A small repository mapper
is the compiler-checked boundary between the two.

## Stack

| Layer           | Version                                       |
| --------------- | --------------------------------------------- |
| Node.js         | 26.13.1 LTS (pinned via `devEngines.runtime`) |
| pnpm            | 12.23.0                                       |
| TypeScript      | 7.0.2                                         |
| Express         | 5.3.0                                         |
| oRPC            | 1.16.6                                        |
| Better Auth     | 1.7.28                                        |
| PostgreSQL      | 19                                            |
| Kysely          | 0.29.9                                        |
| `pg`            | 8.23.1                                        |
| PGlite          | 0.6.0 (migration tests)                       |
| Pino            | 10.4.0 / pino-http 11.0.0                     |
| Rate limiting   | express-rate-limit 8.7.5                      |
| Vite            | 8.4.0                                         |
| React           | 19.3.1                                        |
| TanStack Router | 1.170.46                                      |
| TanStack Query  | 5.108.4                                       |
| React Hook Form | 7.92.0                                        |
| Zod             | 4.6.7                                         |
| Oxlint / Oxfmt  | 1.95.0 / 0.80.0                               |

## Quick start

```bash
cd ~/Evaluador_hack

# Only if pnpm is not installed. Node 26 no longer bundles Corepack.
npm install -g pnpm@12

pnpm install
cp apps/api/.env.example apps/api/.env

# Print a secret, then paste it into BETTER_AUTH_SECRET in apps/api/.env
openssl rand -base64 32

# Start PostgreSQL 19. Docker Compose users can run:
#   docker compose up -d postgres
podman run --rm -d --name monorepo-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app \
  -p 5432:5432 \
  -v monorepo-postgres-data:/var/lib/postgresql/data \
  docker.io/library/postgres:19

pnpm db:migrate
pnpm dev
```

Open **http://localhost:5173**. The API listens on **http://localhost:3000**.

The API fails fast if `DATABASE_URL` is missing, `BETTER_AUTH_SECRET` is shorter than 32
characters, or the database is unreachable. Migrations are a separate deployment step; the API
never migrates itself on startup.

`package.json` contains a `devEngines.runtime` pin for Node 26.13.1, so pnpm runs all scripts with
that runtime even if your shell has an older Node. If you want the bare `node` command to use the
project runtime too, run `pnpm shim add node`. The `.nvmrc` is also set to `26` for nvm/fnm users.

For the editor, install the **TypeScript 7 native preview** extension (`TypeScriptTeam.native-preview`)
until your editor ships TS 7 language-server support natively. `.vscode/extensions.json` recommends
it.

## Scripts

| Command             | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `pnpm dev`          | Build contracts once, then watch contracts, API, and web in parallel |
| `pnpm build`        | Topological build: contracts → API → web                             |
| `pnpm test`         | Migration, auth, repository, and request-ID tests                    |
| `pnpm typecheck`    | Type-check every workspace package                                   |
| `pnpm check`        | Format check, lint, type-check, and tests                            |
| `pnpm lint`         | Oxlint over the workspace                                            |
| `pnpm lint:fix`     | Oxlint with automatic fixes                                          |
| `pnpm format`       | Oxfmt over the workspace                                             |
| `pnpm format:check` | Check formatting without writing                                     |
| `pnpm db:migrate`   | Apply pending migrations                                             |
| `pnpm db:rollback`  | Revert the last migration                                            |
| `pnpm db:status`    | Show applied and pending migrations                                  |
| `pnpm db:types`     | Regenerate Kysely types from migrations via in-memory PGlite         |
| `pnpm openapi`      | Emit `apps/api/openapi.json` from the contract                       |

## Layout

```text
.
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ app.ts                       # Express + Better Auth + oRPC handler
│  │  │  ├─ index.ts                     # DB + auth + server bootstrap and shutdown
│  │  │  ├─ auth/auth.ts                 # Better Auth instance and schema mapping
│  │  │  ├─ config/env.ts                # Zod-validated environment
│  │  │  ├─ observability/               # request IDs, logs, audit, rate limits
│  │  │  ├─ db/
│  │  │  │  ├─ client.ts                 # Kysely<DB> over pg.Pool
│  │  │  │  ├─ migrate.ts                # up / down / status CLI
│  │  │  │  ├─ migrator.ts               # shared migrator
│  │  │  │  ├─ schema.generated.ts       # generated by kysely-typegen
│  │  │  │  └─ migrations/               # frozen up/down migration files
│  │  │  ├─ router/index.ts              # implement(contract).router(...)
│  │  │  ├─ modules/users/
│  │  │  │  ├─ user.repository.ts        # async abstraction
│  │  │  │  └─ postgres-user.repository.ts
│  │  │  └─ scripts/generate-openapi.ts
│  │  ├─ test/
│  │  │  ├─ migrations.test.ts           # up → down → up
│  │  │  ├─ request-id.test.ts           # correlation header validation
│  │  │  ├─ auth.test.ts                 # schema parity + sign-up + session
│  │  │  ├─ users.repository.test.ts     # Postgres + Zod round trip
│  │  │  └─ support/test-database.ts     # PGlite or TEST_DATABASE_URL
│  │  └─ vitest.config.ts
│  └─ web/
│     ├─ src/
│     │  ├─ lib/auth-client.ts           # Better Auth React client
│     │  ├─ lib/session.ts               # session query for route guards
│     │  ├─ lib/orpc.ts                  # OpenAPILink + TanStack Query utils
│     │  ├─ lib/query-client.ts
│     │  ├─ router.ts                    # TanStack Router + TS 7 Register augmentation
│     │  ├─ routes/                      # file-based routes
│     │  └─ components/AuthForm.tsx      # sign-in + sign-up forms
│     ├─ vite.config.ts                  # router plugin + /api proxy
│     └─ tsr.config.json
├─ packages/
│  └─ contracts/
│     └─ src/
│        ├─ schemas/                     # the only API Zod schemas
│        ├─ contract.ts                  # routes, input, output
│        └─ index.ts
├─ docs/
│  ├─ architecture.md
│  ├─ authentication.md
│  └─ database.md
├─ compose.yaml                          # PostgreSQL 19 for Docker Compose
├─ pnpm-workspace.yaml                   # workspaces + version catalog
└─ tsconfig.base.json
```

## The contract and database rule

All **API** request and response shapes live in `packages/contracts`. The Users feature is the
reference example:

- `userSchema` defines the public user shape and inferred type.
- `contract.ts` attaches that schema to `GET /users`.
- The API implements the contract with `implement(contract)`. Input and output are validated at
  runtime.
- `GET /users` is protected: the oRPC context resolves the Better Auth session and the shared
  `authenticated` middleware rejects anonymous callers.
- The web app creates its typed client from the same contract with `OpenAPILink`.
- Sign-up and sign-in are handled by Better Auth at `/api/auth/*`; they are deliberately outside
  the oRPC contract and the generated OpenAPI document.

PostgreSQL owns what Zod should not: `NOT NULL`, `UNIQUE`, indexes, foreign keys, and durable
storage. Kysely types are generated from the migrated database. `PostgresUserRepository` maps
`Selectable<DB['users']>` → `User` in one typed function, so a change on either side becomes a
compile error.

There is no separate `UserDto` and no handwritten `User` interface.

## Request flow

```text
Sign-up / sign-in
  └─ Better Auth React client
       └─ POST /api/auth/sign-in/email
            └─ Express → Better Auth
                 └─ Origin check → rate limit → password verify
                      └─ sessions/accounts + Set-Cookie

Protected data
  └─ TanStack Router beforeLoad
       └─ session query (authClient.getSession)
            └─ oRPC client (types from contract)
                 └─ GET /api/users + session cookie
                      └─ Express + OpenAPIHandler
                           └─ auth.api.getSession → context
                                └─ authenticated middleware → setRequestActor
                                     └─ PostgresUserRepository
                                          └─ Kysely → PostgreSQL
                                               └─ typed row → Zod User mapping
```

Client-side validation is convenience; the server always re-validates. Better Auth owns credential
validation, password hashing, session rotation, CSRF/origin checks, and auth rate limits. See
[authentication.md](docs/authentication.md) for the schema and security details.

## Observability and request safety

The Express pipeline is ordered so every request is correlated before anything logs:

1. `requestId` accepts a safe inbound `X-Request-Id` or generates a UUID, and reuses a valid W3C
   `traceparent` trace ID or generates one.
2. `pino-http` writes one structured access log per request, excluding `/healthz` and CORS
   preflights.
3. `AsyncLocalStorage` exposes the request logger and metadata to oRPC handlers and domain code.
4. Helmet and CORS run next. CORS exposes `X-Request-Id`, `X-Trace-Id`, `RateLimit`,
   `RateLimit-Policy`, and `Retry-After` to browser clients.
5. `/api` requests pass through `Cache-Control: no-store` and the mutation audit middleware.
6. Better Auth handles `/api/auth/*` before the generic rate limiters and before `express.json()`;
   its own auth-aware limiter protects sign-in and sign-up.
7. The oRPC handler remains before `express.json()` because it consumes the raw request body.
   It resolves the session from the cookie and passes it in the request context.

Logs are JSON on stdout: one access line per request plus separate `audit: true` records. They
include `requestId`, `traceId`, method, pathname, IP, user agent, status, and response time. Request
bodies, query strings, cookies, and authorization headers are deliberately not logged.
`LOG_PRETTY=true` uses `pino-pretty` only outside production.

Audit middleware records every `POST`/`PUT`/`PATCH`/`DELETE` under `/api`, including rejected
requests and aborted connections. Domain handlers can emit an explicit event:

```ts
recordAuditEvent({
  action: 'user.create',
  resource: 'user',
  resourceId: user.id,
});
```

Audit records carry the actor ID when `setRequestActor()` runs. The authenticated oRPC middleware
calls it after resolving the session, so audit events emitted later in a protected request inherit
the user ID. Better Auth's own POST routes are audited by path and status but do not set an actor
before sign-in completes. Audit records are emitted at `info` regardless of the access-log
`LOG_LEVEL`, so lowering log volume does not silently disable them.

Generic rate limits default to 120 requests/minute per IP for non-auth `/api` traffic and 30
writes/minute per IP. Better Auth applies its stricter rules to `/api/auth/*`. Responses include
draft-8 `RateLimit` and `RateLimit-Policy` headers; a 429 includes `Retry-After` and a JSON body
with the request ID. The default stores are in-memory and per-process; use a shared store before
running multiple API replicas.

| Variable               | Default                 | Purpose                                                     |
| ---------------------- | ----------------------- | ----------------------------------------------------------- |
| `BETTER_AUTH_SECRET`   | required                | At least 32 random characters; signs cookies and tokens.    |
| `BETTER_AUTH_URL`      | `http://localhost:3000` | Public API origin used by Better Auth.                      |
| `CORS_ORIGIN`          | `http://localhost:5173` | Allowed web origin; also a Better Auth trusted origin.      |
| `LOG_LEVEL`            | `info`                  | Pino level: `fatal`, `error`, `warn`, `info`, `debug`, etc. |
| `LOG_PRETTY`           | `false`                 | Human-readable dev output; ignored in production.           |
| `TRUST_PROXY`          | `false`                 | Express trust-proxy setting used for `req.ip`.              |
| `RATE_LIMIT_WINDOW_MS` | `60000`                 | Rate-limit window in milliseconds.                          |
| `RATE_LIMIT_MAX`       | `120`                   | Requests per IP per window for non-auth `/api` traffic.     |
| `RATE_LIMIT_WRITE_MAX` | `30`                    | Writes per IP per window for non-auth `/api` traffic.       |

`TRUST_PROXY` must match the deployment topology. Use `1` behind exactly one reverse proxy, or a
specific CIDR/`loopback`. Never use `true` when clients can reach the API directly: they could spoof
`X-Forwarded-For` and bypass per-IP rate limits. Trace IDs are correlation IDs only; there is no
OpenTelemetry exporter yet.

## Database workflow

```bash
# Apply migrations
pnpm db:migrate

# After changing a migration, regenerate Kysely types
pnpm db:types

# Test the full migration cycle and repository mapping
pnpm test

# Optional: same tests against real PostgreSQL 19
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_test pnpm test
```

The default test path uses **PGlite**, an in-memory PostgreSQL WASM build, so no container is
required. The optional real-Postgres path requires a database name ending in `_test`; the harness
creates and drops a unique schema.

See [docs/database.md](docs/database.md) for the ownership model, migration rules, and safety
guards.

## OpenAPI

The web app does not consume generated client code. If another consumer needs a spec:

```bash
pnpm openapi
```

This writes `apps/api/openapi.json` (OpenAPI 3.1.1) with the health and users operations. The file is
git-ignored because it is derived from the contract.

## Safety notes

- oRPC is mounted **before** `express.json()` so it can read raw request bodies without Express
  consuming them first. Better Auth is mounted before oRPC for the same reason.
- Environment variables are parsed with Zod at process start; missing `DATABASE_URL` or
  `BETTER_AUTH_SECRET` fails fast.
- `.env` files are ignored by git. Only `.env.example` files are committed.
- Helmet and a configurable CORS origin are enabled. `CORS_ORIGIN` is also a Better Auth trusted
  origin.
- Better Auth overwrites its client-IP header with Express `req.ip`, so its rate limiter honors
  `TRUST_PROXY` instead of a spoofable `X-Forwarded-For`.
- Every request has an `X-Request-Id` and `X-Trace-Id`; valid inbound values are reused, unsafe ones
  are replaced.
- Logs exclude bodies, query strings, cookies, and authorization headers; `err.body` is redacted.
- Mutating API requests produce an audit record, including 429s and aborted connections.
- Protected oRPC procedures reject anonymous sessions with 401 and call `setRequestActor()` for
  audit attribution.
- Rate limiting is per IP per process; configure `TRUST_PROXY` correctly behind a proxy.
- The API validates both input and output against the contract.
- Expected 4xx validation errors stay at `info` or `warn`; 5xx errors are logged at `error`.
- Better Auth owns duplicate-email handling, password hashing, session rotation, and CSRF checks.
- SIGINT/SIGTERM close the HTTP server and destroy the database pool.
- Migrations are never run automatically by the API.
- Production rollback requires `ALLOW_DB_ROLLBACK=1`.
- Test databases must end in `_test`; only a generated schema is dropped.
- Kysely migrations use session-level advisory locks. Run them through a direct connection or
  session pooling, **not** PgBouncer transaction mode.
- `schema.generated.ts` is generated. Do not edit it by hand.
- `apps/api/.env` contains local credentials and is ignored.

## Current boundaries

This is a starter, not a production deployment:

- Authentication is email/password only. There is no authorization policy or multi-tenancy yet;
  every signed-in user can read the user list.
- Email verification and password reset are not configured because no email transport is wired.
  OAuth providers can be added without a schema migration.
- Sessions are resolved from the database on every API request. Cookie caching is intentionally off
  so revocation is immediate.
- Rate limiting is process-local; use a shared store before horizontal scaling. Audit records go to
  stdout, so ship them to a durable, access-controlled store.
- There is no CI workflow or application Dockerfile yet; `compose.yaml` only provisions Postgres.
- TanStack Table and TanStack Form are not included. React Hook Form is the form layer; add Table
  when a real dataset exists.
- The repository has a single `users` aggregate. Add migrations and feature modules for the next
  one.

## Documentation

- [Architecture and SOLID boundaries](docs/architecture.md)
- [Authentication and sessions](docs/authentication.md)
- [Database, migrations, and type generation](docs/database.md)
