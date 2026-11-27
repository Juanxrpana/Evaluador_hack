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
│  │  │  ├─ index.ts                     # DB + server bootstrap and shutdown
│  │  │  ├─ config/env.ts                # Zod-validated environment
│  │  │  ├─ db/
│  │  │  │  ├─ client.ts                 # Kysely<DB> over pg.Pool
│  │  │  │  ├─ migrate.ts                # up / down / status CLI
│  │  │  │  ├─ migrator.ts               # shared migrator
│  │  │  │  ├─ schema.generated.ts       # generated by kysely-typegen
│  │  │  │  └─ migrations/               # frozen up/down migration files
│  │  │  ├─ router/index.ts              # implement(contract).router(...)
│  │  │  ├─ modules/users/
│  │  │  │  ├─ user.repository.ts        # async abstraction
│  │  │  │  ├─ postgres-user.repository.ts
│  │  │  │  └─ user.errors.ts
│  │  │  └─ scripts/generate-openapi.ts
│  │  ├─ test/
│  │  │  ├─ migrations.test.ts           # up → down → up
│  │  │  ├─ users.repository.test.ts     # Postgres + Zod round trip
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
types are generated from the migrated database. `PostgresUserRepository` maps
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
                           └─ PostgresUserRepository
                                └─ Kysely → PostgreSQL
                                     └─ typed row → Zod User mapping
                                          └─ oRPC output validation
                                               └─ TanStack Query invalidation
```

Client-side validation is convenience. The server always re-validates the same schema. A duplicate
email violates the database constraint and becomes an HTTP **409**, not a 500.

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
- The API validates both input and output against the contract.
- Expected 4xx validation errors are not logged as server incidents; 5xx errors are logged.
- Duplicate emails map to a domain error and HTTP 409.
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

- There is no authentication, authorization, rate limiting, multi-tenancy, or audit logging.
- There is no CI workflow or application Dockerfile yet; `compose.yaml` only provisions Postgres.
- TanStack Table and TanStack Form are not included. React Hook Form is the form layer; add Table
  when a real dataset exists.
- The repository has a single `users` table. Add migrations and feature modules for the next
  aggregate.

## Documentation

- [Architecture and SOLID boundaries](docs/architecture.md)
- [Database, migrations, and type generation](docs/database.md)
- [The Users feature end to end](docs/example-feature.md)
