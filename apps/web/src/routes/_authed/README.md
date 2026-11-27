# Rutas autenticadas

## Overview

Pantallas protegidas por el guard `_authed`. Consumen la API con `orpc` y TanStack Query.

## Interface

- `proyectos.tsx`: layout de `/proyectos`; renderiza `<Outlet />` para la lista y el detalle.
- `proyectos.index.tsx`: lista, alta, edición y borrado de proyectos; enlaza al detalle.
- `proyectos.$id.tsx`: layout de `/proyectos/$id`; renderiza `<Outlet />`.
- `proyectos.$id.index.tsx`: detalle del proyecto (propuestas, proveedores, documentos, conocimiento, recargos, notas, estatus y chat).
- `proyectos.$id.informe.tsx`: informe preliminar en USD con conversión BCV, notas, estatus, impresión y CSV.
- `proveedores.tsx`: directorio e historial de proveedores.
- `users.tsx`: lista de usuarios autenticados.

## Invariants

- Toda consulta/mutación usa `orpc.<recurso>.*` y las query keys derivadas.
- Los errores de mutación se muestran con `messageOf`.
- Tras crear/editar/borrar se invalida la query de la lista correspondiente.
- El borrado de un proyecto advierte que arrastra propuestas, documentos y conocimiento.

## Side Effects

- Peticiones HTTP autenticadas y actualización de la caché de TanStack Query.

## Verification

- Run: `pnpm --filter @repo/web typecheck`
