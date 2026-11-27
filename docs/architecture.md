# Architecture and boundaries

## Dependency direction

```text
packages/contracts
  ├─ Zod API schemas
  ├─ oRPC contract
  └─ ApiClient type
        ▲                         ▲
        │                         │
   apps/api                  apps/web
   ├─ router (transport)     └─ OpenAPILink
   ├─ authenticated middleware     │
   ├─ Better Auth            ├─ Better Auth React client
   ├─ UserService            └─ TanStack Query / React Hook Form
   │  ├─ UserReader
   │  └─ UserTransactionRunner
   │       ├─ PostgresUserWriter
   │       └─ PostgresAuditWriter
   └─ db/transaction.ts (Kysely adapter)
        │
        ▼
   PostgreSQL 19 (users, sessions, accounts, verifications, audit_events)
```

Rules:

- `contracts` depends only on `zod` and `@orpc/contract`. It knows nothing about Express, Kysely,
  Better Auth, or React.
- `api` depends on `contracts` and implements the transport, authentication, application services,
  repository ports, transaction boundary, and persistence.
- `web` depends on `contracts` and creates a client from it. It imports only the Better Auth browser
  client, never the server auth instance or its secret.
- Server implementation details never enter the web bundle.

The contract package is built with `tsc` to `dist` and consumed through the workspace symlink. During
development, the root `pnpm dev` command watches it, so contract edits propagate to the API and web.

## Two sources of truth, deliberately

There are two different kinds of truth:

1. **API truth** — what HTTP accepts and returns. Zod and oRPC own this.
2. **Persistence truth** — durable columns, constraints, indexes, and foreign keys. PostgreSQL
   migrations own this.

Kysely types are generated from the migrated database into `schema.generated.ts`. The repository
mapper converts a generated row into a Zod-owned API type. TypeScript checks both sides, so drift is
a compile error. Contract types are the shared application DTOs in this monolith; the service
imports them as types only, never the oRPC, Express, or Kysely runtime.

The mapper is not duplicate validation. It is the boundary between persistence and the public API.
See [database.md](database.md) for the full rationale.

## Request lifecycle

```mermaid
sequenceDiagram
  participant Form as AuthForm
  participant AC as Better Auth client
  participant E as Express
  participant BA as Better Auth
  participant DB as PostgreSQL
  participant Q as Session query
  participant O as oRPC client
  participant H as OpenAPIHandler
  participant R as Router
  participant S as UserService
  participant P as PostgresUserReader

  Form->>AC: signIn.email(values)
  AC->>E: POST /api/auth/sign-in/email
  E->>BA: toNodeHandler(auth)
  BA->>BA: Origin + rate-limit checks
  BA->>DB: verify account / create session
  DB-->>BA: user + session
  BA-->>AC: Set-Cookie (session token)
  AC-->>Form: signed in

  Q->>E: GET /api/auth/get-session
  E->>BA: resolve cookie
  BA-->>Q: session + user

  Q->>O: route guard passes
  O->>E: GET /api/users + cookie
  E->>H: handler.handle(req, res, { session })
  H->>R: users.list()
  R->>R: authenticated middleware + setRequestActor
  R->>S: list()
  S->>P: list()
  P->>DB: SELECT ... ORDER BY created_at DESC
  DB-->>P: rows
  P-->>S: User[]
  S-->>R: User[]
  R-->>H: User[]
  H-->>O: 200 application/json
  O-->>Q: typed User[]
```

Sign-up and sign-in live outside the oRPC contract at `/api/auth/*`. The protected API uses the
same cookie session: `app.ts` resolves it with `auth.api.getSession()`, puts it in the oRPC context,
and a shared `authenticated` middleware rejects anonymous callers before a service is touched.
User creation belongs to Better Auth sign-up; the `UserService.create` path below is the reference
application write use case and is not exposed as an HTTP procedure.

## Transaction boundary

The unit of work is one application service call, not one repository method. `UserService.create` opens exactly one PostgreSQL transaction and writes both the user and the durable audit row inside it. Resolving commits; throwing rolls back. Better Auth owns credential and session writes through its own adapter and transaction; this boundary applies to application-domain writes.

