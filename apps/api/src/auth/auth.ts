import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import type { Kysely } from 'kysely';
import type { DB } from '../db/schema.generated.ts';
import { uuidv7 } from '../shared/uuidv7.ts';

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
    plugins: [
      // Lets the React Native app authenticate with `Authorization: Bearer`:
      // sign-in/sign-up responses include the session token (RN has no
      // cookie jar). The web app keeps using cookies.
      bearer(),
    ],
    database: {
      db,
      type: 'postgres',
      transaction: true,
    },
    advanced: {
      database: {
        // The `users.id` column is uuid. Every id Better Auth generates
        // (users, sessions, accounts, verifications) is UUID v7: time-ordered
        // like the domain tables' PostgreSQL `uuidv7()` defaults.
        generateId: () => uuidv7(),
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
