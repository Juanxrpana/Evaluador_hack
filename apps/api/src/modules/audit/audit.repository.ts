/**
 * Request metadata captured at the composition boundary. Keeping this out of
 * the service and the adapter's runtime imports makes the audit writer
 * testable without booting the HTTP/logger stack.
 */
export interface AuditCorrelation {
  actorId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
}

/**
 * Durable, success-only audit port. Implementations write through the
 * transaction that produced the audited fact.
 */
export interface AuditRecord {
  action: string;
  resource: string;
  resourceId: string;
}

export interface AuditWriter {
  record(event: AuditRecord): Promise<void>;
}
