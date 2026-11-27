import type { Transaction } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import type { AuditCorrelation, AuditRecord, AuditWriter } from './audit.repository.ts';

/**
 * Writes the durable audit row in the caller's transaction. Correlation
 * metadata is captured by the composition root while the request context is
 * active; background jobs pass nothing.
 */
export class PostgresAuditWriter implements AuditWriter {
  readonly #trx: Transaction<DB>;
  readonly #correlation: AuditCorrelation;

  constructor(trx: Transaction<DB>, correlation: AuditCorrelation = {}) {
    this.#trx = trx;
    this.#correlation = correlation;
  }

  async record(event: AuditRecord): Promise<void> {
    await this.#trx
      .insertInto('audit_events')
      .values({
        action: event.action,
        resource: event.resource,
        resource_id: event.resourceId,
        actor_id: this.#correlation.actorId ?? null,
        request_id: this.#correlation.requestId ?? null,
        trace_id: this.#correlation.traceId ?? null,
      })
      .execute();
  }
}