```text
UserService.create
  └─ UserTransactionRunner
       └─ db.transaction().execute(trx => {
            users: new PostgresUserWriter(trx),
            audit: new PostgresAuditWriter(trx, correlation)
          })
```

Rules:

- **One database, one transaction.** `createTransactionRunner` only wraps `db.transaction().execute`. True ACID across separate databases is not attempted; a future service split uses a transactional outbox plus async consumers.
- **Write adapters require `Transaction<DB>`.** `PostgresUserWriter` and `PostgresAuditWriter` cannot be constructed with the root `Kysely<DB>`; that would silently run outside the transaction. Read adapters (`PostgresUserReader`) use the root connection because list queries are not part of a write unit of work.
- **Repositories never open transactions.** Only the runner does. Repositories are composable inside a transaction and have no hidden commits.
- **The transaction context is module-local.** `UserTransaction` exposes only `users` and `audit`. There is no global repository registry or service locator.
- **No nested transactions or implicit joins.** Kysely 0.29 deprecates `Transaction.transaction()`. Compose the repositories you need in one callback; do not call another transactional service from inside a transaction.
- **No ALS request transaction.** `AsyncLocalStorage` remains for request IDs, logging, and actor propagation. A transaction scope is a correctness boundary and must be visible in the call graph.
- **No external I/O inside the transaction.** Network calls, email, and queue publishes belong after commit or in an outbox. This keeps rollback and any future retry safe.
- **Isolation is `READ COMMITTED` by default.** Use `SELECT ... FOR UPDATE` for contended read-modify-write. Add `SERIALIZABLE` with a bounded retry loop only for a specific invariant.
- **Retry is deferred.** When added, retry only `40001` and `40P01`, recreate the transaction and context per attempt, keep the callback side-effect-free, and never retry `23505` or domain errors. Use an idempotency key when commit ambiguity matters.
- **Keep transactions short.** Each transaction holds one pool connection. `db/client.ts` sets a connection timeout, an API statement timeout, and `idle_in_transaction_session_timeout`; migrations intentionally keep no statement timeout.

### Audit semantics

There are two audit streams:

- **Durable audit** — `audit_events` is written inside the reference application transaction and records committed facts only. A rollback removes the user and the audit row together. Audit insert failure rolls back the user creation; that is the deliberate compliance trade-off.
- **HTTP audit** — the existing stdout middleware records every mutating request, including rejected and aborted attempts. It also records Better Auth sign-up/sign-in requests by path and status. The reference `user.create` success event is emitted only after the service transaction resolves.

`23505` aborts the PostgreSQL transaction. The internal write adapter maps only the `users_email_key` constraint to `EmailAlreadyExistsError`; other unique violations stay raw. Public duplicate-email behavior belongs to Better Auth sign-up. Do not catch a unique violation and continue in the same transaction without an explicit savepoint.

## Observability and request safety

The HTTP pipeline is intentionally separate from the oRPC contract:

1. `requestId` validates or creates `X-Request-Id` and reuses a valid W3C `traceparent` trace ID.
2. `pino-http` emits one structured access log per request; `/healthz` and CORS preflights are
   excluded to keep infrastructure noise out of the stream.
3. `AsyncLocalStorage` carries the request logger, IDs, IP, and user agent to oRPC handlers. This
   avoids threading a context through `implement(contract)` just to log or audit.
4. Helmet and CORS apply response headers. CORS exposes the correlation and rate-limit headers to
   browser clients.
5. `/api` applies `Cache-Control: no-store` and mutation audit. Better Auth is mounted next, before
   the generic limiters and before `express.json()`, and applies its own auth-aware rate limits.
6. The oRPC handler follows the limiters and resolves the session from the cookie into the request
   context. It remains before `express.json()` because it consumes the raw request body.

Access logs and audit logs are separate streams; audit records carry `audit: true`. Neither stream
contains request bodies, query strings, cookies, or authorization headers. Domain code emits
`recordAuditEvent(...)`; the authenticated oRPC middleware calls `setRequestActor(...)` so later
events inherit the user ID. Audit records are emitted at `info` regardless of `LOG_LEVEL`, so
reducing access-log volume cannot silently disable the audit stream.

Better Auth's client IP is taken from an `x-client-ip` header that `app.ts` overwrites with Express
`req.ip`. This keeps auth rate limiting aligned with `TRUST_PROXY` instead of trusting a
client-supplied `X-Forwarded-For`.

