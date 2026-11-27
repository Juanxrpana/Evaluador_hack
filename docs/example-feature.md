# The Users feature end to end

This is the reference implementation for adding a feature to the monorepo. It covers one Zod schema,
one oRPC contract, PostgreSQL migrations, one repository adapter, one client query, and one form.

## 1. Define the API schema once

`packages/contracts/src/schemas/user.ts`:

```ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
});

export const userSchema = createUserSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type User = z.infer<typeof userSchema>;
```

`CreateUserInput` and `User` are inferred. There is no parallel DTO.

## 2. Attach the schema to the contract

`packages/contracts/src/contract.ts`:

```ts
users: {
  list: oc
    .route({ method: 'GET', path: '/users', tags: ['users'] })
    .output(z.array(userSchema)),

  create: oc
    .route({
      method: 'POST',
      path: '/users',
      successStatus: 201,
      tags: ['users'],
    })
    .input(createUserSchema)
    .output(userSchema),
},
```

The contract carries the HTTP method, path, input schema, output schema, and OpenAPI metadata.
The API and the web client both import this package.

## 3. Add the database migration

`apps/api/src/db/migrations/20261127120000_create_users.ts`:

```ts
import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (column) => column.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('name', 'text', (column) => column.notNull())
    .addColumn('email', 'text', (column) => column.notNull().unique())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').ifExists().execute();
}
```

A second migration adds `users_created_at_idx`. Both have real `down()` functions. Migrations are
frozen: they use `Kysely<any>` and do not import the current app schema.

Then:

```bash
pnpm db:migrate
pnpm db:types
```

`db:types` runs the migrations in in-memory PGlite and regenerates
`apps/api/src/db/schema.generated.ts`.

## 4. Keep persistence behind read and write ports

`apps/api/src/modules/users/user.reader.ts`:

```ts
export interface UserReader {
  list(): Promise<User[]>;
}
```

`apps/api/src/modules/users/user.writer.ts`:

```ts
export interface UserWriter {
  create(input: CreateUserInput): Promise<User>;
}
```

`PostgresUserReader` takes the root `Kysely<DB>` and handles `list`. `PostgresUserWriter` takes a
`Transaction<DB>` and handles `create`. That split is deliberate: constructing the writer with the
root connection is a compile error, so a write cannot silently escape the unit of work.

Both adapters share the mapper in `apps/api/src/modules/users/user.mapper.ts`:

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

If the database schema or the Zod schema changes, this mapper fails to compile. That is the
anti-drift mechanism.

## 5. Implement the service and the contract

The module-local transaction context exposes only the repositories this use case needs:

`apps/api/src/modules/users/user.transaction.ts`:

```ts
export interface UserTransaction {
  readonly users: UserWriter;
  readonly audit: AuditWriter;
}

export type UserTransactionRunner = TransactionRunner<UserTransaction>;
```

The generic runner lives in `apps/api/src/db/transaction.ts` and is the only place that opens a
transaction:

```ts
export function createTransactionRunner<Tx>(
  db: Kysely<DB>,
  createContext: (trx: Transaction<DB>) => Tx,
): TransactionRunner<Tx> {
  return (work) => db.transaction().execute((trx) => work(createContext(trx)));
}
```

`apps/api/src/modules/users/user.service.ts` owns the use case and the transaction boundary:

```ts
export class UserService {
  readonly #reader: UserReader;
  readonly #runInTransaction: UserTransactionRunner;

  constructor(reader: UserReader, runInTransaction: UserTransactionRunner) {
    this.#reader = reader;
    this.#runInTransaction = runInTransaction;
  }

  list(): Promise<User[]> {
    return this.#reader.list();
  }

  create(input: CreateUserInput): Promise<User> {
    return this.#runInTransaction(async ({ users, audit }) => {
      const user = await users.create(input);

      await audit.record({
        action: 'user.create',
        resource: 'user',
        resourceId: user.id,
      });

      return user;
    });
  }
}
```

The composition root wires the context factory and the service:

```ts
const runInUserTransaction: UserTransactionRunner = createTransactionRunner<UserTransaction>(
  db,
  (trx) => {
    const context = getRequestContext();

    return {
      users: new PostgresUserWriter(trx),
      audit: new PostgresAuditWriter(trx, {
        actorId: context?.actorId,
        requestId: context?.requestId,
        traceId: context?.traceId,
      }),
    };
  },
);

const userService = new UserService(new PostgresUserReader(db), runInUserTransaction);
```

`apps/api/src/router/index.ts` remains a transport adapter. It depends on `UserService`, maps domain
errors, and emits the stdout success audit after the transaction has committed:

