# Database, migrations, and type generation

## Ownership model

The project deliberately does **not** try to make one Zod object generate both API validation and
SQL DDL.

| Concern                                   | Owner                 | Artifact                                                 |
| ----------------------------------------- | --------------------- | -------------------------------------------------------- |
| API request/response validation and types | Zod                   | `packages/contracts/src/schemas/*`                       |
| API shape and route metadata              | oRPC contract         | `packages/contracts/src/contract.ts`                     |
| Table structure, indexes, constraints     | PostgreSQL migrations | `apps/api/src/db/migrations/*`                           |
| Typed SQL query surface                   | Kysely                | `apps/api/src/db/schema.generated.ts`                    |
| Row → API translation                     | Repository mapper     | `apps/api/src/modules/users/postgres-user.repository.ts` |

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
docker compose up -d postgres
```

`compose.yaml` creates the `app` database and exposes port `5432`. The init script also creates
`app_test` for optional real-Postgres tests.

### Podman without a Compose provider

```bash
podman run --rm -d --name monorepo-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app \
  -p 5432:5432 \
  -v monorepo-postgres-data:/var/lib/postgresql/data \
  docker.io/library/postgres:19

# Optional real-Postgres test database
podman exec monorepo-postgres createdb -U postgres app_test
```

`.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
DATABASE_POOL_MAX=10
```

The API verifies the connection with `select 1` before listening. If the database is missing or
unreachable, startup fails.

## Migrations

Files live in `apps/api/src/db/migrations` and are named with an ISO-like timestamp prefix:

```text
20261127120000_create_users.ts
20261127121000_add_users_created_at_index.ts
```

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

The generated file contains the `users` table and the `DB` type:

```ts
export interface users {
  created_at: Generated<Timestamp>;
  email: string;
  id: Generated<string>;
  name: string;
}

export interface DB {
  users: users;
}
```

Run `pnpm db:types` after every migration change.

## Repository mapping

The production adapter uses generated Kysely types and maps rows to the Zod-owned API type:

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

The repository also maps PostgreSQL unique violations (`23505`) to `EmailAlreadyExistsError`; the
oRPC router turns that into HTTP 409.

## Migration tests

Default test path: **PGlite**, in-memory PostgreSQL compiled to WASM.

```bash
pnpm test
```

The migration test performs exactly:

1. `migrateToLatest()`.
2. Assert `users` exists.
3. `migrateTo(NO_MIGRATIONS)`.
4. Assert `users` is gone and migration history is empty.
5. `migrateToLatest()` again.
6. Assert `users` exists.

The repository test then inserts a user, validates the result with `userSchema`, lists it, and
verifies duplicate emails raise the domain error.

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
- No auto-migrations.
- `db:rollback` is blocked in production without an explicit override.
- Test URLs must contain `_test`; only generated schemas are dropped.
- Kysely migrations use session-level advisory locks. Run migrations through a direct connection or
  session pooling, not PgBouncer transaction mode.
- `.env` is ignored; `.env.example` is the safe template.
- DB constraints are integrity guarantees, not a second API validator.

## Adding a table

1. Add a timestamped migration with `up` and `down`.
2. Run `pnpm db:migrate`.
3. Run `pnpm db:types`.
4. Add or extend a repository interface under `apps/api/src/modules`.
5. Implement the Kysely adapter and map rows to the Zod API type.
6. Add a migration test and a repository test.
7. Run `pnpm check` and `pnpm build`.
