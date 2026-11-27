import { betterAuth } from 'better-auth';
import type { Kysely } from 'kysely';
import type { DB } from '../db/schema.generated.ts';

export interface AuthConfig {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
}

/**
 * Better Auth owns credentials, sessions, and verification records, but the
 * identity row stays in the existing `users` table. The field maps below keep
 * the project's snake_case database convention without renaming model fields
 * in application code.
 */
export function createAuth(db: Kysely<DB>, config: AuthConfig) {
  return betterAuth({
    secret: config.secret,
    baseURL: config.baseURL,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    database: {
      db,
      type: 'postgres',
      transaction: true,
    },
    advanced: {
      database: {
        // The existing users.id column is uuid. Better Auth then generates
        // UUID strings for sessions, accounts, and verifications too.
        generateId: 'uuid',
      },
      ipAddress: {
        // `app.ts` overwrites this header with Express `req.ip`, which already
        // respects TRUST_PROXY. Do not let clients choose their rate-limit key.
        ipAddressHeaders: ['x-client-ip'],
      },
    },
    user: {
      modelName: 'users',
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    session: {
      modelName: 'sessions',
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
      },
    },
    account: {
      modelName: 'accounts',
      fields: {
        userId: 'user_id',
        accountId: 'account_id',
        providerId: 'provider_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    verification: {
      modelName: 'verifications',
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
