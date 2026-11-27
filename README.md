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

## Run the full stack with Compose

```bash
docker compose up --build
# Podman users:
# podman compose -f compose.yaml up --build
```

Open **http://localhost:8080**. Anonymous visitors boot to `/login`; after sign-up or sign-in the
root route sends them to the protected `/users` page.

The stack contains:

| Service    | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| `postgres` | PostgreSQL 19 + pgvector with the app and `app_test` databases |
| `migrate`  | One-shot Kysely migration runner; exits before the API starts  |
| `api`      | Express + Better Auth + oRPC, built from `apps/api/Dockerfile` |
| `web`      | Static Vite build served by nginx, proxying `/api` to the API  |

```bash
# Compose needs a real OpenRouter key for the chat and document analysis:
OPENROUTER_API_KEY=sk-or-... BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
PUBLIC_ORIGIN=http://localhost:8080 \
docker compose up --build
```

The Compose secret is a local development default. For anything else:

```bash
BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
PUBLIC_ORIGIN=http://localhost:8080 \
docker compose up --build
```

`PUBLIC_ORIGIN` must match the browser origin because it is used for Better Auth and CORS. The
Compose Postgres publishes port `5432`; stop any other local Postgres before starting the stack.

## Local development

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
# PostgreSQL 18+ images expect the volume at /var/lib/postgresql.
podman run --rm -d --name monorepo-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app \
  -p 5432:5432 \
  -v monorepo-postgres-data:/var/lib/postgresql \
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
| `pnpm test`         | Migration, auth, service, transaction, and request-ID tests          |
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

## Mobile app (React Native + Expo)

`apps/mobile` is an Expo (SDK 58) client reusing the same oRPC contract and
Zod schemas as the web app. Authentication uses Better Auth's bearer plugin:
the sign-in/sign-up response carries a session token that the app stores in
`expo-secure-store` and sends as `Authorization: Bearer` (React Native has no
cookie jar; the web app keeps using cookies).

```bash
pnpm --filter @repo/mobile dev
```

Point `EXPO_PUBLIC_API_URL` (see `apps/mobile/.env.example`) at the API:
`http://localhost:3000` for iOS/web, `http://10.0.2.2:3000` for the Android
emulator, or the host LAN IP for a physical device.

## Layout

```text
.
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ app.ts                       # Express + Better Auth + oRPC handler
│  │  │  ├─ index.ts                     # composition root, auth, bootstrap, shutdown
│  │  │  ├─ auth/auth.ts                 # Better Auth instance and schema mapping
│  │  │  ├─ config/env.ts                # Zod-validated environment
│  │  │  ├─ observability/               # request IDs, logs, audit, rate limits
│  │  │  ├─ db/
│  │  │  │  ├─ client.ts                 # Kysely<DB> over pg.Pool + timeouts
│  │  │  │  ├─ transaction.ts            # TransactionRunner + Kysely adapter
│  │  │  │  ├─ migrate.ts                # up / down / status CLI
│  │  │  │  ├─ migrator.ts               # shared migrator
│  │  │  │  ├─ schema.generated.ts       # generated by kysely-typegen
│  │  │  │  └─ migrations/               # frozen up/down migration files
│  │  │  ├─ router/index.ts              # transport adapter over services
│  │  │  ├─ modules/
│  │  │  │  ├─ audit/
│  │  │  │  │  ├─ audit.repository.ts    # durable audit port
│  │  │  │  │  └─ postgres-audit.writer.ts
│  │  │  │  └─ users/
│  │  │  │     ├─ user.reader.ts         # read port
│  │  │  │     ├─ user.writer.ts         # write port
│  │  │  │     ├─ user.service.ts        # use cases + transaction boundary
│  │  │  │     ├─ user.transaction.ts    # module-local tx context
│  │  │  │     ├─ postgres-user.reader.ts
│  │  │  │     ├─ postgres-user.writer.ts
│  │  │  │     ├─ user.mapper.ts
│  │  │  │     └─ user.errors.ts
│  │  │  └─ scripts/generate-openapi.ts
│  │  ├─ Dockerfile                     # API build + deploy image
│  │  ├─ test/
│  │  │  ├─ migrations.test.ts           # up → down → up
│  │  │  ├─ request-id.test.ts           # correlation header validation
│  │  │  ├─ auth.test.ts                 # schema parity + sign-up + session
│  │  │  ├─ app.test.ts                  # auth HTTP boundary
│  │  │  ├─ users.repository.test.ts     # reader/writer + Zod round trip
│  │  │  ├─ users.service.test.ts        # service orchestration
│  │  │  ├─ transaction.test.ts          # commit / rollback
│  │  │  ├─ audit.writer.test.ts         # durable audit row
│  │  │  ├─ transaction.types.ts         # compile-time tx guard
│  │  │  └─ support/test-database.ts     # PGlite or TEST_DATABASE_URL
│  │  └─ vitest.config.ts
│  ├─ mobile/
│  │  ├─ src/app/                        # expo-router routes: (auth) + (tabs)
│  │  ├─ src/lib/                        # auth-client, orpc, session, token
│  │  ├─ metro.config.js                 # workspace-aware Metro
│  │  └─ app.json                        # Expo config (scheme evaluador)
│  └─ web/
│     ├─ Dockerfile                     # Vite build + nginx image
│     ├─ nginx.conf                     # SPA fallback + /api proxy
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
│  ├─ adr/0001-transaction-boundary.md   # transaction and service-layer decision
│  ├─ architecture.md
│  ├─ authentication.md
│  └─ database.md
├─ .dockerignore
├─ compose.yaml                          # full stack: postgres, migrate, api, web
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
storage. Kysely types are generated from the migrated database. `toUser()` in `user.mapper.ts` maps
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
                                     └─ UserService.list
                                          └─ PostgresUserReader
                                               └─ Kysely → PostgreSQL
                                                    └─ typed row → Zod User mapping
```

