# Database, migrations, and type generation

## Ownership model

The project deliberately does **not** try to make one Zod object generate both API validation and
SQL DDL.

| Concern                                   | Owner                 | Artifact                                              |
| ----------------------------------------- | --------------------- | ----------------------------------------------------- |
| API request/response validation and types | Zod                   | `packages/contracts/src/schemas/*`                    |
| API shape and route metadata              | oRPC contract         | `packages/contracts/src/contract.ts`                  |
| Table structure, indexes, constraints     | PostgreSQL migrations | `apps/api/src/db/migrations/*`                        |
| Typed SQL query surface                   | Kysely                | `apps/api/src/db/schema.generated.ts`                 |
| Auth model → column mapping               | Better Auth config    | `apps/api/src/auth/auth.ts`                           |
| Row → API translation                     | Repository mapper     | `apps/api/src/modules/users/user.mapper.ts`           |
| Transaction boundary                      | Application service   | `apps/api/src/modules/users/user.service.ts`          |
| Durable success audit                     | Audit adapter         | `apps/api/src/modules/audit/postgres-audit.writer.ts` |

This is not duplicated validation:

- Zod answers “is this HTTP payload valid?” and owns the public API type.
- Postgres answers “can this row exist?” with `NOT NULL`, `UNIQUE`, foreign keys, and indexes.
- Kysely types are generated from the migrated database, so application queries match real tables.
- The repository mapper is the explicit seam between persistence and the API. TypeScript checks
  both ends.

If you instead want the database schema to own the Zod shape, use a DB-first tool such as
`drizzle-zod`. That removes the mapper by reversing ownership, but it couples the API contract to
persistence and makes true down-migration testing harder.

## Why Kysely

Kysely's migrator has first-class `up` and `down` functions and supports:

- `migrateToLatest()`
- `migrateUp()`
- `migrateDown()`
- `migrateTo(NO_MIGRATIONS)`
- `getMigrations()`

That gives a real “apply, reverse, apply again” test instead of a database drop-and-recreate.
Drizzle Kit generates up migrations; down migrations are custom SQL. Prisma can generate down SQL
for failed migrations, but not a general successful-migration rollback flow.

Kysely is a query builder, not a full ORM. That is intentional: the repository boundary is small,
visible, and easy to test.

## Local PostgreSQL 19

PostgreSQL 19 is the current stable release (released November 19, 2026).

### Docker Compose

```bash
# Postgres only, for local pnpm development
docker compose up -d postgres

# Full app stack (Postgres + migrations + API + nginx web)
docker compose up --build
```

`compose.yaml` creates the `app` database and exposes port `5432`. The init script also creates
`app_test` for optional real-Postgres tests. The full stack serves the web app at
`http://localhost:8080` and proxies `/api` to the API container.

### Podman without a Compose provider

```bash
podman run --rm -d --name monorepo-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app \
  -p 5432:5432 \
  -v monorepo-postgres-data:/var/lib/postgresql \
  docker.io/library/postgres:19

# Optional real-Postgres test database
podman exec monorepo-postgres createdb -U postgres app_test
```

PostgreSQL 18+ images expect the volume at `/var/lib/postgresql`, with the versioned data directory
created below it. Mounting `/var/lib/postgresql/data` makes the container exit on startup.

`.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
DATABASE_POOL_MAX=10
```

Authentication also requires `BETTER_AUTH_SECRET` (32+ characters) and `BETTER_AUTH_URL`; see
[authentication.md](authentication.md). The API verifies the connection with `select 1` before
listening. If the database is missing or unreachable, startup fails.

## Migrations

Files live in `apps/api/src/db/migrations` and are named with an ISO-like timestamp prefix:

```text
20261127120000_create_users.ts
20261127121000_add_users_created_at_index.ts
20261127130000_create_audit_events.ts
20261127131000_add_authentication.ts
20261127140000_create_core_domain_tables.ts
```

The core domain migration adds the evaluator domain: `proyecto`, `proveedor`,
`propuesta`, `estatus`, `recargos`, `nota`, and `conocimiento`. The `conocimiento`
table is the LLM knowledge base; it will get a `VECTOR(1024)` embedding column
(pgvector, bge-m3) in a later migration once vector search is wired up.

Each file exports:

```ts
import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // forward migration
}

export async function down(db: Kysely<any>): Promise<void> {
  // exact reversal
}
```

Rules:

1. Migrations are **frozen in time**. Do not import the current `DB` type or application schemas.
   Kysely's own guidance is to use `Kysely<any>` in migration files.