Rate limiting is in-memory and per-process. `TRUST_PROXY` must match the deployment topology; `true`
is unsafe when clients can reach the API directly because `X-Forwarded-For` becomes spoofable. See
the README for configuration and shared-store guidance.

## Error policy

- **400** — oRPC input validation failed. Client error; logged at `info`, without a stack trace.
- **401** — a protected oRPC procedure was called without a valid Better Auth session.
- **409** — internal reference write maps the `users_email_key` violation to
  `EmailAlreadyExistsError`. Public duplicate-email behavior belongs to Better Auth sign-up.
- **404** — no oRPC procedure and no Express route matched.
- **429** — a rate limit was exceeded. Better Auth and Express use their own response envelopes;
  both identify the request or retry delay.
- **500** — unexpected server or database error. The `onError` interceptor logs it with the request
  logger, so the record includes the request and trace IDs.
- **500 on a committed write** — if output validation or the post-commit stdout audit throws after
  the transaction committed, the client can see an error even though the row exists. Keep
  post-commit work non-throwing; use an idempotency key if clients retry. Audit insert failure
  inside the transaction rolls the write back and surfaces as a normal server error.

Better Auth returns its own error envelope for `/api/auth/*`; those responses are handled by the
library and do not pass through the oRPC error mapper.

The response header `X-Request-Id` is always present, even when a third-party error body (oRPC or
body-parser) does not include the ID. Express-owned 404, 429, and 500 envelopes include the ID in
the body as well.

The OpenAPI handler validates both input and output. If an implementation returns a value that does
not match the output schema, the contract fails rather than silently leaking inconsistent data.

## SOLID boundaries

### Single Responsibility

- `packages/contracts/src/schemas/*` — API validation and inferred types.
- `packages/contracts/src/contract.ts` — route metadata and schema attachment.
- `apps/api/src/router/index.ts` — maps procedures to services and enforces authentication.
- `apps/api/src/auth/auth.ts` — Better Auth instance and database field mapping.
- `apps/api/src/modules/users/user.service.ts` — user use cases and the transaction boundary.
- `apps/api/src/modules/users/user.reader.ts` / `user.writer.ts` — read and write ports.
- `apps/api/src/modules/users/postgres-user.reader.ts` / `postgres-user.writer.ts` — Postgres adapters.
- `apps/api/src/modules/users/user.mapper.ts` — generated row → Zod-owned API type.
- `apps/api/src/modules/users/user.transaction.ts` — module-local transaction context.
- `apps/api/src/modules/audit/*` — durable success-only audit port and adapter.
- `apps/api/src/db/transaction.ts` — generic transaction runner and Kysely adapter.
- `apps/api/src/db/*` — connection, migrations, generated types, startup/shutdown.
- `apps/api/src/observability/*` — correlation IDs, structured logging, audit events, rate limits.
- `apps/api/src/app.ts` — HTTP composition: middleware order, auth mount, session context.
- `apps/web/src/lib/orpc.ts` — transport and query utilities.
- `apps/web/src/lib/auth-client.ts` — Better Auth browser client.
- `apps/web/src/lib/session.ts` — session query shared by route guards and the header.
- `apps/web/src/routes/*` — routing, guards, and page composition.
- `apps/web/src/components/AuthForm.tsx` — sign-in and sign-up form interactions.

### Open/Closed

Adding a feature means adding a schema, contract entry, migration, read/write ports, adapters, a
service use case, and a route. Existing schemas, client types, validators, and migrations are not
edited. The generic transaction runner does not change when a module adds a repository.

### Liskov Substitution

`PostgresUserReader` implements `UserReader`; `PostgresUserWriter` implements `UserWriter` and
requires `Transaction<DB>`. A test adapter must honor the same async contracts. Service tests use
fake ports and a fake transaction runner, so they do not depend on PostgreSQL. Better Auth is
configured through its own options object and is replaceable in tests with a test instance.

### Interface Segregation

Reads and writes are separate ports. `UserReader` exposes only `list`; `UserWriter` exposes only
`create`. The transaction context exposes only the repositories the user use case needs, not a
global repository registry. Authentication writes stay inside Better Auth.

