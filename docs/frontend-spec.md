# Spec de frontend — huecos D, E y 3.c

**Estado:** D.2, D.4a, E.4.b y E.5.b implementados; D.3/D.4b y el resto de Fase 2 pendientes.
**Fuente de los huecos:** `docs/pendientes.md`. Este documento **no repite** el detalle de backend: solo define el contrato de frontend, los estados y las dependencias. Cada sección referencia su ID de `pendientes.md`.
**Alcance:** D.1–D.4, E.1.b–E.5.b y 3.c. Quedan fuera A, B, C, F y el CLI del modo lote, salvo la parte que el front consume.

---

## 1. Baseline actual del front

- Rutas: `/login`, `/signup`, `/proyectos`, `/proyectos/$id`, `/proveedores`, `/users`.
- Detalle de proyecto: alta de proveedor, carga de un documento, propuestas con monto, recargos, notas, estatus, chat RAG y conocimiento vectorizado.
- Sistema visual: `SystemShell`, `PageHead`, `Panel`, `Badge`, tokens oscuro/claro, Archivo autoalojada, responsive mobile-first.
- Contrato actual relevante (`packages/contracts/src/schemas/evaluador.ts`):
  - `Proyecto`: `id`, `nombre`, `descripcion`, `createdAt`.
  - `Proveedor`: `id`, `nombre`, `contacto`, `createdAt`.
  - `Propuesta`: `id`, `proyectoId`, `proveedorId`, `monto`, `createdAt`.
  - `Recargo`: `id`, `propuestaId`, `concepto`, `monto`, `createdAt`.
  - `Nota`, `Estatus` (código entero), `Documento` (PDF/PNG/JPG), `Conocimiento`, `Chat`.
- No existen endpoints ni tipos de: evaluación, ranking, informe, moneda/tasa, mercado, roles expuestos, catálogo de etapas, exportación ni modo lote.

## 2. Reglas de front

1. **Nada falso:** si la API no tiene el dato, la UI muestra `No disponible` o `Requiere backend`; no inventa montos, tasas ni estados.
2. **Contrato primero:** todo dato nuevo entra por `@repo/contracts`; no se escriben DTOs a mano.
3. **Permisos desde el inicio:** un hook `usePermisos()` decide qué se muestra; ocultar no es autorizar, el API debe validar.
4. **Estados con texto:** cada estado lleva etiqueta, no solo color; los códigos numéricos se muestran como códigos hasta que exista catálogo.
5. **Español de Venezuela**, moneda y fecha explícitas, modo oscuro por defecto, responsive 390/1440, impresión limpia.
6. **Sin duplicar `pendientes.md`:** las razones, reglas de negocio y tareas de backend se citan por ID; aquí solo va lo que el front necesita.

## 3. Mapa de módulos

| ID    | Resultado de front                                                  | Dependencia                                | ¿Se puede construir ya? | Fase |
| ----- | ------------------------------------------------------------------- | ------------------------------------------ | ----------------------- | ---- |
| D.1   | Proyecto con documento base, ubicación y presupuesto referencial    | Contrato + migración                       | No                      | 2    |
| D.2   | Carga masiva 3–20 archivos con cola, propuesta por archivo y estado | Solo front + `propuestas.create` existente | Sí, **implementado**    | 1    |
| D.3   | Botón Evaluar + traza en vivo                                       | Endpoint de evaluación/run                 | No                      | 2    |
| D.4a  | Informe preliminar, USD + tasa BCV, impresión y CSV                 | Solo front + tasa API                      | Sí, **implementado**    | 1    |
| D.4b  | Informe de evaluación con ranking y fuentes                         | D.3 + 3.c                                  | No                      | 2    |
| E.1.b | Pipeline de etapas nombradas                                        | Catálogo/contrato de estados               | No                      | 2    |
| E.2.b | UI por rol/permiso                                                  | API expone rol/permisos + middleware       | Parcial                 | 2    |
| E.2.c | Decisión final con confirmación e historial                         | Endpoint + permiso                         | No                      | 2    |
| E.3.b | Ficha de proveedor con RIF y ubicación                              | Contrato + migración                       | No                      | 2    |
| E.3.c | Alertas de antecedentes                                             | Regla de backend                           | No                      | 2    |
| E.4.a | Moneda y tasa BCV normalizada                                       | Contrato + endpoint de tasa                | No                      | 2    |
| E.4.b | Desglose de costo conocido                                          | Solo front                                 | Sí, **implementado**    | 1    |
| E.5.b | Exportación imprimible y CSV                                        | Solo front                                 | Sí, **implementado**    | 1    |
| 3.c   | Consumo del motor de decisión y ranking                             | Motor + endpoint                           | No                      | 2    |

