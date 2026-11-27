# Automatización de correos con adjuntos (módulo `correos`)

Guía de implementación para añadir un módulo que revisa un buzón vía **IMAP**, filtra los
correos que tienen **archivos adjuntos** y los muestra en la web, siguiendo la arquitectura
existente del monorepo (contract-first con Zod, puertos/adaptadores, oRPC + TanStack Query).

---

## 1. Resultado esperado

Al terminar la implementación, esto debe funcionar de punta a punta:

1. El usuario inicia sesión en la web (`/login`).
2. Entra a la nueva página **`/correos`** (enlace "Correos" en la navegación principal).
3. La página consulta el endpoint `correos.list` → el API se conecta al servidor IMAP
   configurado por variables de entorno, recorre la carpeta `INBOX` y devuelve solo los
   correos que tienen al menos un adjunto.
4. Cada correo se muestra con: **remitente, asunto, fecha y lista de adjuntos**
   (nombre, tipo MIME y tamaño en KB). Los bytes de los adjuntos **no se descargan**:
   el filtro usa el `BODYSTRUCTURE` del servidor (solo metadatos).
5. Los correos sin adjuntos no aparecen. Si el buzón no tiene correos con adjunto,
   la página muestra un estado vacío legible.
6. Sin sesión activa la ruta responde `401 UNAUTHORIZED` (middleware `authenticated`).
7. Credenciales IMAP incorrectas → error de dominio tipado → mensaje claro en la UI,
   sin exponer la contraseña ni stack traces.

**Rutas creadas**

| Capa | Ruta / ubicación |
|---|---|
| oRPC / HTTP | `correos.list` → `GET /api/correos/list` |
| Página web | `apps/web/src/routes/_authed/correos.tsx` → `/_authed/correos` |

---

## 2. Prerrequisitos (configuración del proveedor)

### Gmail

1. Activar la **verificación en 2 pasos** en la cuenta de Google.
2. Crear una **contraseña de aplicación** (16 caracteres):
   `myaccount.google.com` → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación.
   No es la contraseña personal; se puede revocar en cualquier momento.
3. Confirmar que **IMAP está habilitado**: Gmail web → Configuración →
   Reenvío y correo POP/IMAP → "Habilitar IMAP".
4. Datos de conexión: host `imap.gmail.com`, puerto `993`, TLS sí.

### Outlook.com personal

- Igual: 2FA + contraseña de aplicación → `outlook.office365.com:993`.

> ⚠️ **Microsoft 365 empresarial:** el tenant puede tener IMAP bloqueado o exigir
> OAuth2 (XOAUTH2). En ese caso el adaptador debería reemplazarse por Microsoft Graph;
> el puerto (`CorreoProvider`) existe precisamente para eso.

---

## 3. Paso 0 — Dependencias

Librerías: **`imapflow`** (cliente IMAP moderno, del ecosistema Nodemailer, con tipos
incluidos) y **`mailparser`** (parser MIME, se usará cuando se quiera descargar adjuntos).

1. Añadir al `catalog` de `pnpm-workspace.yaml` (usar las versiones vigentes en npm):

   ```yaml
   imapflow: '^1.0.0'
   mailparser: '^3.7.0'
   '@types/mailparser': '^3.4.0'
   ```

2. En `apps/api/package.json`, añadir:

   ```json
   "dependencies": {
     "imapflow": "catalog:",
     "mailparser": "catalog:"
   },
   "devDependencies": {
     "@types/mailparser": "catalog:"
   }
   ```

3. Instalar y verificar:

   ```bash
   pnpm install
   ```

---

## 4. Paso 1 — Contratos (`packages/contracts`)

### 4.1 Nuevo archivo `src/schemas/correos.ts`

Patrón: los montos y fechas cruzan la API como strings (igual que en `evaluador.ts`).

