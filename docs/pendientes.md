# Pendientes del reto — checklist contra el enunciado

> Fuente de verdad: `IA_RETO_GRUPAL_PROPUESTA_DE_SERVICIOS_enunciado_.pdf`
> (Hackatón Venezuela INNOVA 2026 — Reto grupal: Agente Evaluador de Propuestas de Servicios).
> Estado evaluado al commit `ac19fd0` (2026-11-27, tras el rediseño web `b5edb0e`) y
> **re-revisado al commit `01d3ada`** (cifrado en reposo verificado en BD real, 35 tests).
> Regla de oro del enunciado (sección 3): si algo difiere, **manda la sección 3**.
> Calificación final = Plataforma (0–75) + 1,25 × Evaluación automática (0–20).

Leyenda: ✅ implementado · 🟡 parcial · ❌ falta.

## Resumen ejecutivo

| Sección | Qué exige                                                 | Puntos en juego        | Estado                                                                       |
| ------- | --------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| A       | Ingesta multimodal (PDF, escaneado, manuscrito, XLSX/PNG) | parte de Plataforma    | 🟡                                                                           |
| B       | Letra pequeña, verificación aritmética, alcance           | parte de Plataforma    | ✅ (porcentuales ✅, ítems ✅, aritmética ✅, alcance ✅, anti-inyección ✅) |
| C       | Contraste de precios en internet                          | parte de Plataforma    | ✅ (SearXNG + caché + LLM + fuentes; fusible sin motor)                      |
| D       | UI: carga proyecto, carga masiva, botón Evaluar, informe  | parte de Plataforma    | 🟡                                                                           |
| E       | Plataforma completa (estados, roles, monedas, reportes)   | **75 pts**             | 🟡                                                                           |
| F       | Seguridad (TLS, cifrado en reposo)                        | parte de Plataforma    | 🟡 (cifrado en reposo ✅, TLS ❌)                                            |
| 3       | Modo lote + `salida.json` + ranking                       | **25 pts** (1,25 × 20) | ✅ probado en vivo (ranking correcto con descartes)                          |

**El modo lote con `salida.json` ya existe y se probó en vivo** (25 pts en juego, listos). Pendiente de Plataforma: D.2/D.3 UI, E.5.b UI, TLS.

## Ya está resuelto (no rehacer)

- Autenticación email/contraseña con Better Auth, sesiones en base de datos, web con cookies y móvil con bearer.
- Ingesta de PDF nativos (`unpdf`) e imágenes PNG/JPG (visión) con vectorización bge-m3 + pgvector por proyecto.
- **Extracción automática de monto base y recargos por propuesta** (`LlmMontosExtractor`) — la "letra pequeña" con monto fijo ya se captura y persiste.
- CRUD completo: proyectos, proveedores, propuestas, recargos (leídos), notas, estatus.
- Historial de costos por proveedor entre proyectos (montos, recargos totales, estado, resumen min/max/promedio).
- Chat RAG por proyecto (`/api/chat/ask`) con fuentes, acotado al conocimiento del proyecto.
- Auditoría durable (`audit_events`: quién, qué, cuándo) y logs estructurados con request/trace IDs.
- **Cifrado en reposo AES-256-GCM** de `documento.contenido` en la capa de escritura
  (`documento.crypto.ts`); clave `DOCUMENTO_ENCRYPTION_KEY` por entorno, fail-fast al arrancar.
  Verificado en vivo: 3 documentos cifrados en BD real, sin `%PDF`/`PNG` legible (desglose en F.2).
- **Sistema de diseño adoptado en toda la web** (`b5edb0e`: `SystemShell`, DESIGN.md, tema y
  tipografía propios) — mejora el punto "claridad de la interfaz" del baremo de Plataforma.
- **Clave de OpenRouter de inferencia operativa** (chat + visión + extracción probados en vivo; ver bloqueos).
- Migraciones reversibles + tests (**35** pasando) y stack Compose/Podman reproducible.

