# Auth

## Overview

Configuración de Better Auth. La identidad sigue viviendo en la tabla `users`; credenciales, sesiones y verificaciones usan tablas propias. El plugin `bearer` permite que la app móvil use `Authorization: Bearer` (React Native no tiene cookie jar).

## Interface

- `AuthConfig` `{ secret, baseURL, trustedOrigins }`.
- `createAuth(db: Kysely<DB>, config: AuthConfig)`.
- `Auth = ReturnType<typeof createAuth>`.

## Invariants

- Email y contraseña habilitados; el alta pública la posee Better Auth.
- Todos los ids que genera Better Auth son UUID v7 (`generateId: () => uuidv7()`).
- Los nombres de columnas se mapean a snake_case (`email_verified`, `created_at`, `user_id`, …).
- El header de IP es `x-client-ip`; `app.ts` lo sobrescribe con `req.ip` para que el cliente no elija su clave de rate limit.
- Better Auth ejecuta sus escrituras dentro de una transacción (`database.transaction: true`).

## Side Effects

- Lee/escribe `users`, `sessions`, `accounts` y `verifications`.

## Verification

- Run: `pnpm --filter @repo/api test`
