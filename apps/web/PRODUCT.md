# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Evaluadores de compras de laboratorio en Venezuela: una persona o un equipo pequeño que recibe propuestas de proveedores para un proyecto de equipos, las carga en el sistema y necesita comparar montos, recargos y antecedentes antes de que alguien firme la adjudicación.

Escena real de uso: escritorio de oficina, documentos PDF e imágenes de cotizaciones, una sesión iniciada y un proyecto abierto. Consulta frecuente en teléfono para revisar un proveedor o el historial de costos.

## Product Purpose

Organiza proyectos, proveedores, propuestas y documentos; extrae montos y recargos de los documentos; conserva el historial de costos por proveedor y permite consultar la base de conocimiento del proyecto. No adjudica: ordena, explica y deja rastro para que una persona decida.

El sistema es funcional de extremo a extremo para el tramo que ya existe: autenticación, alta de proyectos y proveedores, carga de PDF/PNG/JPG, extracción asistida por IA, vectorización y chat sobre el proyecto. El ranking, la revisión y el dictamen existen como lenguaje visual y modelo de datos, pero aún no tienen endpoints ni pantallas conectadas.

## Positioning

La extracción con IA propone datos; el contrato Zod, la base de datos y las reglas del sistema los validan. Cada cifra puede rastrearse hasta un documento, una regla y una fecha. La interfaz trata el documento como evidencia, no como una caja negra.

## Operating Context

- El acceso requiere sesión con Better Auth (correo y contraseña). La web usa cookie; la app móvil usa bearer.
- Flujo principal: proyecto → proveedores → propuestas → documentos → extracción → historial y conocimiento.
- Los documentos aceptados son PDF, PNG y JPG. El contenido sale a un proveedor externo de lectura (OpenRouter) y se vectoriza con bge-m3.
- La extracción devuelve el monto total y los recargos detectados cuando el documento se vincula a una propuesta.
- El historial de costos se deriva de las propuestas y sus recargos, no de una tabla manual.
- El chat responde con fuentes del proyecto (documentos y fragmentos de conocimiento).
- Los estados de una propuesta se guardan como códigos numéricos; su catálogo legible aún no está cerrado.
- Los montos se guardan como `numeric`; la interfaz los muestra con formato venezolano y sin cálculos en coma flotante.

## Capabilities and Constraints

- Web: React 19 + Vite + TanStack Router/Query + oRPC tipado desde `@repo/contracts`.
- API: Express + Better Auth + Kysely/PostgreSQL; proyectos, proveedores, propuestas, documentos, recargos, notas, estatus, conocimiento y chat.
- La base usa pgvector; la app móvil reutiliza el contrato con sesión bearer.
- Autenticación obligatoria en las rutas `_authed`; `/login` y `/signup` redirigen a `/proyectos` con sesión.
- No hay UI de roles ni permisos: la base ya tiene roles, pero el front no los expone ni los aplica.
- No hay endpoints de ranking, revisión o dictamen; el front no debe simular que existen.
- No se promete TCO completo (energía, mantenimiento, garantía extendida) ni exactitud perfecta de OCR.
- Los documentos se envían a un servicio externo de lectura (OpenRouter). El cifrado en reposo aún no está implementado; es un pendiente de seguridad (F.2).
- Interfaz en español de Venezuela, responsive mobile-first, con modo oscuro por defecto y modo claro.
- Abierto: catálogo legible de estados, política de roles, tasa BCV y formato de dictamen.

## Brand Commitments

- Nombre de trabajo: Evaluador de Propuestas de Laboratorio.
- Registro profesional, impersonal y verificable. Sin hype, sin gamificación, sin promesas de adjudicación automática.
- Los montos y proveedores de prueba se declaran como tales cuando corresponda.

## Evidence on Hand

- `apps/web/src`: sistema web real (login, proyectos, proveedores, detalle con documentos, chat y conocimiento).
- `apps/api/src`: módulos de proyectos, proveedores, propuestas, documentos, recargos, notas, estatus y chat.
- `packages/contracts/src/schemas/evaluador.ts`: contrato Zod de todas las entidades.
- `docs/`: arquitectura, autenticación y base de datos.
- No existen testimonios, clientes ni métricas de producción; no deben fabricarse.

## Product Principles

1. Explicar antes que impresionar: cada cifra tiene fuente, fecha y regla.
2. Ninguna propuesta desaparece: lo excluido se muestra con su motivo y su salida.
3. La decisión es humana y queda registrada; el sistema ordena y explica.
4. Mostrar el estado con texto, no solo con color; el rojo no distingue una regla de negocio de una falla técnica.
5. La interfaz no promete lo que la API todavía no hace.

## Accessibility & Inclusion

- Contraste mínimo AA en texto y controles; estados nunca dependen solo del color.
- Navegación completa por teclado, foco visible y objetivos táctiles de al menos 44 px en móvil.
- Números tabulares y formato de moneda/fecha explícito para lectura en pantalla.