---

## 4. Detalle por módulo

### D.1 — Proyecto base

- **Front:** en `/proyectos/$id`, una tarjeta `Documento base` y un bloque `Datos del proyecto` con ubicación y presupuesto referencial.
- **Estados:** sin documento base (`No configurado`), cargando, cargado (nombre, tamaño, fecha), error de carga.
- **Dependencia:** `Proyecto` necesita `ubicacion`, `presupuestoReferencia` y un tipo de documento base; `documentoUploadInput` necesita una marca `tipo: 'base' | 'propuesta'`.
- **Decisión:** ¿el documento base se sube como documento normal marcado o como entidad aparte? Hasta definir, el bloque queda deshabilitado con `Requiere backend`.

### D.2 — Carga masiva (implementado)

- **Front:** input `multiple` en `DocumentosPanel`, cola local con 3–20 filas y estado por archivo.
- **Un archivo = una propuesta:** por fila se elige `Nueva propuesta` (con proveedor y monto opcional) o una propuesta existente. Si se elige proveedor, el front llama `propuestas.create` y luego `documentos.upload` con `propuestaId`; si no, sube como conocimiento. Esto resuelve el bloqueo de la revisión: antes no existía ninguna creación de propuesta en la UI.
- **Estados:** `En cola`, `Subiendo`, `Procesando`, `Listo`, `Error`, `Duplicado`.
- **Límites:** 15 MB por archivo, máximo 20, mime PDF/PNG/JPG; se valida antes de leer el archivo. Secuencial a propósito por el límite de 30 escrituras/minuto (2 por archivo con propuesta); los fallos se reintentan.
- **Duplicados:** nombre + tamaño contra documentos existentes y contra el lote; no es hash de contenido.
- **Fallo de lectura:** si la extracción falla, el API no persiste documento, monto ni recargos; la fila queda en error y se puede reintentar. La propuesta creada antes de la subida puede quedar sin documento; el front la muestra y permite reintentar.
- **Navegación:** aviso `beforeunload` mientras hay una subida en curso.
- **Aceptación:** 2 PDFs reales entran, muestran 24 KB y estado; un archivo inválido se rechaza sin entrar a la cola; una fila con proveedor crea la propuesta antes de procesar el documento.

### D.3 — Evaluar con trazabilidad

- **Front:** CTA `Evaluar propuestas` en el detalle; ruta `/proyectos/$id/evaluacion`; línea de tiempo de pasos (documentos leídos, recargos, aritmética, mercado, ranking) con estado y duración; botón deshabilitado mientras corre.
- **Estados:** sin documentos, listo para evaluar, ejecutando, completado, error, cancelado.
- **Dependencia:** endpoint que cree una corrida y devuelva pasos; sin él, la ruta muestra `Requiere backend` y no simula resultados.
- **Aceptación (cuando exista):** una corrida produce una traza consultable y un resultado que D.4b puede imprimir.

### D.4a — Informe preliminar (front-only)

- **Front:** ruta `/proyectos/$id/informe`; tabla de propuestas con proveedor, monto declarado, recargos conocidos, total conocido, estado, notas; encabezado con proyecto, fecha y aviso `Informe preliminar: sin evaluación automática`.
- **Reusa:** propuestas, recargos, notas, estatus y proveedores actuales.
- **Estados:** sin propuestas, con propuestas sin monto, listo para imprimir.
- **Aceptación:** imprime en A4 sin navegación; cada cifra se puede rastrear a una propuesta; no afirma ranking ni adjudicación.
- **No incluye:** mercado, tasa, errores aritméticos ni recomendación (D.4b).