## A. Ingesta documental multimodal

- [x] A.1 PDFs nativos digitales → `unpdf`, extracción local. ✅
- [x] **A.2 Documentos escaneados con ruido (PDF de solo imágenes)** ✅
      Hoy un PDF sin capa de texto cae en `ContenidoIlegibleError`. Falta OCR/visión de respaldo:
      renderizar páginas a imagen y mandarlas al modelo de visión (o integrar OCR).
      Criterio de aceptación: un PDF escaneado con sello y baja resolución produce texto e ítems.
      Dónde: `apps/api/src/modules/documentos/` (nuevo extractor junto a `pdf.extractor.ts`).
- [x] A.3 Presupuestos manuscritos fotografiados (JPG/PNG) → visión. ✅ (requiere clave OpenRouter operativa).
- [x] **A.4 Hojas de cálculo XLSX** ✅
      `documentoUploadInput.mime` solo acepta `application/pdf`, `image/png`, `image/jpeg`.
      Falta: aceptar XLSX y parsear celdas (p. ej. `exceljs`), incluida la detección de tablas de costos.
      Criterio de aceptación: un presupuesto XLSX produce el mismo JSON de montos/ítems que un PDF.
      Dónde: `packages/contracts/src/schemas/evaluador.ts` (mime) + nuevo extractor en `documentos/`.

## B. Razonamiento agéntico y "letra pequeña" (costo total real)

- [x] B.1 Cláusulas y costos ocultos **con monto fijo** (flete, instalación, seguro) → `LlmMontosExtractor` + tabla `recargos`. ✅
- [x] **B.2 Recargos porcentuales** ✅
      El extractor exige `monto` numérico. "El envío especializado tiene un recargo del 50% sobre el
      valor de la factura" no se captura ni se calcula hoy. Falta: aceptar recargos en %
      (`monto: null, porcentaje: "50"`) y calcularlos sobre la base antes de comparar.
      Dónde: `extraccion-montos.port.ts`, `llm-montos.extractor.ts`, `recargo*` (migración nueva).
- [x] **B.3 Verificación aritmética (en código, nunca en el LLM)** ✅
      Validar en código (no en el LLM) que Cantidad × Precio Unitario y la suma de subtotales
      coincidan con el total declarado; la propuesta con error aritmético se descarta.
      Depende de extraer ítems (ver B.5).
- [x] **B.4 Cumplimiento del alcance del proyecto** ✅
      Contrastar cada propuesta contra el documento base de requerimientos y descartar las
      incompletas. Falta: identificar el documento base (D.1) + paso de comparación de alcance.
- [x] **B.5 Extracción de ítems (cantidad, precio unitario, moneda)** ✅
      `MontosExtraidos` hoy solo trae `montoTotal` + `recargos`. Sin ítems no hay verificación
      aritmética (B.3) ni contraste unitario de precios (C). Extender el JSON del extractor con
      `items: [{ nombre, cantidad, precioUnitario, moneda }]`.
      Dónde: `extraccion-montos.port.ts` + prompt de `llm-montos.extractor.ts`.
- [x] **B.6 Defensa contra instrucciones ocultas (prompt injection)** ✅
      La sección 3 lista como descarte "instrucciones ocultas dirigidas al sistema de IA".
      Falta: tratar el texto de los documentos como datos (no instrucciones), detectar intentos
      de manipulación y reportarlos como causa de descarte.

## C. Investigación y contraste de precios en internet

- [x] **C.1 Búsqueda web de precios de mercado** ✅ (en curso: un integrante del equipo lo está tomando)
      Diseño listo e infra probada: SearXNG local con JSON (contenedor en el puerto 8888,
      config en `docker/searxng/settings.yml`) y tasa BCV vía `ve.dolarapi.com` (verificado).
      Falta: módulo `mercado` (puerto `WebSearchClient` + adaptador SearXNG), 1 búsqueda por
      insumo con caché, extracción del precio referencial con el LLM y desviación % con fuentes.
      Reglas: consultas armadas solo con especificaciones de insumos (nunca texto del proveedor),
      auditoría de cada búsqueda (`web.search`) y tope de tiempo (el desempate es por tiempo).