```ts
export interface RouterDependencies {
  users: UserService;
}

export function createRouter({ users }: RouterDependencies) {
  const os = implement(contract);

  return os.router({
    health: os.health.handler(() => ({
      status: 'ok' as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })),

    users: {
      list: os.users.list.handler(() => users.list()),
      create: os.users.create.handler(async ({ input }) => {
        try {
          const user = await users.create(input);

          recordAuditEvent({
            action: 'user.create',
            outcome: 'success',
            resource: 'user',
            resourceId: user.id,
          });

          return user;
        } catch (error) {
          if (error instanceof EmailAlreadyExistsError) {
            throw new ORPCError('CONFLICT', {
              message: 'A user with this email already exists',
            });
          }

          throw error;
        }
      }),
    },
  });
}
```

The `input` parameter is inferred from `createUserSchema`. The `os.router(...)` call is checked
against the full contract, so omitting or renaming a procedure is a type error.

`apps/api/src/app.ts` mounts the handler:

```ts
app.use('/api{/*path}', async (req, res, next) => {
  const { matched } = await openAPIHandler.handle(req, res, {
    prefix: '/api',
    context: {},
  });

  if (matched) return;
  next();
});
```

This is registered before `express.json()` deliberately. The surrounding pipeline also applies
request IDs, Pino access logging, mutation audit, rate limits, Helmet, and CORS; see
[architecture.md](architecture.md#observability-and-request-safety).

## 6. Create the typed client

`apps/web/src/lib/orpc.ts`:

```ts
const link = new OpenAPILink(contract, {
  url: `${import.meta.env.VITE_API_URL ?? ''}/api`,
});

export const client: JsonifiedClient<ApiClient> = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
```

There is no generated client file. `ApiClient` is
`ContractRouterClient<typeof contract>` exported by the contracts package. `orpc.users.list` and
`orpc.users.create` are typed from the same contract.

## 7. Query the list

`apps/web/src/routes/users.tsx`:

```tsx
export const Route = createFileRoute('/users')({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.users.list.queryOptions()),
  component: UsersPage,
});

function UsersPage() {
  const { data: users } = useSuspenseQuery(orpc.users.list.queryOptions());

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

TanStack Router waits for the loader. TanStack Query owns the cache. The route shell is
`apps/web/src/routes/__root.tsx`.

## 8. Build the form with the same schema

`apps/web/src/components/UserForm.tsx`:

```tsx
const form = useForm<CreateUserInput>({
  resolver: zodResolver(createUserSchema),
  defaultValues: { name: '', email: '' },
});

const createUser = useMutation(
  orpc.users.create.mutationOptions({
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: orpc.users.key() });
    },
  }),
);

<form onSubmit={form.handleSubmit((values) => createUser.mutate(values))}>
  <input {...form.register('name')} />
  <input type="email" {...form.register('email')} />
  <button disabled={createUser.isPending}>Create user</button>
</form>;
```

Client-side validation and server-side validation use the same Zod object. The server remains the
authority. A duplicate email returns 409 and is displayed through `createUser.error`.

## 9. Test the migration, adapters, service, and transaction boundary

`apps/api/test/migrations.test.ts` proves:

1. Apply all migrations.
2. Revert to `NO_MIGRATIONS`.
3. Re-apply.
4. Check the `users` and `audit_events` tables and migration history at each step.

`apps/api/test/users.repository.test.ts` proves:

- Input is parsed through `createUserSchema`.
- The user is inserted through the transaction runner.
- The Postgres row is mapped and parsed through `userSchema`.
- `createdAt` is a valid ISO timestamp.
- `PostgresUserReader.list()` returns the inserted user.
- Duplicate emails raise `EmailAlreadyExistsError`.

`apps/api/test/users.service.test.ts` proves the service orchestration with fake ports:

- `list` delegates to `UserReader`.
- `create` calls the user writer, then the audit writer.
- A user-write failure skips the audit write.
- An audit failure propagates so the caller can roll back.

`apps/api/test/transaction.test.ts` proves the real PostgreSQL boundary:

- A successful callback commits both the user and the `audit_events` row.
- A thrown error rolls back both writes.
- `apps/api/test/transaction.types.ts` is a compile-time guard: the root Kysely instance is
  rejected by `PostgresUserWriter`.

Default test database: in-memory PGlite. PGlite is single-connection, so serialization conflicts,
deadlocks, pool exhaustion, and retry behavior require real PostgreSQL.

```bash
pnpm test
```

Optional PostgreSQL 19 parity:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_test pnpm test
```

The test URL must end in `_test`; the harness creates and drops a unique schema.

## 10. Generate the OpenAPI artifact

```bash
pnpm openapi
```

Output: `apps/api/openapi.json` (OpenAPI 3.1.1). It is generated from the contract, not written by
hand. The React client does not require it.

## Where each concern lives