### D.4b — Informe de evaluación

- **Front:** secciones fijas: identificación, cumplimiento, aritmética y cargos, costo total, recomendación/descarte, fuentes; tabla comparativa ordenada; sello `Borrador para firma`.
- **Dependencia:** D.3 + 3.c + fuentes de mercado; sin esos datos el informe no se genera.
- **Aceptación:** cada descarte cita una regla y un valor; cada número tiene fuente y fecha.

### E.1.b — Etapas nombradas

- **Front:** pipeline horizontal en el detalle (Recepción → Evaluación → Revisión → Decisión → Cierre) y badge de etapa en cada propuesta.
- **Dependencia:** catálogo de códigos y transiciones válidas; el `estatus.estado` actual es un entero libre.
- **Decisión:** códigos exactos, etiquetas y si una propuesta puede saltar etapas.
- **Hasta definir:** mostrar `Código N` y no inventar una etapa.

### E.2.b — Roles y permisos

- **Front:** `usePermisos()` con `puede('propuesta.aprobar')`; ocultar o deshabilitar acciones; vista de solo lectura para quien no tiene permiso; administración de roles en una ruta futura.
- **Dependencia:** la sesión debe exponer rol y permisos; el API debe validar cada procedimiento, no solo el front.
- **Aceptación:** un usuario sin `propuesta.aprobar` no ve el botón y el API también lo rechaza.
- **Decisión:** mapeo exacto rol→permiso (hoy hay 4 roles y 16 permisos sembrados) y quién puede asignar roles.

### E.2.c — Decisión final

- **Front:** acciones `Aprobar recomendación` / `Rechazar` con motivo obligatorio, confirmación, autor y fecha; historial visible.
- **Dependencia:** endpoint + permiso `propuesta.aprobar`/`propuesta.rechazar`.
- **Aceptación:** la decisión queda en el historial y no se puede borrar sin auditoría.

### E.3.b — Ficha de proveedor

- **Front:** campos RIF y ubicación en el alta/edición; visualización en la lista y en el historial.
- **Dependencia:** contrato + migración; validación de RIF venezolano.
- **Aceptación:** proveedor sin RIF se muestra `Sin RIF`; el formulario valida formato antes de enviar.

### E.3.c — Alertas de antecedentes

- **Front:** aviso en la ficha del proveedor y al cargar una propuesta: `Este proveedor ya fue descartado por …`.
- **Dependencia:** regla de backend sobre el historial; el front solo pinta el resultado.
- **Aceptación:** la alerta cita proyecto, fecha y motivo; no bloquea por sí sola.

### E.4.a — Moneda y tasa BCV

- **Front:** selector de moneda por propuesta/documento, tarjeta de tasa con fuente/fecha y totales normalizados; aviso `no verificada` cuando falte la tasa.
- **Dependencia:** `moneda` en propuesta/recargos, endpoint de tasa y regla de conversión.
- **Decisión:** BCV solamente o también tasa declarada por el proveedor.
- **Aceptación:** dos propuestas en monedas distintas se comparan en una sola moneda con la tasa y fecha visibles.

### E.4.b — Desglose de costo conocido (front-only)

- **Front:** bloque `Costo conocido` por propuesta: monto declarado + recargos = total conocido; etiqueta `Sin impuestos ni flete desglosados` cuando falten.
- **Reusa:** `propuesta.monto` y `recargos`.
- **Aceptación:** la suma es correcta, el total no se presenta como costo real completo y cada recargo muestra su concepto.

### E.5.b — Exportación

- **Front:** botón `Imprimir` y `Descargar CSV` en el informe; CSV con una fila por propuesta y columnas de proyecto, proveedor, monto, recargos, total conocido, estado y notas.
- **Reusa:** datos actuales; sin endpoint nuevo.
- **Aceptación:** el CSV abre en hoja de cálculo con acentos y coma decimal; la impresión oculta navegación y acciones.
- **Decisión:** PDF por impresión del navegador o generación en servidor (fuera del alcance front-only).