Client-side validation is convenience; the server always re-validates. Better Auth owns credential
validation, password hashing, session rotation, CSRF/origin checks, and auth rate limits. See
[authentication.md](docs/authentication.md) for the schema and security details.

The web root `/` redirects anonymous visitors to `/login` and authenticated visitors to `/users`.
`/login` and `/signup` redirect authenticated users to `/users`.

Public user creation is Better Auth sign-up. The transaction/service layer remains the pattern for
application-domain writes; `UserService.create` is the reference multi-repository use case and is
not exposed as an HTTP procedure.

## Transactions and services

`createTransactionRunner(db, contextFactory)` is a module-agnostic wrapper over Kysely's
`db.transaction().execute`. Application services own the transaction boundary and depend only on
ports; Better Auth owns credential and session writes through its own adapter.

- Write adapters require `Transaction<DB>`; constructing one with the root connection is a compile
  error. Read adapters use the root `Kysely<DB>`.
- The transaction context is module-local: `UserTransaction` exposes only `users` and `audit`.
- Repositories never open transactions. Compose them in one service callback; do not nest runners.
- The reference `UserService.create` writes the user and `audit_events` row in one transaction.
  Better Auth's sign-up writes its own user/account/session rows; those are outside this unit of
  work.
- No external I/O, ALS request transaction, or distributed ACID. ACID is local to one PostgreSQL
  database; a future service split uses an outbox and Saga.
- API pool settings include connection, statement, and idle-in-transaction timeouts. Migrations
  deliberately keep no statement timeout.