| Concern                       | Source                                         |
| ----------------------------- | ---------------------------------------------- |
| API input DTO                 | `createUserSchema`                             |
| API output DTO                | `userSchema`                                   |
| Client request/response types | `ContractRouterClient<typeof contract>`        |
| Form validation               | `zodResolver(createUserSchema)`                |
| Server validation             | oRPC contract                                  |
| Table DDL                     | PostgreSQL migration                           |
| Query row types               | `schema.generated.ts` from Kysely typegen      |
| Row → API mapping             | `toUser()` in `user.mapper.ts`                 |
| Read/write ports              | `UserReader` / `UserWriter`                    |
| Transaction boundary          | `UserService.create` + `UserTransactionRunner` |
| Durable audit                 | `PostgresAuditWriter` + `audit_events`         |
| Axios client                  | Not needed; `OpenAPILink` is typed fetch       |
| OpenAPI schema                | Generated from the contract                    |

## Add another feature

1. Add a schema and inferred types under `packages/contracts/src/schemas`.
2. Add a procedure to `contract.ts` with `.route`, `.input`, and `.output`.
3. Add a timestamped migration with `up` and `down`.
4. Run `pnpm db:migrate` and `pnpm db:types`.
5. Add `XReader` / `XWriter` ports under `apps/api/src/modules/<feature>`.
6. Implement `PostgresXReader` over `Kysely<DB>` and `PostgresXWriter` over `Transaction<DB>`;
   share the row mapper.
7. Add any write adapters to the module's transaction context and the composition-root context
   factory.
8. Add an application service that owns the use case and, for writes, the transaction boundary.
9. Implement the procedure in `apps/api/src/router/index.ts` against the service; keep error mapping
   in the router.
10. Add a route under `apps/web/src/routes` and query it with
    `orpc.<feature>.<procedure>.queryOptions()`.
11. If it mutates, add a form with the shared schema and invalidate `orpc.<feature>.key()`.
12. Add migration, adapter, service, and transaction-boundary tests.
13. Run `pnpm check`, `pnpm build`, and optionally `pnpm openapi`.

## SOLID mapping

| Principle             | Where it shows up                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single Responsibility | Schemas and contract in `contracts`; migrations and Kysely in `db`; transaction lifecycle in `db/transaction.ts`; persistence in readers/writers; use case in the service.      |
| Open/Closed           | New features add a schema, contract entry, migration, read/write adapters, service method, and route. The generic runner and existing features are untouched.                   |
| Liskov Substitution   | `PostgresUserReader`/`PostgresUserWriter` honor `UserReader`/`UserWriter`; service tests use fakes; another adapter can replace Postgres without changing the service.          |
| Interface Segregation | Reads and writes are separate ports; `UserTransaction` exposes only the repositories the use case needs.                                                                        |
| Dependency Inversion  | The router depends on `UserService`; the service depends on ports and `UserTransactionRunner`; the composition root injects Postgres adapters; the web depends on the contract. |

## Safety checklist

- [x] Server validates input and output against the contract.
- [x] Form validation is treated as UX, not as the security boundary.
- [x] oRPC is mounted before Express body parsing.
- [x] Environment variables are validated at startup.
- [x] `DATABASE_URL` is required; startup verifies `select 1`.
- [x] Secrets live in ignored `.env` files; examples are safe to commit.
- [x] Helmet and CORS are enabled.
- [x] Every request has a request ID and trace ID.
- [x] Access and audit logs exclude bodies, query strings, and credentials.
- [x] Mutating requests produce audit events, including 429s.
- [x] Per-IP global and write rate limits are enabled.
- [x] Expected 4xx errors are not logged as server incidents.
- [x] Duplicate emails map to 409, using the `users_email_key` constraint.
- [x] Write adapters require `Transaction<DB>`; only the transaction runner opens transactions.
- [x] The user write and durable audit row commit or roll back together.
- [x] Durable audit records committed facts only; failed attempts stay in the stdout stream.
- [x] No external I/O, nested transaction, or implicit ALS transaction inside a unit of work.
- [x] API pool sets connection, statement, and idle-in-transaction timeouts.
- [x] SIGINT/SIGTERM close the HTTP server and destroy the DB pool.
- [x] Migrations are never auto-applied.
- [x] Production rollback requires `ALLOW_DB_ROLLBACK=1`.
- [x] Test databases must end in `_test`; only a generated schema is dropped.
- [ ] Add authentication/authorization before exposing mutating endpoints.
- [ ] Use a shared rate-limit store before running multiple API replicas.
- [ ] Add CI and deployment migration orchestration.
- [ ] Add retries, isolation options, transaction metrics, and idempotency keys when needed.
- [ ] Replace local ACID with outbox/Saga only if services are split across databases.
