# Contract-first TypeScript monorepo

An Express API, a Vite/React frontend, and PostgreSQL in one pnpm workspace. A single Zod-backed
[oRPC](https://orpc.dev) contract is the source of truth for API validation, server types, client
types, and OpenAPI output.

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

The API fails fast if `DATABASE_URL` is missing or the database is unreachable. Migrations are a
separate deployment step; the API never migrates itself on startup.

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
| `pnpm test`         | Migration and repository tests                                       |
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
│  │  │  ├─ app.ts                       # Express + oRPC OpenAPI handler
│  │  │  ├─ index.ts                     # composition root, bootstrap, shutdown
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
│  │  ├─ test/
│  │  │  ├─ migrations.test.ts           # up → down → up
│  │  │  ├─ request-id.test.ts           # correlation header validation
│  │  │  ├─ users.repository.test.ts     # reader/writer + Zod round trip
│  │  │  ├─ users.service.test.ts        # service orchestration
│  │  │  ├─ transaction.test.ts          # commit / rollback
│  │  │  ├─ audit.writer.test.ts         # durable audit row
│  │  │  ├─ transaction.types.ts         # compile-time tx guard
│  │  │  └─ support/test-database.ts     # PGlite or TEST_DATABASE_URL
│  │  └─ vitest.config.ts
│  └─ web/
│     ├─ src/
│     │  ├─ lib/orpc.ts                  # OpenAPILink + TanStack Query utils
│     │  ├─ lib/query-client.ts
│     │  ├─ router.ts                    # TanStack Router + TS 7 Register augmentation
│     │  ├─ routes/                      # file-based routes
│     │  └─ components/UserForm.tsx      # React Hook Form + zodResolver
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
│  ├─ database.md
│  └─ example-feature.md
├─ compose.yaml                          # PostgreSQL 19 for Docker Compose
├─ pnpm-workspace.yaml                   # workspaces + version catalog
└─ tsconfig.base.json
```

## The contract and database rule

All **API** request and response shapes live in `packages/contracts`. The Users feature is the
reference example:

- `createUserSchema` and `userSchema` define validation and inferred types.
- `contract.ts` attaches those schemas to `GET /users` and `POST /users`.
- The API implements the contract with `implement(contract)`. Handler input is inferred; input and
  output are validated at runtime.
- The web app creates its typed client from the same contract with `OpenAPILink`.
- `UserForm` passes the same `createUserSchema` to `zodResolver`.

PostgreSQL owns what Zod should not: `NOT NULL`, `UNIQUE`, indexes, and durable storage. Kysely
types are generated from the migrated database. `toUser()` in `user.mapper.ts` maps
`Selectable<DB['users']>` → `User` in one typed function, so a change on either side becomes a
compile error.

There is no separate `CreateUserDto`, no handwritten `User` interface, and no second validation
copy for the form.

## Request flow

```text
React Hook Form
  └─ Zod client validation (UX)
       └─ oRPC client (types from contract)
            └─ POST /api/users
                 └─ Express + OpenAPIHandler
                      └─ Zod input validation (authoritative)
                           └─ UserService.create (use case + transaction boundary)
                                └─ UserTransactionRunner
                                     └─ BEGIN
                                          ├─ PostgresUserWriter → users
                                          └─ PostgresAuditWriter → audit_events
                                     └─ COMMIT / ROLLBACK
                                          └─ router stdout audit (post-commit)
                                               └─ oRPC output validation
                                                    └─ TanStack Query invalidation
```

`GET /users` skips the transaction and reads through `PostgresUserReader`; only write use cases open
a unit of work.

Client-side validation is convenience. The server always re-validates the same schema. A duplicate
email violates the database constraint and becomes an HTTP **409**, not a 500.

## Transactions and services

The oRPC router is a transport adapter. It calls a `UserService` use case; the service owns the
transaction boundary and depends only on ports. `createTransactionRunner(db, contextFactory)` is a
module-agnostic wrapper over Kysely's `db.transaction().execute`.

- Write adapters require `Transaction<DB>`; constructing one with the root connection is a compile
  error. Read adapters use the root `Kysely<DB>`.
- The transaction context is module-local: `UserTransaction` exposes only `users` and `audit`.
- Repositories never open transactions. Compose them in one service callback; do not nest runners.
- The durable `audit_events` row is written inside the transaction, so user + audit commit or roll
  back together. Failed attempts remain in the stdout audit stream.
- The router emits the explicit success audit only after the transaction resolves.
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
5. `/api` requests pass through `Cache-Control: no-store`, the mutation audit middleware, and two
   per-IP rate limiters (global and write).
6. The oRPC handler remains before `express.json()`.

Logs are JSON on stdout: one access line per request plus separate `audit: true` records. They
include `requestId`, `traceId`, method, pathname, IP, user agent, status, and response time. Request
bodies, query strings, cookies, and authorization headers are deliberately not logged.
`LOG_PRETTY=true` uses `pino-pretty` only outside production.

Audit middleware records every `POST`/`PUT`/`PATCH`/`DELETE` under `/api`, including rejected
requests and aborted connections. Successful domain changes additionally write a durable
`audit_events` row inside the transaction; see [Transactions and services](#transactions-and-services).
Domain handlers can emit an explicit stdout event:

```ts
recordAuditEvent({
  action: 'user.create',
  resource: 'user',
  resourceId: user.id,
});
```

Audit records carry the actor ID when `setRequestActor()` is called by future authentication
middleware. The current implementation records `actorId: null`. Audit records are emitted at
`info` regardless of the access-log `LOG_LEVEL`, so lowering log volume does not silently disable
them.

Rate limits default to 120 requests/minute per IP for `/api` and 30 writes/minute per IP. Responses
include draft-8 `RateLimit` and `RateLimit-Policy` headers; a 429 includes `Retry-After` and a JSON
body with the request ID. The default store is in-memory and per-process; use a shared store before
running multiple API replicas.

| Variable               | Default | Purpose                                                     |
| ---------------------- | ------- | ----------------------------------------------------------- |
| `LOG_LEVEL`            | `info`  | Pino level: `fatal`, `error`, `warn`, `info`, `debug`, etc. |
| `LOG_PRETTY`           | `false` | Human-readable dev output; ignored in production.           |
| `TRUST_PROXY`          | `false` | Express trust-proxy setting used for `req.ip`.              |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window in milliseconds.                          |
| `RATE_LIMIT_MAX`       | `120`   | Requests per IP per window for `/api`.                      |
| `RATE_LIMIT_WRITE_MAX` | `30`    | Writes per IP per window for `/api`.                        |

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
  consuming them first.
- Environment variables are parsed with Zod at process start; missing `DATABASE_URL` fails fast.
- `.env` files are ignored by git. Only `.env.example` files are committed.
- Helmet and a configurable CORS origin are enabled.
- Every request has an `X-Request-Id` and `X-Trace-Id`; valid inbound values are reused, unsafe ones
  are replaced.
- Logs exclude bodies, query strings, cookies, and authorization headers; `err.body` is redacted.
- Mutating API requests produce an audit record, including 429s and aborted connections.
- Rate limiting is per IP per process; configure `TRUST_PROXY` correctly behind a proxy.
- The API validates both input and output against the contract.
- Expected 4xx validation errors stay at `info` or `warn`; 5xx errors are logged at `error`.
- Duplicate emails map to a domain error and HTTP 409.
- Write adapters require `Transaction<DB>`; only the transaction runner opens transactions.
- The user write and durable audit row commit or roll back together; failed attempts stay in the
  stdout audit stream.
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

## Current boundaries

This is a starter, not a production deployment:

- There is no authentication, authorization, or multi-tenancy.
- Rate limiting is process-local; use a shared store before horizontal scaling. The HTTP audit
  stream goes to stdout, so ship it to a durable, access-controlled store; successful domain changes
  also produce `audit_events` rows in PostgreSQL.
- There is no CI workflow or application Dockerfile yet; `compose.yaml` only provisions Postgres.
- TanStack Table and TanStack Form are not included. React Hook Form is the form layer; add Table
  when a real dataset exists.
- The schema has `users` and `audit_events`. Add migrations and feature modules for the next
  aggregate.
- ACID is local to one PostgreSQL database. Cross-database work would use an outbox plus Saga;
  retries, isolation options, metrics, and idempotency keys are explicit follow-ups.

## Documentation

- [Architecture, transactions, and SOLID boundaries](docs/architecture.md)
- [Database, migrations, and type generation](docs/database.md)
- [The Users feature end to end](docs/example-feature.md)
- [ADR: transaction boundary](docs/adr/0001-transaction-boundary.md)