```ts
import { z } from 'zod';

/** Metadata of one attachment, derived from the IMAP BODYSTRUCTURE. Bytes never cross the API. */
export const correoAdjuntoSchema = z.object({
  nombre: z.string().trim().min(1).max(300),
  mime: z.string().max(100),
  tamanoBytes: z.number().int().nonnegative(),
});

export const correoSchema = z.object({
  messageId: z.string().trim().min(1),
  de: z.string().trim().max(500),
  asunto: z.string().trim().max(1000),
  fecha: z.iso.datetime(),
  carpeta: z.string().trim().min(1).max(200),
  adjuntos: z.array(correoAdjuntoSchema).min(1), // solo correos CON adjunto
});

export const correoListInput = z.object({
  carpeta: z.string().trim().min(1).max(200).default('INBOX'),
  limite: z.number().int().min(1).max(200).default(50),
});

export type CorreoAdjunto = z.infer<typeof correoAdjuntoSchema>;
export type Correo = z.infer<typeof correoSchema>;
export type CorreoListInput = z.infer<typeof correoListInput>;
```

### 4.2 `src/index.ts` — añadir el export

```ts
export * from './schemas/correos.ts';
```

### 4.3 `src/contract.ts` — registrar la ruta

Importar `correoListInput` y `correoSchema`, y añadir al objeto `contract`:

```ts
correos: {
  list: oc
    .route({
      method: 'GET',
      path: '/correos/list',
      tags: ['evaluador'],
      summary: 'Listar correos del buzón que tienen archivos adjuntos',
    })
    .input(correoListInput)
    .output(z.array(correoSchema)),
},
```

---

## 5. Paso 2 — Configuración de entorno

### 5.1 `apps/api/src/config/env.ts`

Añadir al `envSchema` (con defaults para poder correr tests sin buzón):

```ts
// IMAP (lectura de correos). The password is an application password,
// never the account's primary one.
IMAP_HOST: z.string().default(''),
IMAP_PORT: z.coerce.number().int().positive().default(993),
IMAP_TLS: z.stringbool().default(true),
IMAP_USER: z.string().default(''),
IMAP_PASSWORD: z.string().default(''),
IMAP_CORREOS_LIMITE: z.coerce.number().int().positive().default(50),
```

### 5.2 `apps/api/.env.example` — documentar

```bash
# IMAP (email scanning). Use an APPLICATION password, never the primary one.
# Leave IMAP_HOST empty to disable the module (list returns an empty array).
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_TLS=true
IMAP_USER=tucorreo@gmail.com
IMAP_PASSWORD=replace-me-with-16-char-app-password
IMAP_CORREOS_LIMITE=50
```

### 5.3 Local

```bash
cp apps/api/.env.example apps/api/.env   # el archivo .env está en .gitignore
# editar apps/api/.env con los valores reales
```

### 5.4 Docker (`compose.yaml`)

Pasar las variables al servicio de la API (el contenedor no hereda el `.env` local):

```yaml
services:
  api:
    env_file:
      - apps/api/.env
```

---

## 6. Paso 3 — Módulo `apps/api/src/modules/correos/`

Patrón hexagonal igual que `documentos`/`proveedores`: **puerto** (interfaz),
**adaptador** (IMAP), **servicio** (errores de dominio).

### 6.1 Puerto — `correo.provider.ts`

```ts
import type { Correo } from '@repo/contracts';

export interface CorreoProvider {
  /** Returns only messages that have at least one attachment. */
  listarConAdjuntos(input: { carpeta: string; limite: number }): Promise<Correo[]>;
}
```

### 6.2 Adaptador — `imap.correo.provider.ts`

Responsabilidades:

- Conectar con `ImapFlow` usando `env.IMAP_*` y `client.getMailboxLock(carpeta)`.
- `client.fetch({ all: true }, { envelope: true, bodyStructure: true })` → recorrer
  **sin descargar bytes**.
- Detectar adjuntos recorriendo el árbol `bodyStructure`: nodos con
  `disposition` igual a `attachment` (o con `filename`), tomando `dispositionParameters.filename`
  (o `id` como fallback), `type` y `size`.
