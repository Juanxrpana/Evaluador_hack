# ADR 0001: Transaction boundary and service layer

- **Status:** Accepted
- **Date:** 2026-11-27
- **Scope:** `apps/api`

## Context

The API started as a contract-first modular monolith with one PostgreSQL database. The oRPC router
called a repository directly: one aggregate, one repository method, one implicit database
transaction. That shape cannot express a use case that must write more than one repository
atomically, such as creating a user and recording a durable audit row.

The architecture needs:

- one ACID unit of work per use case, spanning multiple repository ports in the same PostgreSQL
  database;
- a service layer that owns use-case orchestration without importing Kysely, Express, or oRPC;
- a compile-time guarantee that write repositories cannot accidentally use the root connection;
- a durable audit record that commits or rolls back with the domain change;
- no accidental distributed-transaction semantics.

## Decision

### One local transaction per use case

`apps/api/src/db/transaction.ts` provides a generic function type and a Kysely adapter:

```ts
export type TransactionRunner<Tx> = <T>(work: (tx: Tx) => Promise<T>) => Promise<T>;

export function createTransactionRunner<Tx>(
  db: Kysely<DB>,
  createContext: (trx: Transaction<DB>) => Tx,
): TransactionRunner<Tx> {
  return (work) => db.transaction().execute((trx) => work(createContext(trx)));
}
```

The adapter is module-agnostic. The composition root supplies the context factory. `UserService`
calls the runner once for the `create` use case; resolving commits, throwing rolls back.

### Module-local transaction context

`UserTransaction` exposes only the ports the user use case needs:

```ts
export interface UserTransaction {
  readonly users: UserWriter;
  readonly audit: AuditWriter;
}
```

There is no global repository registry, service locator, or `UnitOfWork` class. Reads use
`UserReader` through the root connection; writes receive transaction-bound adapters.

### Read/write adapters enforce the boundary

`PostgresUserReader` takes `Kysely<DB>`. `PostgresUserWriter` and `PostgresAuditWriter` take
`Transaction<DB>`. Kysely's `Transaction<DB>` extends `Kysely<DB>`, but the reverse assignment is not
valid, so the root connection is rejected at compile time. `apps/api/test/transaction.types.ts`
keeps that guard checked by `pnpm typecheck`.

### Service layer owns use cases

`UserService` is the application layer. The router remains a transport adapter: it maps domain
errors to oRPC errors, emits the post-commit stdout success audit, and never opens a transaction.
Repositories never open transactions either; only the runner does.

### Authentication boundary

Better Auth owns credential, account, and session writes through its own adapter and transaction.
The exposed `GET /users` read uses `UserService.list`. `UserService.create` remains the reference
application write use case for the multi-repository transaction pattern; it is not exposed while
Better Auth owns public sign-up. This ADR applies to application-domain writes, not to Better Auth's
internal writes.

### Durable audit is success-only and atomic

`audit_events` rows are written in the same transaction as the domain change. A rollback removes
both. Failed attempts remain in the existing stdout audit stream. An audit-insert failure rolls back
the user creation; that availability/compliance trade-off is intentional.

### Explicit rejections

- **No nested transactions.** Kysely 0.29 deprecates `Transaction.transaction()`. Compose
  repositories in one callback; do not call another transactional service inside a transaction.
- **No ALS request transaction.** `AsyncLocalStorage` remains for request IDs, logging, and actor
  propagation. Transaction scope must be visible in the call graph.
- **No 2PC/XA.** ACID applies to one PostgreSQL database. Cross-database work would use an outbox
  plus Saga, not a global transaction abstraction.
- **No retry in v1.** If added, retry only `40001`/`40P01`, recreate the transaction and context per
  attempt, require a side-effect-free callback, and never retry `23505` or domain errors.
- **No external I/O in a transaction.** Network calls, email, and queue publishes belong after commit
  or in an outbox.

### Isolation and pool policy

Default isolation is `READ COMMITTED`. Contended read-modify-write uses `SELECT ... FOR UPDATE`;
`SERIALIZABLE` is reserved for a specific invariant with a bounded retry loop. The API pool sets
`connectionTimeoutMillis`, `statement_timeout`, and `idle_in_transaction_session_timeout`.
Migrations keep no statement timeout because a legitimate migration may be longer than a request.

## Consequences

### Positive

- User creation and its durable audit row are atomic.
- The service is testable without a database using fake ports and a fake runner.
- Write adapters cannot silently escape the transaction.
- The transaction runner is reusable by future modules without a global context.
- The router stays thin and transport-specific.

### Negative / trade-offs

- A write now holds a pool connection across `BEGIN`/`COMMIT`; transactions must stay short.
- An audit outage blocks user creation (atomicity over availability). A future best-effort or
  outbox variant would change that contract.
- `PostgresUserReader.list()` is not part of a snapshot; a use case that needs read consistency must
  perform the read inside the runner.
- Output validation and the post-commit stdout audit happen after commit. A failure there can return
  5xx for a committed write; clients may need idempotency keys.
- PGlite is single-connection, so concurrency, deadlock, and retry behavior need real PostgreSQL.

### Operational

- Monitor transaction duration, rollback count, pool wait, and retry count when retries are added.
- Size `DATABASE_POOL_MAX` against PostgreSQL `max_connections`; transactions pin one connection.
- The `audit_events` table is append-only from the application. Add retention/archival policy before
  production growth.

## Alternatives considered

1. **Global `UnitOfWork` + `TransactionContext` registry.** Rejected: becomes a service locator,
   violates interface segregation, and couples the database layer to every module.
2. **Executor parameter on every repository method.** Rejected: pollutes ports with persistence
   concerns and makes forgetting the executor a runtime bug.
3. **Request-scoped transaction via `AsyncLocalStorage`.** Rejected: holds a connection through
   response serialization, hides the correctness boundary, and fails outside HTTP.
4. **Repository-owned transactions.** Rejected: cannot compose multiple repositories atomically.
5. **Distributed transaction/2PC.** Rejected: operationally hostile, not supported by Kysely, and
   unnecessary while the system is one PostgreSQL database.

## Follow-ups

- Retry and isolation options with bounded jitter and idempotency keys.
- Transaction duration/rollback/pool metrics.
- Outbox and relay only if services or databases are split.
- Idempotency key support for client retries after ambiguous commit failures.
- Retention policy for `audit_events`.
- Authentication/authorization populating `actor_id`.

## References

- `apps/api/src/db/transaction.ts`
- `apps/api/src/modules/users/user.service.ts`
- `apps/api/src/modules/users/user.transaction.ts`
- `apps/api/src/modules/audit/postgres-audit.writer.ts`
- `docs/architecture.md#transaction-boundary`
- `docs/database.md#transactions-and-durable-audit`
