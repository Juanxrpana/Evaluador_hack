# Pendientes del reto — checklist contra el enunciado

> Fuente de verdad: `IA_RETO_GRUPAL_PROPUESTA_DE_SERVICIOS_enunciado_.pdf`
> (Hackatón Venezuela INNOVA 2026 — Reto grupal: Agente Evaluador de Propuestas de Servicios).
> Estado evaluado al commit `ce06d85` (2026-11-27).
> Regla de oro del enunciado (sección 3): si algo difiere, **manda la sección 3**.
> Calificación final = Plataforma (0–75) + 1,25 × Evaluación automática (0–20).

Leyenda: ✅ implementado · 🟡 parcial · ❌ falta.

## Resumen ejecutivo

| Sección | Qué exige                                                 | Puntos en juego        | Estado                            |
| ------- | --------------------------------------------------------- | ---------------------- | --------------------------------- |
| A       | Ingesta multimodal (PDF, escaneado, manuscrito, XLSX/PNG) | parte de Plataforma    | 🟡                                |
| B       | Letra pequeña, verificación aritmética, alcance           | parte de Plataforma    | 🟡                                |
| C       | Contraste de precios en internet                          | parte de Plataforma    | ❌                                |
| D       | UI: carga proyecto, carga masiva, botón Evaluar, informe  | parte de Plataforma    | 🟡                                |
| E       | Plataforma completa (estados, roles, monedas, reportes)   | **75 pts**             | 🟡                                |
| F       | Seguridad (TLS, cifrado en reposo)                        | parte de Plataforma    | 🟡 (cifrado en reposo ✅, TLS ❌) |
| 3       | Modo lote + `salida.json` + ranking                       | **25 pts** (1,25 × 20) | ❌                                |

Lo más urgente no es lo más visible: **el modo lote con `salida.json` no existe y vale 25 puntos**.
Todo lo demás alimenta la plataforma (75 pts).

## Ya está resuelto (no rehacer)

- Autenticación email/contraseña con Better Auth, sesiones en base de datos, web con cookies y móvil con bearer.
- Ingesta de PDF nativos (`unpdf`) e imágenes PNG/JPG (visión) con vectorización bge-m3 + pgvector por proyecto.
- **Extracción automática de monto base y recargos por propuesta** (`LlmMontosExtractor`) — la "letra pequeña" con monto fijo ya se captura y persiste.
- CRUD completo: proyectos, proveedores, propuestas, recargos (leídos), notas, estatus.
- Historial de costos por proveedor entre proyectos (montos, recargos totales, estado, resumen min/max/promedio).
- Chat RAG por proyecto (`/api/chat/ask`) con fuentes, acotado al conocimiento del proyecto.
- Auditoría durable (`audit_events`: quién, qué, cuándo) y logs estructurados con request/trace IDs.
- Migraciones reversibles + tests (28 pasando) y stack Compose/Podman reproducible.

## A. Ingesta documental multimodal

- [x] A.1 PDFs nativos digitales → `unpdf`, extracción local. ✅
- [ ] **A.2 Documentos escaneados con ruido (PDF de solo imágenes)** 🟡
      Hoy un PDF sin capa de texto cae en `ContenidoIlegibleError`. Falta OCR/visión de respaldo:
      renderizar páginas a imagen y mandarlas al modelo de visión (o integrar OCR).
      Criterio de aceptación: un PDF escaneado con sello y baja resolución produce texto e ítems.
      Dónde: `apps/api/src/modules/documentos/` (nuevo extractor junto a `pdf.extractor.ts`).
- [x] A.3 Presupuestos manuscritos fotografiados (JPG/PNG) → visión. ✅ (requiere clave OpenRouter operativa).
- [ ] **A.4 Hojas de cálculo XLSX** ❌
      `documentoUploadInput.mime` solo acepta `application/pdf`, `image/png`, `image/jpeg`.
      Falta: aceptar XLSX y parsear celdas (p. ej. `exceljs`), incluida la detección de tablas de costos.
      Criterio de aceptación: un presupuesto XLSX produce el mismo JSON de montos/ítems que un PDF.
      Dónde: `packages/contracts/src/schemas/evaluador.ts` (mime) + nuevo extractor en `documentos/`.

## B. Razonamiento agéntico y "letra pequeña" (costo total real)