- Filtrar: solo mensajes con `adjuntos.length >= 1`. Respetar `limite`.
- Cerrar SIEMPRE el lock (`lock.release()` en `finally`) y la conexión.
- Mapear cualquier fallo de conexión/auth a `CorreoNoDisponibleError`; nunca loguear
  `IMAP_PASSWORD`.
- Si `env.IMAP_HOST === ''` (módulo deshabilitado) → devolver `[]` sin conectar.

Esqueleto de referencia:

```ts
import { ImapFlow } from 'imapflow';
import { env } from '../../config/env.ts';
import type { Correo } from '@repo/contracts';
import type { CorreoProvider } from './correo.provider.ts';

export class ImapCorreoProvider implements CorreoProvider {
  async listarConAdjuntos(input: { carpeta: string; limite: number }): Promise<Correo[]> {
    if (!env.IMAP_HOST) return []; // módulo deshabilitado

    const client = new ImapFlow({
      host: env.IMAP_HOST,
      port: env.IMAP_PORT,
      secure: env.IMAP_TLS,
      auth: { user: env.IMAP_USER, pass: env.IMAP_PASSWORD },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock(input.carpeta);
      const encontrados: Correo[] = [];

      try {
        for await (const msg of client.fetch(
          { all: true },
          { envelope: true, bodyStructure: true },
        )) {
          const adjuntos = extraerAdjuntos(msg.bodyStructure);
          if (adjuntos.length === 0) continue;

          encontrados.push({
            messageId: String(msg.uid),
            de: msg.envelope?.from
              ?.map((m) => `${m.name ?? ''} <${m.address ?? ''}>`.trim())
              .join(', ') ?? '(sin remitente)',
            asunto: msg.envelope?.subject ?? '(sin asunto)',
            fecha: (msg.envelope?.date ?? new Date()).toISOString(),
            carpeta: input.carpeta,
            adjuntos,
          });

          if (encontrados.length >= input.limite) break;
        }
      } finally {
        lock.release();
      }

      return encontrados;
    } catch (cause) {
      throw new CorreoNoDisponibleError(cause);
    } finally {
      await client.logout().catch(() => {});
    }
  }
}

export class CorreoNoDisponibleError extends Error { /* ... */ }
```

> `extraerAdjuntos()` es una función recursiva privada del adaptador que recorre el árbol
> MIME (`childNodes` incluidos) y aplica las reglas de la sección anterior. No se descarga
> ningún cuerpo (`{ bodyStructure: true }` solo pide estructura).

### 6.3 Servicio — `correo.service.ts`

Sin base de datos (v1 es stateless): valida límites y traduce errores a dominio.

```ts
import type { Correo } from '@repo/contracts';
import type { CorreoProvider } from './correo.provider.ts';

export class CorreoService {
  readonly #provider: CorreoProvider;

  constructor(provider: CorreoProvider) {
    this.#provider = provider;
  }

  async listar(input: { carpeta: string; limite: number }): Promise<Correo[]> {
    return this.#provider.listarConAdjuntos(input);
  }
}

export class CorreoNoDisponibleError extends Error {
  constructor(cause: unknown) {
    super('El servidor de correo no está disponible o las credenciales son inválidas');
    this.name = 'CorreoNoDisponibleError';
    this.cause = cause;
  }
}
```

---

## 7. Paso 4 — Router y composition root

### 7.1 `apps/api/src/router/index.ts`

1. Importar `CorreoService`, `CorreoNoDisponibleError` y añadir `correos: CorreoService`
   a `RouterDependencies`.
2. En `mapDomainError`, mapear `CorreoNoDisponibleError` →
   `ORPCError('INTERNAL', ...)` con mensaje seguro (o `BAD_GATEWAY` si se prefiere 502).
3. Añadir al router:

   ```ts
   correos: {
     list: os.correos.list
       .use(authenticated)
       .handler(({ input }) => correos.listar(input).catch(mapDomainError)),
   },
   ```

### 7.2 `apps/api/src/index.ts` (composition root)