### 3.c — Motor de decisión (consumo)

- **Front:** una sola vista de resultado para D.3/D.4b; formas de `EvaluacionResultado` con `ranking[]`, `descartadas[]`, `fuentes[]` y `pasos[]`.
- **Dependencia:** motor y endpoint; el front no replica reglas.
- **Aceptación:** el mismo resultado alimenta la UI y el `salida.json` del modo lote; no hay dos implementaciones.
- **Decisión:** ¿una corrida por proyecto o versiones? ¿quién puede ejecutarla?

---

## 5. Contrato de front propuesto (no existe aún)

Solo se listan los campos que la UI necesita; nombres definitivos sujetos a revisión de backend.

```ts
type EvaluacionPaso = {
  id: string;
  nombre: string;
  estado: 'pendiente' | 'en_curso' | 'listo' | 'error';
  inicio?: string;
  fin?: string;
  detalle?: string;
};

type EvaluacionResultado = {
  id: string;
  proyectoId: string;
  estado: 'en_curso' | 'completada' | 'error';
  pasos: EvaluacionPaso[];
  ranking: Array<{
    propuestaId: string;
    posicion: number;
    costoTotal: string;
    moneda: string;
    motivo?: string;
  }>;
  descartadas: Array<{
    propuestaId: string;
    regla: string;
    detalle: string;
  }>;
  fuentes: Array<{ titulo: string; url: string; consultadoEn: string }>;
};
```

## 6. Fases de construcción

**Fase 1 — front-only, sin tocar API ni contrato**

- D.2 carga masiva.
- D.4a informe preliminar.
- E.4.b desglose de costo conocido.
- E.5.b imprimir + CSV.
- Mejora de visualización de estatus actual (sin inventar catálogo).

**Fase 2 — requiere contrato/API**

- D.1, D.3, D.4b, E.1.b, E.2.b, E.2.c, E.3.b, E.3.c, E.4.a y 3.c.

**Fase 3 — fuera del front**

- Mercado (C.1), OCR/XLSX (A.2/A.4), TLS/cifrado (F), CLI del modo lote (3.a/3.b).

**Recomendación:** construir Fase 1 ahora con Impeccable; abrir Fase 2 solo después de cerrar las decisiones de la sección 7.

## 7. Decisiones abiertas

1. ¿Construimos solo Fase 1 o también Fase 2 con datos de demostración claramente marcados?
2. Catálogo de etapas: códigos, etiquetas y transiciones.
3. Roles: mapeo definitivo rol→permiso y quién aprueba/rechaza.
4. **Resuelto:** montos base en USD; la tasa BCV se consulta en `GET /tasa/bcv`; la conversión a Bs es referencial y se redondea a centavos. La tasa declarada por el proveedor queda fuera de esta fase.
5. **Resuelto:** CSV con `;`, BOM UTF-8, CRLF, coma decimal y comillas; PDF por impresión del navegador. Columnas: tipo, proyecto, proveedor, monto USD, recargos USD, total conocido USD, tasa, total VES, estado, notas y detalle de recargos.
6. Evaluación: una corrida por proyecto o versiones; quién puede ejecutarla.
7. ¿Se permite demo con datos ficticios para D.3/D.4b/3.c mientras no exista backend?
8. ¿El modo lote tiene UI (carpeta/`salida.json` previsualizado) o queda solo como CLI?

## 8. Criterios de aceptación de Fase 1

- Carga masiva de 3–20 archivos con estado por archivo y reintento.
- Informe preliminar imprimible con montos, recargos, estado y notas.
- Desglose de costo conocido sin presentarlo como costo total real.
- CSV descargable y legible en hoja de cálculo.
- Cero datos inventados; los huecos muestran `Requiere backend`.
- `pnpm check` verde, detector Impeccable sin hallazgos, 390 y 1440 revisados.