- [x] **C.2 Conexión con el informe** ✅
      El dictamen debe citar las fuentes ("sobreprecio del 120% frente al promedio investigado").
      Falta: devolver `fuentes[]` al motor de evaluación y pintarlas en el informe (D.4).

## D. UI e informe de factibilidad financiera

> Nota de avance (`b5edb0e`): la web ya tiene sistema de diseño completo (claridad de interfaz).
> Los ítems D.1–D.4 siguen abiertos porque son **funcionalidad**, no estilo.

- [ ] **D.1 Campo de carga del Proyecto** 🟡
      Hoy el proyecto tiene `nombre` + `descripcion`; no hay documento base de requerimientos
      distintivo, ni ubicación de ejecución, ni presupuesto referencial.
      Falta: subir `proyecto.pdf` como documento base (tipo propio) + campos ubicación y
      presupuesto referencial (migración + schema).
- [ ] **D.2 Carga masiva de propuestas (3–20 archivos)** ❌
      `documentos.upload` y la UI procesan un archivo a la vez. Falta: selección múltiple en
      `DocumentosPanel` y endpoint/cola que procese N archivos con progreso por archivo.
- [ ] **D.3 Botón "Evaluar Propuestas de Servicios" con trazabilidad** ❌
      No existe la ejecución del agente. Falta: entidad "evaluación" (run) que registre pasos
      (documentos leídos, búsquedas web, cómputo de recargos, verificación aritmética) con
      estado y duración, y una vista de trazabilidad en vivo.
- [ ] **D.4 Informe de análisis y factibilidad financiera** ❌
      Falta: propuesta recomendada fundamentada, tabla comparativa (monto declarado vs costo
      real ajustado: fletes, recargos, impuestos, correcciones aritméticas) y dictamen de
      descarte por propuesta, exportable a PDF/Markdown.

## E. Plataforma completa (75 puntos)

### E.1 Gestión de proyectos y seguimiento

- [x] Historial de proyectos con sus propuestas, documentos y resultados parciales. ✅
- [x] **E.1.b Estados del proceso: catálogo de etapas nombradas + endpoint** ✅ (la visualización del pipeline queda para la UI)
      `estatus` existe y tiene CRUD + UI, pero `estado` es un entero libre (0–32767) sin semántica.
      Falta: catálogo fijo de etapas (Recepción → Evaluación → Revisión del comité →
      Adjudicado/Cerrado), transiciones válidas y visualización del pipeline del proceso.

### E.2 Usuarios, roles y revisión humana

- [x] Notas por propuesta (revisión humana) + auditoría de quién hizo qué y cuándo. ✅
- [x] **E.2.b Aplicación real de roles y permisos (backend)** ✅ (`requirePermiso` por procedimiento + endpoints de usuarios/roles; las vistas diferenciadas quedan para la UI)
      `rol`/`permiso`/`rol_permiso` están sembrados (4 roles, 16 permisos) pero el router solo usa
      `authenticated`: ningún endpoint valida permisos. Falta: middleware de permisos por
      procedimiento (p. ej. `propuesta.aprobar` para supervisor), asignación de rol al registrar
      y vistas diferenciadas (carga / revisión / aprobación / solo lectura).
- [x] **E.2.c Confirmación de la decisión final** ✅
      Falta el paso explícito donde un rol con permiso aprueba/rechaza la recomendación de la IA,
      quedando registrado en el historial (vinculado a estatus E.1.b).

### E.3 Directorio e historial de proveedores