2. Every `up` must have a real `down`.
3. Down migrations run in reverse order.
4. Never edit an applied migration. Add a new one.
5. Do not run migrations automatically from the API process. They are a deploy step.

Commands:

```bash
pnpm db:migrate    # apply all pending migrations
pnpm db:rollback   # revert one migration
pnpm db:status     # show applied/pending
```

`db:rollback` refuses to run with `NODE_ENV=production` unless `ALLOW_DB_ROLLBACK=1` is set.

## Kysely type generation

`pnpm db:types` does not need a running server:

1. Start in-memory PGlite.
2. Run all migrations.
3. Introspect the result with `kysely-typegen`.
4. Write `apps/api/src/db/schema.generated.ts`.

The file is committed so typecheck and builds do not require a database. It is ignored by Oxlint and
Oxfmt because it is generated. Do not edit it by hand.

The generated file contains the `users` table, the Better Auth tables, `audit_events`, the core
domain tables, and the `DB` type:

```ts
export interface accounts {
  access_token: string | null;
  account_id: string;
  created_at: Generated<Timestamp>;
  id: Generated<string>;
  password: string | null;
  provider_id: string;
  user_id: string;
  // ...token and timestamp columns omitted for brevity
}

export interface audit_events {
  action: string;
  actor_id: string | null;
  created_at: Generated<Timestamp>;
  id: Generated<string>;
  request_id: string | null;
  resource: string;
  resource_id: string;
  trace_id: string | null;
}

export interface sessions {
  created_at: Generated<Timestamp>;
  expires_at: Timestamp;
  id: Generated<string>;
  token: string;
  user_id: string;
  // ...ip_address, user_agent, updated_at
}

export interface users {
  created_at: Generated<Timestamp>;
  email: string;
  email_verified: Generated<boolean>;
  id: Generated<string>;
  image: string | null;
  name: string;
  updated_at: Generated<Timestamp>;
}

export interface verifications {
  created_at: Generated<Timestamp>;
  expires_at: Timestamp;
  id: Generated<string>;
  identifier: string;
  updated_at: Generated<Timestamp>;
  value: string;
}

export interface DB {
  accounts: accounts;
  audit_events: audit_events;
  conocimiento: conocimiento;
  estatus: estatus;
  nota: nota;
  propuesta: propuesta;
  proveedor: proveedor;
  proyecto: proyecto;
  recargos: recargos;
  sessions: sessions;
  users: users;
  verifications: verifications;
}
```

Run `pnpm db:types` after every migration change.

## Better Auth schema

The `users` table is the single identity table. The authentication migration adds `email_verified`,
`image`, and `updated_at`, then creates `sessions`, `accounts`, and `verifications`. Foreign keys
use `uuid` because `users.id` is a UUID and `userSchema` validates it with `z.uuid()`.

`apps/api/src/auth/auth.ts` maps Better Auth's camelCase model fields onto the snake_case columns.
This mapping is part of the application schema contract; renaming a column means updating the map
and the migration together.

Better Auth's CLI can generate or apply its own migrations, but this project does not use that path
for deployments. `auth migrate` would bypass Kysely's migration history and the reversible
migration test. The CLI and `getMigrations(auth.options)` are reference/parity tools only.

## Read and write repositories

Persistence is split into two narrow ports:

```ts
export interface UserReader {
  list(): Promise<User[]>;
}

export interface UserWriter {
  create(input: CreateUserInput): Promise<User>;
}
```

`PostgresUserReader` takes the root `Kysely<DB>` and is used for read-only queries.
`PostgresUserWriter` takes a `Transaction<DB>`; constructing it with the root connection is a
compile error, so a write cannot silently escape the unit of work.

The shared mapper keeps the persistence/API boundary explicit:

```ts
function toUser(row: Selectable<DB['users']>): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: toIsoString(row.created_at),
  };
}
```

- `User` comes only from `packages/contracts`.
- `DB['users']` comes only from the migrated database.
- If a column is renamed or its nullability changes, the mapper fails to compile.
- If the API schema changes, the mapper’s return type fails to compile.

The internal reference `PostgresUserWriter` maps only the `users_email_key` `23505` violation to
`EmailAlreadyExistsError`; public creation and duplicate-email behavior belong to Better Auth.
The reader is the only user adapter used by the exposed API.

## Transactions and durable audit

`createTransactionRunner` is a module-agnostic adapter over `db.transaction().execute`. The
composition root supplies a context factory:

```ts
const runInUserTransaction = createTransactionRunner<UserTransaction>(db, (trx) => {
  const context = getRequestContext();

  return {
    users: new PostgresUserWriter(trx),
    audit: new PostgresAuditWriter(trx, {
      actorId: context?.actorId,
      requestId: context?.requestId,
      traceId: context?.traceId,
    }),
  };
});
```

`UserService.create` calls it once. The user insert and the `audit_events` insert commit or roll back
together. The transaction context is module-local (`users` + `audit`), not a global repository
registry.

Rules:

- One transaction per use case. Repositories never open transactions.
- No external I/O, nested transaction, or implicit ALS transaction inside the callback.
- Default isolation is `READ COMMITTED`; use `SELECT ... FOR UPDATE` for contended rows.
- Retry is not implemented. If added, retry only `40001`/`40P01` with a side-effect-free callback.
- `audit_events` is success-only: a rollback removes the user and the audit row. Failed HTTP
  attempts remain in the stdout audit stream.
- `request_id` is `text`, not `uuid`: inbound `X-Request-Id` values are validated as safe strings,
  not necessarily UUIDs.
- The API pool sets a connection timeout, statement timeout, and
  `idle_in_transaction_session_timeout`; migrations keep no statement timeout.

## Migration tests

Default test path: **PGlite**, in-memory PostgreSQL compiled to WASM.

```bash
pnpm test
```

The migration test performs exactly:

1. `migrateToLatest()`.
2. Assert `users`, `sessions`, `accounts`, `verifications`, and `audit_events` exist.
3. `migrateTo(NO_MIGRATIONS)`.
4. Assert every table is gone and migration history is empty.
5. `migrateToLatest()` again.
6. Assert every table exists again.

The adapter test inserts a user through the transaction runner, validates the result with
`userSchema`, lists it through `PostgresUserReader`, and verifies duplicate emails raise the domain
error. A separate transaction test proves that a thrown error removes both the user and its
`audit_events` row. The service test uses fake ports and a fake runner, so it needs no database.

The auth test asserts that `getMigrations(auth.options)` reports no pending Better Auth tables or
columns, then signs up through the real handler and resolves the session cookie. The parity
assertion is the canary for Better Auth upgrades: a new required column fails CI until a Kysely
migration and the field map are updated.

### Real PostgreSQL 19 parity

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_test pnpm test
```

Safety rules:

- The database name must end in `_test`.
- The harness creates a unique schema such as `test_ab12...`.
- It drops only that schema with `CASCADE`.
- It never points at `DATABASE_URL`.

The same test files run in both modes. PGlite is the fast default; real PostgreSQL is the optional
production-fidelity check.

## Safety and operations

- API startup verifies the database with `select 1` and fails fast.
- The pool is destroyed on SIGINT/SIGTERM after the HTTP server closes.
- The API pool sets `connectionTimeoutMillis`, `statement_timeout`, and
  `idle_in_transaction_session_timeout`; migrations deliberately keep no statement timeout.
- Transactions hold one pool connection. Keep them short and never perform external I/O inside.
- Write repositories require `Transaction<DB>`; read repositories use the root connection.
- The reference application write writes its durable audit row in the same transaction and is
  success-only. Better Auth owns its own user/account/session writes.
- No nested transactions or ALS request transactions. Compose repositories in one service callback.
- True ACID stops at one PostgreSQL database. A future service split uses an outbox and Saga, not 2PC.
- No auto-migrations.
- `db:rollback` is blocked in production without an explicit override.
- Test URLs must contain `_test`; only generated schemas are dropped.
- Kysely migrations use session-level advisory locks. Run migrations through a direct connection or
  session pooling, not PgBouncer transaction mode.
- `.env` is ignored; `.env.example` is the safe template.
- DB constraints are integrity guarantees, not a second API validator.

## Adding a table

For an application-domain table:

1. Add a timestamped migration with `up` and `down`.
2. Run `pnpm db:migrate`.
3. Run `pnpm db:types`.
4. Add or extend read/write ports under `apps/api/src/modules`.
5. Implement `Postgres*Reader` over `Kysely<DB>` and `Postgres*Writer` over `Transaction<DB>`;
   map rows to the Zod API type.
6. Add the write adapter to the module's transaction context and context factory.
7. Add a service use case that owns the transaction boundary when the operation writes.
8. Add migration, adapter, service, and transaction-boundary tests.
9. Run `pnpm check` and `pnpm build`.