### Dependency Inversion

- The router depends on `UserService` and the oRPC `ApiContext`, not on Kysely or `pg`.
- `UserService` depends on `UserReader` and `UserTransactionRunner`; the composition root injects
  the Postgres implementations.
- `db/transaction.ts` receives a context factory and imports no feature module.
- `index.ts` is the composition root: it creates the Kysely client and Better Auth instance, then
  injects `UserService`.
- The web depends on `ApiClient` and the contract, not on server modules. The Better Auth client is
  the only auth code in the browser bundle.
- Handlers are ordinary typed functions, so they can be called in tests or server-side jobs without
  HTTP.

## Composition roots

- **API**: `apps/api/src/index.ts` creates the Kysely client, verifies the connection, creates the
  Better Auth instance, builds the transaction runner with the user/audit context factory, injects
  `UserService`, and destroys the pool during graceful shutdown.
- **Auth**: `apps/api/src/auth/auth.ts` is the only module that knows Better Auth's model mapping.
  It receives config explicitly so tests can build an instance without process environment.
- **Database**: `apps/api/src/db/client.ts` owns the `pg.Pool`, Kysely dialect, and API timeouts.
- **Web**: `apps/web/src/main.tsx` creates the `QueryClient`, wraps `RouterProvider`, and imports the
  singleton router from `apps/web/src/router.ts`.

Keeping construction at the edges is what makes the middle replaceable.

## Migration boundaries

- Migration files are frozen historical artifacts. They use `Kysely<any>` and do not import the
  current app schema.
- `db:migrate` is a deploy step, never part of API startup.
- `db:rollback` is guarded in production.
- Migration tests default to in-memory PGlite and can run against real PostgreSQL 19 via
  `TEST_DATABASE_URL`.
- Kysely migrations use session-level advisory locks; do not run them through PgBouncer transaction
  pooling.

## Safety checklist

- Contract validation is the server-side boundary; form validation is only UX.
- Better Auth sign-up/sign-in lives at `/api/auth/*`, outside the oRPC contract.
- Better Auth and oRPC are mounted before `express.json()` because they consume raw request bodies.
- Environment variables are parsed with Zod at process start; `DATABASE_URL` and a 32+ character
  `BETTER_AUTH_SECRET` are required.
- `.env` is ignored; `.env.example` is the committed template.
- CORS is restricted by `CORS_ORIGIN`; the same origin is registered with Better Auth.
- Helmet is enabled.
- Every request has an `X-Request-Id` and `X-Trace-Id`; unsafe inbound values are replaced.
- Logs exclude bodies, query strings, cookies, and authorization headers.
- Mutating API requests produce an audit record, including rejected and aborted requests.
- Protected procedures require a Better Auth session and set the audit actor.
- Rate limits apply per IP per process; `TRUST_PROXY` must be configured for the deployment.
- Expected 4xx errors do not produce server-error logs.
- Better Auth owns duplicate-email handling for public sign-up.
- Write adapters require `Transaction<DB>`; only the transaction runner opens transactions.
- Read adapters use the root connection and are not part of a write unit of work.
- Durable audit is success-only and written in the same transaction as the reference domain write;
  failed attempts remain in the stdout audit stream.
- No external I/O, nested transaction, or implicit ALS transaction inside a unit of work.
- SIGINT/SIGTERM close the HTTP server and destroy the DB pool.
- Test databases must end in `_test`; only a generated schema is dropped.
- The generated Kysely schema is committed and regenerated with `pnpm db:types`.
- Authorization policy, email verification/reset, OAuth, a shared rate-limit store, retries,
  metrics, and CI are explicit follow-ups.

## Why oRPC instead of Axios

OpenAPI code generation with Axios is a valid architecture, but it adds a generated client, a
generation step, and a second representation of the contract. oRPC gives the same type safety by
making the contract the client factory:

- `OpenAPILink` provides the transport.
- `createTanstackQueryUtils` provides typed query and mutation options.
- `OpenAPIGenerator` emits a standard spec for non-TypeScript consumers.

If an external consumer requires an Axios SDK, generate it from `apps/api/openapi.json` with Hey API.
Do not maintain it by hand and do not add it to this web app unless a concrete need appears.