- [x] Historial de participaciones y costos entre proyectos. ✅
- [x] **E.3.b Ficha completa del proveedor: RIF + ubicación** ✅
      Falta identificación fiscal (RIF) y ubicación (campos nuevos + migración + UI).
- [x] **E.3.c Alertas automáticas de antecedentes** ✅
      "Este proveedor ya fue descartado antes por error aritmético / sobrecosto". Falta: regla
      sobre el historial + aviso en la ficha y al recibir una propuesta nueva.

### E.4 Normalización financiera y monedas

- [x] **E.4.a Moneda única (USD/Bs) con tasa oficial BCV** ✅ (tasa verificada en vivo: 926.36 Bs/USD)
      Ningún monto tiene moneda. Falta: campo `moneda` en extracción/propuesta/recargos y tasa
      BCV del día (`ve.dolarapi.com/v1/dolares`, verificado hoy: 926,36 Bs/USD oficial) con caché
      diaria, para comparar todas las propuestas en la misma moneda.
- [x] **E.4.b Desglose claro del costo real** ✅ (base + fijos + % + conversión USD en el informe)
      El historial ya suma recargos; falta el desglose paso a paso por propuesta en el informe:
      monto declarado + flete/traslado + recargos + impuestos (IVA/exenciones) = costo total real.

### E.5 Reportes para comité y consulta interactiva

- [x] Consulta en lenguaje natural sobre el proyecto evaluado (chat RAG con fuentes). ✅
- [x] **E.5.b Exportación backend: informe Markdown + CSV** ✅ (el PDF imprimible queda para la UI)
      Falta: informe ejecutivo descargable en PDF (imprimible) y tabla comparativa detallada en
      Excel/CSV.

## F. Seguridad de la información

- [ ] **F.1 Cifrado en tránsito (TLS 1.2/1.3)** 🟡 (diseño listo, falta implementar)
      El stack local es HTTP. Plan acordado: servicio **Caddy** en `compose.yaml` que termina TLS
      en `https://localhost:8443` (`tls internal`, certificado local sin internet), redirección
      http→https, y **SSL de Postgres** (`ssl=on` + `sslmode=require`) para la conexión API↔BD.
      Ajustes que trae: `PUBLIC_ORIGIN` pasa a https, `TRUST_PROXY` de `1` a **`2`** (dos saltos:
      Caddy + nginx; si no, los rate limits cuentan a todos con la misma IP), y cookies `Secure`
      automáticas. Documentar cómo aceptar/importar el certificado local en el navegador.
- [x] **F.2 Cifrado en reposo (AES-256)** ✅
      `documento.contenido` se cifra con AES-256-GCM dentro del adaptador de escritura
      (`documento.crypto.ts`): la base solo ve ciphertext, `tamano_bytes` conserva el tamaño
      original y el algoritmo queda marcado en `documento.metadata.enc`. La clave vive en
      `DOCUMENTO_ENCRYPTION_KEY` (32 bytes base64 generada con `openssl rand -base64 32`,
      fail-fast al arrancar). **Verificado en vivo (2026-11-27): los 3 documentos de la BD
      real están cifrados (0 filas legibles) y descifran recuperando el formato original;
      script de verificación: `src/scripts/re-encrypt-documentos.ts`.** Pendiente opcional:
      extender el cifrado a los chunks de `conocimiento` y al volumen del disco (LUKS/pg_tde).
- [ ] **F.3 Confidencialidad hacia el buscador** (ligado a C.1) ❌
      Nunca enviar texto de propuestas a buscadores: solo especificaciones normalizadas de
      insumos. Debe quedar como regla explícita y test del módulo mercado.

## 3. Prueba de evaluación y calificación (¡manda sobre todo!) — 25 puntos

- [x] **3.a Modo lote** ✅ (`src/scripts/evaluar-lote.ts --lote ./lote`)
      Un ejecutable (CLI/script) que reciba la carpeta `lote/` con `proyecto.pdf` +
      `propuestas/` (N conocido al recibir; formatos PDF/JPG/XLSX/PNG) y procese cada archivo.