## 9. Guion de demo de Fase 1

1. Iniciar sesión y abrir un proyecto.
2. Cargar 6 propuestas en un solo gesto; mostrar la cola y los estados.
3. Abrir el informe preliminar y señalar la diferencia entre monto declarado, recargos y total conocido.
4. Imprimir el informe y descargar el CSV.
5. Cerrar con la frase: “esto es lo que el front puede sostener hoy; el ranking y el dictamen llegan con el motor de decisión”.

## 9.b Hallazgos de la revisión aplicados a D.2

La revisión de los cuatro Goldfish confirmó cuatro bloqueos sobre el borrador y se corrigieron en la implementación:

1. **No existía creación de propuesta en el front.** Se añadió por fila: proveedor + monto opcional → `propuestas.create` → `documentos.upload` con `propuestaId`. Un archivo sin proveedor queda como conocimiento.
2. **El fallo de extracción no guarda el documento.** El API ejecuta la lectura y la extracción de montos antes de la transacción; si falla, no hay documento ni montos. La fila queda en `Error` y se reintenta; la propuesta creada antes de la subida puede quedar sin documento.
3. **El límite de escrituras es real.** 20 archivos con propuesta son 40 escrituras frente a 30/minuto; la cola es secuencial y muestra el error del servidor para reintentar. La demo usa 6 archivos.
4. **El límite es 15 MB**, no un valor inventado; coincide con `DOCUMENT_MAX_BYTES` y el máximo de base64 del contrato.

También se corrigieron: el panel de documentos pasa a la columna ancha como acción primaria, la cola tiene contrato de 390 px, el `Monto` y el proveedor se eligen por archivo, se evita reutilizar una propuesta existente en dos filas, se añadió aviso de salida y se retiró del pie la afirmación de cifrado en reposo y tasa BCV, que aún no existen.

## 9.c Hallazgos abiertos (resto de Fase 1)

- D.4a no puede imprimir una moneda que el contrato no tiene; debe mostrar `moneda no registrada` o esperar E.4.a.
- El CSV necesita delimiter `;`, BOM, comillas y coma decimal; la decisión sigue abierta.
- El estatus es un log de enteros sin autor ni estado actual; el informe debe definir “último estatus” y mostrar `Código N`.
- Los roles no están expuestos en la sesión; `usePermisos` no puede aplicarse todavía.
- La extracción real depende de `OPENROUTER_API_KEY`; sin ella, las propuestas con documento quedan en error y la demo debe apoyarse en datos sembrados o en el modo conocimiento.

## 9.d Estado del informe preliminar (implementado)

- Ruta `/proyectos/$id/informe`, enlazada desde el detalle con `Ver informe`.
- Montos base y recargos en USD; tasa BCV desde `GET /tasa/bcv`; total VES referencial.
- Tabla por propuesta con monto, recargos, total conocido, total VES, último estatus y notas.
- Totales, recargos declarados y notas de revisión en secciones separadas.
- Impresión A4 y CSV con `;`, BOM, CRLF, coma decimal y escape de fórmulas.
- No incluye ranking, evaluación automática ni fuentes de mercado; eso queda para D.3/D.4b/3.c.

## 10. Trazabilidad con `pendientes.md`

| Spec      | Referencia            |
| --------- | --------------------- |
| D.1       | `pendientes.md` D.1   |
| D.2       | `pendientes.md` D.2   |
| D.3       | `pendientes.md` D.3   |
| D.4a/D.4b | `pendientes.md` D.4   |
| E.1.b     | `pendientes.md` E.1.b |
| E.2.b     | `pendientes.md` E.2.b |
| E.2.c     | `pendientes.md` E.2.c |
| E.3.b     | `pendientes.md` E.3.b |
| E.3.c     | `pendientes.md` E.3.c |
| E.4.a     | `pendientes.md` E.4.a |
| E.4.b     | `pendientes.md` E.4.b |
| E.5.b     | `pendientes.md` E.5.b |
| 3.c       | `pendientes.md` 3.c   |
