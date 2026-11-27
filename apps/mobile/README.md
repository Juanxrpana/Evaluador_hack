# Evaluador — app móvil (React Native + Expo)

Frontend móvil del sistema evaluador: login con Better Auth, proyectos,
usuarios y la futura base de conocimiento vectorizada.

## Stack

- Expo SDK 58 (React Native 0.88, expo-router para navegación)
- `@repo/contracts` reutilizado: el mismo contrato oRPC + Zod de la web
- oRPC client tipado (`@orpc/openapi-client`) + TanStack Query
- Better Auth con plugin **bearer**: el token de sesión se guarda en
  `expo-secure-store` y viaja en `Authorization: Bearer` (RN no tiene cookie
  jar; la web sigue usando cookies)

## Desarrollo

```bash
pnpm install            # desde la raíz del monorepo
cp .env.example .env    # apunta EXPO_PUBLIC_API_URL a tu API
pnpm dev                # expo start (desde apps/mobile)
```

- Simulador iOS / web: `EXPO_PUBLIC_API_URL=http://localhost:3000`
- Emulador Android: `http://10.0.2.2:3000`
- Dispositivo físico: la IP LAN de la máquina que corre la API

## Estructura

```text
src/app/          rutas expo-router: (auth) login/registro, (tabs) app
src/lib/          auth-client (Better Auth), orpc (cliente tipado),
                  session (provider de sesión), token (SecureStore)
src/components/   primitivas de UI (Screen, Card, Input, Button)
```

## Pantallas

- **(auth)** registro e inicio de sesión (email + contraseña)
- **Proyectos** — lista (contenido placeholder pendiente del endpoint)
- **Usuarios** — conectado al endpoint real `GET /api/users` vía oRPC
- **Conocimiento** — placeholder de la futura búsqueda vectorial (bge-m3)
- **Perfil** — sesión activa y cierre de sesión
