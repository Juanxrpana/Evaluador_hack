# Drift Report — 2026-11-27

Alcance: los 41 contratos EGM generados en este repositorio (README.md por directorio + `README.egm.md` raíz). Solo se listan divergencias; el resto coincide con el código.

## apps/api/src/modules/propuestas/README.md

- El contrato inicial omitía `PropuestaService.actualizar` y `PropuestaService.eliminar`, `UpdatePropuestaInput` y `PropuestaWriter.update`/`remove`; el código sí los tiene. **Corregido en esta revisión.**

## apps/api/src/modules/proveedores/README.md

- El contrato inicial omitía `ProveedorService.actualizar` y `ProveedorService.eliminar`, `UpdateProveedorInput` y `ProveedorWriter.update`/`remove`; el código sí los tiene. **Corregido en esta revisión.**

## apps/api/src/modules/proyectos/README.md

- El contrato inicial omitía `ProyectoService.actualizar` y `ProyectoService.eliminar`, `UpdateProyectoInput` y `ProyectoWriter.update`/`remove`; el código sí los tiene. **Corregido en esta revisión.**

## apps/api/src/modules/documentos/README.md

- El contrato inicial omitía `DocumentoService.eliminar`, el puerto `ExtractorMontos`/`MontosExtraidos` y `LlmMontosExtractor`, `ConocimientoListReader`/`ConocimientoListService`, y la escritura de `propuesta.monto`/`recargos` dentro de la transacción. **Corregido en esta revisión.**
- El nombre del adaptador de listado era impreciso (`PostgresConocimientoList`); el real es `PostgresConocimientoListReader` + `ConocimientoListService`. **Corregido.**

## apps/web/src/components/README.md

- El contrato inicial no cubría `SystemShell`, `Icons` ni `ui`. **Corregido en esta revisión** con la interfaz actual.
- La inconsistencia de navegación (`AuthForm` → `/users` mientras `/` → `/proyectos`) quedó **resuelta** por el rediseño concurrente: `AuthForm` ahora navega a `/proyectos`.

## apps/web/src/lib/README.md

- El contrato inicial no cubría `format.ts` (`fecha`, `fechaCorta`, `monto`, `numeroDe`) ni `theme.ts` (`Tema`, `useTema`). **Corregido en esta revisión.**

## apps/web/src/routes/README.md

- El contrato inicial describía `__root.tsx` con su propio header; el código actual delega el layout en `SystemShell`. **Corregido.**
- La nota de inconsistencia de navegación se retiró: ya está resuelta.

## README.md (raíz)

- Brecha de documentación: el `README.md` raíz (512 líneas) sigue describiendo el starter original centrado en `users` y no el dominio del evaluador (`proyectos`, `propuestas`, `documentos`, conocimiento vectorizado, chat). No se sobrescribió; el blueprint nuevo está en `README.egm.md`. Recomendación: actualizar o reemplazar el README raíz en una tarea aparte.

## README.egm.md y resto de contratos

- No drift detected en los demás contratos (API `src`, `auth`, `config`, `db`, migraciones, `observability`, `router`, `scripts`, `shared`, módulos `ai`/`audit`/`chat`/`estatus`/`notas`/`recargos`/`users`, blueprints de `apps`/`packages`, web y mobile).