Cablear el adaptador concreto e inyectarlo en `createApp`:

```ts
import { ImapCorreoProvider } from './modules/correos/imap.correo.provider.ts';
import { CorreoService } from './modules/correos/correo.service.ts';

const correos = new CorreoService(new ImapCorreoProvider());

const app = createApp({
  // ...dependencias existentes
  correos,
});
```

Si `createApp` está en `apps/api/src/app.ts`, extender su interfaz para aceptar `correos`
y pasarla a `createRouter`.

---

## 8. Paso 5 — Página web

### 8.1 Nueva ruta `apps/web/src/routes/_authed/correos.tsx`

Copiar la estructura de `proveedores.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { messageOf } from '../../lib/errors';
import { orpc } from '../../lib/orpc';

export const Route = createFileRoute('/_authed/correos')({
  component: CorreosPage,
});

function CorreosPage() {
  const { data: correos, isPending, error } = useQuery(
    orpc.correos.list.queryOptions({ input: { carpeta: 'INBOX', limite: 50 } }),
  );

  // estados: isPending → 'Buscando…', error → field-error,
  // lista vacía → 'No hay correos con adjuntos.',
  // cada correo: <strong>{asunto}</strong>, remitente, fecha local y
  // lista de adjuntos con nombre + mime + tamaño en KB.
}
```

### 8.2 Navegación — `apps/web/src/routes/__root.tsx`

Añadir junto a los enlaces existentes:

```tsx
<Link to="/correos" activeProps={{ className: 'active' }}>
  Correos
</Link>
```

---

## 9. Paso 6 — Verificación (checklist de aceptación)

```bash
pnpm install
pnpm --filter @repo/contracts build   # si aplica
pnpm --filter @repo/api typecheck
pnpm --filter @repo/web typecheck
pnpm --filter @repo/api test
```

Escenarios a validar manualmente (`pnpm dev` del API y de la web):

- [ ] `/correos` redirige a login si no hay sesión; con sesión muestra la página.
- [ ] Con buzón configurado y correos con adjunto: se listan **solo** esos correos,
      con remitente/asunto/fecha y adjuntos con nombre, tipo y tamaño.
- [ ] Un correo sin adjuntos NO aparece (verificar con un correo de prueba).
- [ ] `IMAP_HOST` vacío → la página muestra "no hay correos con adjuntos" (sin error 500).
- [ ] Contraseña IMAP incorrecta → mensaje de dominio claro; en los logs NO aparece
      la contraseña (probar `grep` del log).
- [ ] La query no se re-ejecuta en cada render (caché de TanStack Query por defecto).
- [ ] `pnpm --filter @repo/web build` compila sin errores de tipos.

---

## 10. Notas de seguridad

| Regla | Motivo |
|---|---|
| Usar **contraseña de aplicación** revocable, nunca la principal | Contención de incidentes en 10 segundos |
| Credenciales solo en `apps/api/.env` (gitignored) | El navegador jamás habla con el servidor IMAP |
| Nunca loguear `IMAP_PASSWORD` | El adaptador solo loguea host/carpeta/resultado |
| Solo metadatos (`BODYSTRUCTURE`), no bytes | El escaneo de cientos de correos pesa KB, no GB |
| Ruta tras `authenticated` | Un anónimo no puede hacer que el servidor consulte IMAP |

---

## 11. Extensión futura (v2, fuera de alcance actual)

- **Escaneo periódico:** job interno de la API (`setInterval`/cron) que consulta IMAP
  cada N minutos, guarda los hallazgos en una tabla `correos_adjuntos` (migración nueva)
  y la página pasa a leer de Postgres en vez de tocar IMAP en cada visita.
- **Descarga de adjuntos:** con `mailparser` + `client.download()`, guardarlos en la
  tabla `documentos` existente para alimentar la base de conocimiento vectorizada.
- **OAuth2 (Gmail/M365):** reemplazar el adaptador IMAP sin tocar contratos ni servicio.