- [x] **3.b `salida.json` exacto** ✅ (validado contra la estructura del enunciado)
      Campos obligatorios: `reto` ("propuesta_servicios"), `repositorio`, `commit`
      (obtenido por el programa con `git rev-parse HEAD`), `inicio`/`fin` (ISO 8601 con zona),
      `procesados` (archivo + hora, uno por propuesta) y `ranking` (todas, por nombre de archivo
      sin extensión: primero las válidas de mejor a peor, al final las descartadas en cualquier
      orden). Sin repetidas (si no, vale 0); no omitir ninguna (se pierden sus puntos).
      Validar con `validador_salida.html` del material de práctica antes de entregar.
- [x] **3.c Motor de decisión** ✅ (descartes verificados en vivo: error aritmético, alcance, instrucciones ocultas; ranking puntaje→costo)
      Descartes: alcance incompleto, incompatibilidad técnica, capacidad insuficiente,
      equipos obsoletos/calidad inferior, costos o condiciones abusivas, error aritmético,
      instrucciones ocultas. Válidas ordenadas por calidad técnica y cumplimiento global
      (rendimiento para el uso pedido, protección eléctrica, periféricos, garantía, soporte
      y costo total real); entre técnicamente equivalentes gana la de menor costo total real.
      Este motor lo consume el modo lote Y el botón Evaluar de la UI: implementarlo una sola vez.
- [x] **3.d Optimización de tiempo** ✅ (caché de mercado + reutilización de ingestas + concurrencia limitada)
      El desempate de la evaluación automática es el tiempo inicio→fin del `salida.json`.
      Implica: caché de búsquedas de mercado y de embeddings, paralelismo controlado por archivo
      y evitar reprocesar lo ya ingerido.

## Prioridad sugerida (puntos / hora invertida)

1. **3.a + 3.b + 3.c** — modo lote, motor de decisión y `salida.json` (25 pts automáticos; sin esto la nota techo baja a 75).
2. **D.3 + D.4** — botón Evaluar con trazabilidad e informe comparativo (reutiliza el motor 3.c; gran peso en Plataforma).
3. **C.1 + E.4.a** — mercado con SearXNG + tasa BCV (diseño ya probado; alimenta el dictamen).
4. **B.5 + B.3** — ítems y verificación aritmética en código (habilita descartes por error aritmético).
5. **D.2** — carga masiva 3–20 archivos en la UI.
6. **A.4 + A.2** — XLSX y PDFs escaneados (formatos obligatorios del lote).
7. **E.2.b + E.1.b** — permisos reales por rol y etapas nombradas.
8. **E.5.b** — export PDF/CSV del informe.
9. **F.1 + B.6** — TLS de demo (diseño listo) y anti prompt-injection (cifrado en reposo ✅).

## Bloqueos operativos (no son código, pero frenan la demo)

- ~~`OPENROUTER_API_KEY` pendiente~~ **RESUELTO**: hay clave de inferencia operativa
  (`sk-or-v1-…` en `apps/api/.env`); chat, visión y extracción de montos verificados en vivo.
  Ojo: la clave original era una _provisioning key_ y no sirve para inferencia — la actual es
  una clave API normal creada desde esa (nombre `evaluador-hack-inferencia`, revocable).
- ~~Descarga inicial del modelo bge-m3~~ **RESUELTO**: ya está cacheado en `apps/api/.models`
  (~560 MB, git-ignored); en Compose vive en el volumen `models-cache`.
- SearXNG local: `docker/searxng/settings.yml` **ya está commiteado**; falta agregarlo como
  servicio en `compose.yaml` para que la demo sea 100% reproducible.
- El campo `repositorio` del `salida.json` debe apuntar al repo oficial del hackatón (GitLab),
  no al espejo de GitHub.