See [docs/architecture.md#transaction-boundary](docs/architecture.md#transaction-boundary) and the
[ADR](docs/adr/0001-transaction-boundary.md).

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
requests and aborted connections. Application-domain writes that use the transaction runner can also
write a durable `audit_events` row inside the transaction; see
[Transactions and services](#transactions-and-services). Better Auth sign-ups are recorded by the
stdout stream and by its own user/account/session rows. Domain handlers can emit an explicit stdout
event:

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

| Variable                  | Default                        | Purpose                                                     |
| ------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `BETTER_AUTH_SECRET`      | required                       | At least 32 random characters; signs cookies and tokens.    |
| `BETTER_AUTH_URL`         | `http://localhost:3000`        | Public API origin used by Better Auth.                      |
| `CORS_ORIGIN`             | `http://localhost:5173`        | Allowed web origin; also a Better Auth trusted origin.      |
| `LOG_LEVEL`               | `info`                         | Pino level: `fatal`, `error`, `warn`, `info`, `debug`, etc. |
| `LOG_PRETTY`              | `false`                        | Human-readable dev output; ignored in production.           |
| `TRUST_PROXY`             | `false`                        | Express trust-proxy setting used for `req.ip`.              |
| `RATE_LIMIT_WINDOW_MS`    | `60000`                        | Rate-limit window in milliseconds.                          |
| `RATE_LIMIT_MAX`          | `120`                          | Requests per IP per window for non-auth `/api` traffic.     |
| `RATE_LIMIT_WRITE_MAX`    | `30`                           | Writes per IP per window for non-auth `/api` traffic.       |
| `OPENROUTER_API_KEY`      | required                       | OpenRouter key for chat and vision analysis.                |
| `OPENROUTER_BASE_URL`     | `https://openrouter.ai/api/v1` | OpenRouter API base.                                        |
| `OPENROUTER_CHAT_MODEL`   | `google/gemini-2.5-flash`      | Model used for chat answers.                                |
| `OPENROUTER_VISION_MODEL` | `google/gemini-2.5-flash`      | Model used to describe uploaded images.                     |
| `AI_TIMEOUT_MS`           | `120000`                       | Abort timeout for OpenRouter calls.                         |
| `EMBEDDING_MODEL`         | `Xenova/bge-m3`                | Local ONNX embedding model (transformers.js).               |
| `EMBEDDING_CACHE_DIR`     | `.models`                      | Where the embedding model downloads once.                   |
| `DOCUMENT_MAX_BYTES`      | `15728640`                     | Max upload size (15 MiB).                                   |

## AI chat and the vectorized knowledge base

The evaluator domain is AI-first: uploaded documents and supplier cost histories become
`conocimiento` rows embedded with **bge-m3 (1024 dims)** and searched with **pgvector** (cosine
distance, HNSW index). OpenRouter handles generation only: chat answers and image descriptions.

Flow:

1. Upload a PDF (parsed locally with `unpdf`) or an image (described by the vision model) against
   a proyecto. The file is stored durably in the `documento` table; its text is chunked, embedded,
   and stored as `conocimiento` scoped to that proyecto.
2. When the upload names a proveedor, their cost history (propuestas + recargos across every
   proyecto) is rebuilt from SQL and stored as `proveedor_historial` knowledge chunks.
3. `POST /api/chat/ask` embeds the question, retrieves the top chunks of that proyecto only
   (`conocimiento.proyecto_id` is a NOT NULL foreign key, so the chat never crosses projects), and
   injects the live supplier cost history when the question targets a propuesta.

Embeddings run locally in the API process (ONNX, CPU) — no embedding API key. The model downloads
once into `EMBEDDING_CACHE_DIR`; in Compose it lives in the `models-cache` volume. The Compose
Postgres is `pgvector/pgvector:pg19` because the stock image lacks the vector extension. Migration
tests on PGlite skip the vector columns (guarded by extension availability); vector reads/writes go
through raw SQL in `postgres-conocimiento.search.ts` / `postgres-conocimiento.writer.ts`.

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

# Test the migration cycle, auth boundary, adapters, and transaction rules
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
- Write adapters require `Transaction<DB>`; only the transaction runner opens transactions.
- The reference user write and durable audit row commit or roll back together; failed attempts stay
  in the stdout audit stream.
- No external I/O, nested transaction, or ALS request transaction inside a unit of work.
- API pool settings include connection, statement, and idle-in-transaction timeouts.
- SIGINT/SIGTERM close the HTTP server and destroy the database pool.
- Migrations are never run automatically by the API.
- Production rollback requires `ALLOW_DB_ROLLBACK=1`.
- Test databases must end in `_test`; only a generated schema is dropped.
- Kysely migrations use session-level advisory locks. Run them through a direct connection or
  session pooling, **not** PgBouncer transaction mode.
- `schema.generated.ts` is generated. Do not edit it by hand.
- `apps/api/.env` contains local credentials and is ignored.
- Compose falls back to a development-only `BETTER_AUTH_SECRET`; set a real 32+ character secret
  before exposing the stack beyond localhost.

## Current boundaries

This is a starter, not a production deployment:

- Authentication is email/password only. There is no authorization policy or multi-tenancy yet;
  every signed-in user can read the user list.
- Email verification and password reset are not configured because no email transport is wired.
  OAuth providers can be added without a schema migration.
- Sessions are resolved from the database on every API request. Cookie caching is intentionally off
  so revocation is immediate.
- Rate limiting is process-local; use a shared store before horizontal scaling. The HTTP audit
  stream goes to stdout, so ship it to a durable, access-controlled store. Application-domain writes
  that use the transaction runner can also produce `audit_events` rows in PostgreSQL.
- The Compose stack is for local/demo use: it uses a development default secret, publishes
  PostgreSQL on `5432`, and has no TLS termination or CI workflow. The images are multi-stage but
  not production-hardened.
- TanStack Table and TanStack Form are not included. React Hook Form is the form layer; add Table
  when a real dataset exists.
- The schema has `users`, `sessions`, `accounts`, `verifications`, and `audit_events`. Add migrations
  and feature modules for the next aggregate.
- ACID is local to one PostgreSQL database. Cross-database work would use an outbox plus Saga;
  retries, isolation options, metrics, and idempotency keys are explicit follow-ups.

## Documentation

- [Architecture, transactions, and SOLID boundaries](docs/architecture.md)
- [Authentication and sessions](docs/authentication.md)
- [Database, migrations, and type generation](docs/database.md)
- [ADR: transaction boundary](docs/adr/0001-transaction-boundary.md)