- [x] B.1 Cláusulas y costos ocultos **con monto fijo** (flete, instalación, seguro) → `LlmMontosExtractor` + tabla `recargos`. ✅
- [ ] **B.2 Recargos porcentuales** 🟡
      El extractor exige `monto` numérico. "El envío especializado tiene un recargo del 50% sobre el
      valor de la factura" no se captura ni se calcula hoy. Falta: aceptar recargos en %
      (`monto: null, porcentaje: "50"`) y calcularlos sobre la base antes de comparar.
      Dónde: `extraccion-montos.port.ts`, `llm-montos.extractor.ts`, `recargo*` (migración nueva).
- [ ] **B.3 Verificación aritmética (tool calling explícito del enunciado)** ❌
      Validar en código (no en el LLM) que Cantidad × Precio Unitario y la suma de subtotales
      coincidan con el total declarado; la propuesta con error aritmético se descarta.
      Depende de extraer ítems (ver B.5).
- [ ] **B.4 Cumplimiento del alcance del proyecto** ❌
      Contrastar cada propuesta contra el documento base de requerimientos y descartar las
      incompletas. Falta: identificar el documento base (D.1) + paso de comparación de alcance.
- [ ] **B.5 Extracción de ítems (cantidad, precio unitario, moneda)** ❌
      `MontosExtraidos` hoy solo trae `montoTotal` + `recargos`. Sin ítems no hay verificación
      aritmética (B.3) ni contraste unitario de precios (C). Extender el JSON del extractor con
      `items: [{ nombre, cantidad, precioUnitario, moneda }]`.
      Dónde: `extraccion-montos.port.ts` + prompt de `llm-montos.extractor.ts`.
- [ ] **B.6 Defensa contra instrucciones ocultas (prompt injection)** ❌
      La sección 3 lista como descarte "instrucciones ocultas dirigidas al sistema de IA".
      Falta: tratar el texto de los documentos como datos (no instrucciones), detectar intentos
      de manipulación y reportarlos como causa de descarte.

## C. Investigación y contraste de precios en internet

- [ ] **C.1 Búsqueda web de precios de mercado** ❌
      Diseño listo e infra probada: SearXNG local con JSON (contenedor en el puerto 8888,
      config en `docker/searxng/settings.yml`) y tasa BCV vía `ve.dolarapi.com` (verificado).
      Falta: módulo `mercado` (puerto `WebSearchClient` + adaptador SearXNG), 1 búsqueda por
      insumo con caché, extracción del precio referencial con el LLM y desviación % con fuentes.
      Reglas: consultas armadas solo con especificaciones de insumos (nunca texto del proveedor),
      auditoría de cada búsqueda (`web.search`) y tope de tiempo (el desempate es por tiempo).
- [ ] **C.2 Conexión con el informe** ❌
      El dictamen debe citar las fuentes ("sobreprecio del 120% frente al promedio investigado").
      Falta: devolver `fuentes[]` al motor de evaluación y pintarlas en el informe (D.4).

## D. UI e informe de factibilidad financiera

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
- [ ] **E.1.b Estados del proceso con etapas nombradas** 🟡
      `estatus` existe y tiene CRUD + UI, pero `estado` es un entero libre (0–32767) sin semántica.
      Falta: catálogo fijo de etapas (Recepción → Evaluación → Revisión del comité →
      Adjudicado/Cerrado), transiciones válidas y visualización del pipeline del proceso.

### E.2 Usuarios, roles y revisión humana

- [x] Notas por propuesta (revisión humana) + auditoría de quién hizo qué y cuándo. ✅
- [ ] **E.2.b Aplicación real de roles y permisos** ❌
      `rol`/`permiso`/`rol_permiso` están sembrados (4 roles, 16 permisos) pero el router solo usa
      `authenticated`: ningún endpoint valida permisos. Falta: middleware de permisos por
      procedimiento (p. ej. `propuesta.aprobar` para supervisor), asignación de rol al registrar
      y vistas diferenciadas (carga / revisión / aprobación / solo lectura).
- [ ] **E.2.c Confirmación de la decisión final** ❌
      Falta el paso explícito donde un rol con permiso aprueba/rechaza la recomendación de la IA,
      quedando registrado en el historial (vinculado a estatus E.1.b).

### E.3 Directorio e historial de proveedores

- [x] Historial de participaciones y costos entre proyectos. ✅
- [ ] **E.3.b Ficha completa del proveedor** 🟡
      Falta identificación fiscal (RIF) y ubicación (campos nuevos + migración + UI).
- [ ] **E.3.c Alertas automáticas de antecedentes** ❌
      "Este proveedor ya fue descartado antes por error aritmético / sobrecosto". Falta: regla
      sobre el historial + aviso en la ficha y al recibir una propuesta nueva.

### E.4 Normalización financiera y monedas

