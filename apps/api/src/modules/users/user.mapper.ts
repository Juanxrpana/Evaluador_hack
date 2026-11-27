import type { User } from '@repo/contracts';
import type { Selectable } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';

/**
 * The compiler-checked boundary between the generated database row and the
 * Zod-owned API type.
 */
export function toUser(row: Selectable<DB['users']>): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
