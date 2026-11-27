# Components

## Overview

Componentes de UI: layout, iconografía, primitivas y formularios de autenticación.

## Interface

- `SystemShell.tsx`: `SystemShell({ children })`; layout con navegación (`/proyectos`, `/proveedores`, `/users`), toggle de tema (`useTema`) y cierre de sesión.
- `AuthForm.tsx`: `SignInForm`, `SignUpForm`; react-hook-form + `zodResolver`; navegan a `/proyectos` tras el éxito.
- `Icons.tsx`: `SunIcon`, `MoonIcon`, `ResetIcon`, `UploadIcon`, `ArrowRightIcon`, `ArrowLeftIcon`, `CheckIcon`, `CloseIcon`, `AlertIcon`, `FileIcon`, `PrintIcon`, `MarkIcon`.
- `ui.tsx`: `Tono`, `Badge`, `PageHead`, `Panel`, `Vacio`.

## Invariants

- La validación del formulario es UX; el servidor revalida.
- Los iconos son presentacionales y reciben `IconProps`.
- El tema se resuelve con `useTema` (`lib/theme`), no con estado local duplicado.
- La navegación usa el router; no hay `window.location` para rutas internas.

## Side Effects

- Peticiones de autenticación, navegación del router y cambio de tema en `localStorage`/documento.

## Verification

- Run: `pnpm --filter @repo/web typecheck`