- [ ] **E.4.a Moneda única (USD/Bs) con tasa oficial BCV** ❌
      Ningún monto tiene moneda. Falta: campo `moneda` en extracción/propuesta/recargos y tasa
      BCV del día (`ve.dolarapi.com/v1/dolares`, verificado hoy: 926,36 Bs/USD oficial) con caché
      diaria, para comparar todas las propuestas en la misma moneda.
- [ ] **E.4.b Desglose claro del costo real** 🟡
      El historial ya suma recargos; falta el desglose paso a paso por propuesta en el informe:
      monto declarado + flete/traslado + recargos + impuestos (IVA/exenciones) = costo total real.

### E.5 Reportes para comité y consulta interactiva

- [x] Consulta en lenguaje natural sobre el proyecto evaluado (chat RAG con fuentes). ✅
- [ ] **E.5.b Exportación a PDF y Excel/CSV** ❌
      Falta: informe ejecutivo descargable en PDF (imprimible) y tabla comparativa detallada en
      Excel/CSV.

## F. Seguridad de la información

- [ ] **F.1 Cifrado en tránsito (TLS 1.2/1.3)** 🟡
      El stack local es HTTP. Para la demo/despliegue: proxy con TLS (nginx/Caddy) delante de
      web+api, o exponer solo vía HTTPS. Documentar la topología (`TRUST_PROXY`).
- [x] **F.2 Cifrado en reposo (AES-256)** ✅
      `documento.contenido` se cifra con AES-256-GCM dentro del adaptador de escritura
      (`documento.crypto.ts`): la base solo ve ciphertext, `tamano_bytes` conserva el tamaño
      original y el algoritmo queda marcado en `documento.metadata.enc`. La clave vive en
      `DOCUMENTO_ENCRYPTION_KEY` (32 bytes base64, fail-fast al arrancar). Pendiente opcional:
      extender el cifrado a los chunks de `conocimiento` y al volumen del disco.
- [ ] **F.3 Confidencialidad hacia el buscador** (ligado a C.1) ❌
      Nunca enviar texto de propuestas a buscadores: solo especificaciones normalizadas de
      insumos. Debe quedar como regla explícita y test del módulo mercado.

## 3. Prueba de evaluación y calificación (¡manda sobre todo!) — 25 puntos

- [ ] **3.a Modo lote** ❌
      Un ejecutable (CLI/script) que reciba la carpeta `lote/` con `proyecto.pdf` +
      `propuestas/` (N conocido al recibir; formatos PDF/JPG/XLSX/PNG) y procese cada archivo.
- [ ] **3.b `salida.json` exacto** ❌
      Campos obligatorios: `reto` ("propuesta_servicios"), `repositorio`, `commit`
      (obtenido por el programa con `git rev-parse HEAD`), `inicio`/`fin` (ISO 8601 con zona),
      `procesados` (archivo + hora, uno por propuesta) y `ranking` (todas, por nombre de archivo
      sin extensión: primero las válidas de mejor a peor, al final las descartadas en cualquier
      orden). Sin repetidas (si no, vale 0); no omitir ninguna (se pierden sus puntos).
      Validar con `validador_salida.html` del material de práctica antes de entregar.
- [ ] **3.c Motor de decisión (reglas de descarte y orden)** ❌
      Descartes: alcance incompleto, incompatibilidad técnica, capacidad insuficiente,
      equipos obsoletos/calidad inferior, costos o condiciones abusivas, error aritmético,
      instrucciones ocultas. Válidas ordenadas por calidad técnica y cumplimiento global
      (rendimiento para el uso pedido, protección eléctrica, periféricos, garantía, soporte
      y costo total real); entre técnicamente equivalentes gana la de menor costo total real.
      Este motor lo consume el modo lote Y el botón Evaluar de la UI: implementarlo una sola vez.
- [ ] **3.d Optimización de tiempo** ❌
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
9. **F** — TLS de demo, cifrado en reposo, anti prompt-injection (F.3/B.6 van de la mano de C.1).

## Bloqueos operativos (no son código, pero frenan la demo)

- `OPENROUTER_API_KEY` pendiente: bloquea chat, descripción de imágenes, y **también la
  extracción de montos/recargos** (`LlmMontosExtractor`). Sustituir el marcador en
  `apps/api/.env` y reiniciar `pnpm dev`.
- Descarga inicial del modelo bge-m3 (primer uso de documentos/chat) a `apps/api/.models`.
- SearXNG local: commitear `docker/searxng/settings.yml` y agregarlo como servicio en
  `compose.yaml` para que la demo sea reproducible.
- El campo `repositorio` del `salida.json` debe apuntar al repo oficial del hackatón (GitLab),
  no al espejo de GitHub.
