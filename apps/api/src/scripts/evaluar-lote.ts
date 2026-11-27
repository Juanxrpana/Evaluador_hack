/**
 * Batch evaluation mode (3.a) — the score-bearing deliverable.
 *
 * Usage (from apps/api):
 *   node --env-file-if-exists=.env src/scripts/evaluar-lote.ts --lote ./lote [--salida salida.json]
 *
 * The folder must contain the project base document (proyecto.pdf) plus the
 * proposal files (PDF/JPG/PNG/XLSX, optionally inside `propuestas/`). It
 * composes the same services the API uses, reuses the SAME evaluation engine
 * the button runs (3.c), writes the exact `salida.json` (3.b), times the run
 * (3.d) and skips already-ingested files.
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'kysely';
import { createDatabase } from '../db/client.ts';
import { createTransactionRunner } from '../db/transaction.ts';
import { env } from '../config/env.ts';
import { DocumentoService } from '../modules/documentos/documento.service.ts';
import { PostgresDocumentoReader } from '../modules/documentos/postgres-documento.reader.ts';
import { PostgresDocumentoWriter } from '../modules/documentos/postgres-documento.writer.ts';
import {
  PostgresConocimientoListReader,
  ConocimientoListService,
} from '../modules/documentos/postgres-conocimiento.list.ts';
import { ImagenDescriber } from '../modules/documentos/imagen.describer.ts';
import { PdfEscaneadoDescriber } from '../modules/documentos/pdf-escaneado.describer.ts';
import { PdfExtractor } from '../modules/documentos/pdf.extractor.ts';
import { XlsxExtractor } from '../modules/documentos/xlsx.extractor.ts';
import { LlmMontosExtractor } from '../modules/documentos/llm-montos.extractor.ts';
import { Aes256GcmDocumentoCrypto } from '../modules/documentos/documento.crypto.ts';
import { PostgresConocimientoWriter } from '../modules/documentos/postgres-conocimiento.writer.ts';
import { LocalBgeM3EmbeddingClient } from '../modules/ai/local-bge.embedding.client.ts';
import { OpenRouterLlmClient } from '../modules/ai/openrouter-llm.client.ts';
import { PostgresAuditWriter } from '../modules/audit/postgres-audit.writer.ts';
import { EvaluacionService } from '../modules/evaluaciones/evaluacion.service.ts';
import { PostgresEvaluacionReader } from '../modules/evaluaciones/postgres-evaluacion.reader.ts';
import { PostgresEvaluacionWriter } from '../modules/evaluaciones/postgres-evaluacion.writer.ts';
import { BcvTasaClient } from '../modules/mercado/bcv-tasa.client.ts';
import { MercadoConSearxng } from '../modules/mercado/mercado.service.ts';
import { SearxngClient } from '../modules/mercado/searxng.client.ts';
import { PostgresPropuestaItemReader } from '../modules/propuestas/propuesta-item.reader.ts';
import { PostgresPropuestaItemWriter } from '../modules/propuestas/postgres-propuesta-item.writer.ts';
import { PostgresPropuestaReader } from '../modules/propuestas/postgres-propuesta.reader.ts';
import { PostgresPropuestaWriter } from '../modules/propuestas/postgres-propuesta.writer.ts';
import { PropuestaService } from '../modules/propuestas/propuesta.service.ts';
import { PostgresProyectoReader } from '../modules/proyectos/postgres-proyecto.reader.ts';
import { PostgresProyectoWriter } from '../modules/proyectos/postgres-proyecto.writer.ts';
import { ProyectoService } from '../modules/proyectos/proyecto.service.ts';
import { PostgresProveedorReader } from '../modules/proveedores/postgres-proveedor.reader.ts';
import { PostgresProveedorWriter } from '../modules/proveedores/postgres-proveedor.writer.ts';
import { ProveedorService } from '../modules/proveedores/proveedor.service.ts';
import { PostgresRecargoReader } from '../modules/recargos/postgres-recargo.reader.ts';
import { PostgresRecargoWriter } from '../modules/recargos/postgres-recargo.writer.ts';
import { getRequestContext } from '../observability/request-context.ts';

function parseArgs(): { lote: string; salida: string } {
  const args = process.argv.slice(2);
  const indiceLote = args.indexOf('--lote');
  const indiceSalida = args.indexOf('--salida');

  if (indiceLote === -1 || !args[indiceLote + 1]) {
    console.error('Uso: evaluar-lote.ts --lote <carpeta> [--salida salida.json]');
    process.exit(2);
  }

  return {
    lote: path.resolve(args[indiceLote + 1]),
    salida: path.resolve(indiceSalida !== -1 ? args[indiceSalida + 1] : 'salida.json'),
  };
}

const MIMES = new Map<string, string>([
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);

function archivosDe(carpeta: string): string[] {
  try {
    return readdirSync(carpeta).filter((nombre) => {
      const ruta = path.join(carpeta, nombre);

      return statSync(ruta).isFile() && MIMES.has(path.extname(nombre).toLowerCase());
    });
  } catch {
    return [];
  }
}

// ---- Composition (mirrors src/index.ts) -------------------------------------

const db = createDatabase({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  statementTimeoutMs: 10_000,
  idleInTransactionTimeoutMs: 10_000,
});

await sql`select 1`.execute(db);
const llm = new OpenRouterLlmClient();
const embeddings = new LocalBgeM3EmbeddingClient();
const documentoCrypto = new Aes256GcmDocumentoCrypto(
  Buffer.from(env.DOCUMENTO_ENCRYPTION_KEY, 'base64'),
);

function auditContext() {
  const context = getRequestContext();

  return { actorId: context?.actorId, requestId: context?.requestId, traceId: context?.traceId };
}

const runInDocumentoTransaction = createTransactionRunner(db, (trx) => ({
  documentos: new PostgresDocumentoWriter(trx, documentoCrypto),
  conocimiento: new PostgresConocimientoWriter(trx),
  propuestas: new PostgresPropuestaWriter(trx),
  propuestaItems: new PostgresPropuestaItemWriter(trx),
  recargos: new PostgresRecargoWriter(trx),
  audit: new PostgresAuditWriter(trx, auditContext()),
}));

const runInProyectoTransaction = createTransactionRunner(db, (trx) => ({
  proyectos: new PostgresProyectoWriter(trx),
  audit: new PostgresAuditWriter(trx, auditContext()),
}));

const runInProveedorTransaction = createTransactionRunner(db, (trx) => ({
  proveedores: new PostgresProveedorWriter(trx),
  audit: new PostgresAuditWriter(trx, auditContext()),
}));

const runInPropuestaTransaction = createTransactionRunner(db, (trx) => ({
  propuestas: new PostgresPropuestaWriter(trx),
  audit: new PostgresAuditWriter(trx, auditContext()),
}));

const runInEvaluacionTransaction = createTransactionRunner(db, (trx) => ({
  evaluaciones: new PostgresEvaluacionWriter(trx),
  audit: new PostgresAuditWriter(trx, auditContext()),
}));

const proyectoReader = new PostgresProyectoReader(db);
const proveedorReader = new PostgresProveedorReader(db);
const propuestaReader = new PostgresPropuestaReader(db);
const documentoReader = new PostgresDocumentoReader(db);

const extractor = {
  async extraer(input: { nombre: string; mime: string; bytes: Buffer }): Promise<string> {
    if (input.mime === 'application/pdf') {
      const texto = await new PdfExtractor().extraer(input);

      if (texto.replace(/\s/g, '').length > 20) {
        return texto;
      }

      return new PdfEscaneadoDescriber(llm).extraer(input);
    }

    if (input.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return new XlsxExtractor().extraer(input);
    }

    return new ImagenDescriber(llm).extraer(input);
  },
};

const documentos = new DocumentoService(
  documentoReader,
  runInDocumentoTransaction,
  proyectoReader,
  propuestaReader,
  proveedorReader,
  extractor,
  embeddings,
  new LlmMontosExtractor(llm),
);

const proyectos = new ProyectoService(proyectoReader, runInProyectoTransaction);
const proveedores = new ProveedorService(proveedorReader, runInProveedorTransaction);
const propuestas = new PropuestaService(
  propuestaReader,
  runInPropuestaTransaction,
  proyectoReader,
  proveedorReader,
);

const evaluaciones = new EvaluacionService({
  proyectos: proyectoReader,
  propuestas: propuestaReader,
  propuestaItems: new PostgresPropuestaItemReader(db),
  recargos: new PostgresRecargoReader(db),
  proveedores: proveedorReader,
  documentos: documentoReader,
  conocimiento: new ConocimientoListService(new PostgresConocimientoListReader(db)),
  mercado: new MercadoConSearxng(db, new SearxngClient(), llm),
  tasas: new BcvTasaClient(db),
  llm,
  runInTransaction: runInEvaluacionTransaction,
  reader: new PostgresEvaluacionReader(db),
});

// ---- Batch run ---------------------------------------------------------------

const { lote, salida } = parseArgs();

// 3.b: exact salida.json fields, computed from git and wall-clock time.
const inicio = new Date();
const commit = execSync('git rev-parse HEAD', { cwd: process.cwd() }).toString().trim();
const repositorio =
  process.env.GIT_REPOSITORY ??
  (() => {
    try {
      return execSync('git config --get remote.origin.url', { cwd: process.cwd() })
        .toString()
        .trim();
    } catch {
      return 'local';
    }
  })();

const raiz = readdirSync(lote);
const carpetaPropuestas = raiz.includes('propuestas') ? path.join(lote, 'propuestas') : lote;
const archivos = archivosDe(carpetaPropuestas).filter((nombre) => !/^proyecto\./i.test(nombre));
const archivoProyecto = raiz.find((nombre) => /^proyecto\.pdf$/i.test(nombre));

if (archivos.length === 0) {
  console.error('El lote no contiene propuestas (PDF/JPG/PNG/XLSX).');
  process.exit(3);
}

// 3.d: idempotent project reuse — never reprocess what already exists.
const nombreProyecto = path.basename(lote);
const existentes = await proyectoReader.list();
const proyecto =
  existentes.find((item) => item.nombre === nombreProyecto) ??
  (await proyectos.create({ nombre: nombreProyecto, descripcion: 'Proyecto del modo lote' }));

if (
  archivoProyecto &&
  !(await documentoReader.listByProyecto(proyecto.id)).some(
    (d: { nombre: string }) => d.nombre === archivoProyecto,
  )
) {
  await documentos.subir({
    proyectoId: proyecto.id,
    nombre: archivoProyecto,
    mime: 'application/pdf',
    tipo: 'requerimientos',
    contenidoBase64: readFileSync(path.join(lote, archivoProyecto)).toString('base64'),
  });
  console.log(`base del proyecto vectorizada: ${archivoProyecto}`);
}

const proveedoresExistentes = await proveedorReader.list();
const propuestasExistentes = await propuestaReader.listByProyecto(proyecto.id);
const documentosExistentes = await documentoReader.listByProyecto(proyecto.id);

const procesados: Array<{ archivo: string; hora: string }> = [];

// 3.d: bounded parallelism per file.
for (const archivo of archivos) {
  const mime = MIMES.get(path.extname(archivo).toLowerCase()) as string;
  const nombrePropuesta = path.basename(archivo, path.extname(archivo));
  const horaInicio = new Date().toISOString();

  const proveedor =
    proveedoresExistentes.find((item) => item.nombre === nombrePropuesta) ??
    (await proveedores.create({ nombre: nombrePropuesta }));

  const propuesta =
    propuestasExistentes.find((item) => item.proveedorId === proveedor.id) ??
    (await propuestas.create({ proyectoId: proyecto.id, proveedorId: proveedor.id }));

  const yaIngestada = documentosExistentes.some(
    (documento: { nombre: string; propuestaId: string | null }) =>
      documento.nombre === archivo && documento.propuestaId === propuesta.id,
  );

  if (!yaIngestada) {
    await documentos.subir({
      proyectoId: proyecto.id,
      propuestaId: propuesta.id,
      proveedorId: proveedor.id,
      nombre: archivo,
      mime,
      contenidoBase64: readFileSync(path.join(carpetaPropuestas, archivo)).toString('base64'),
    });
  }

  procesados.push({ archivo, hora: new Date().toISOString() });
  console.log(
    `ingestada: ${archivo} → ${horaInicio === '' ? 'nueva' : yaIngestada ? 'reutilizada' : 'nueva'}`,
  );
}

// 4) the SAME engine the UI button runs.
const evaluacion = await evaluaciones.lanzar(proyecto.id);

// 5) ranking from the engine verdicts: valid best-first, then discarded.
const ranking: string[] = (evaluacion.informe?.tablaComparativa ?? [])
  .slice()
  .sort((a, b) => (a.decision === 'descartada' ? 1 : 0) - (b.decision === 'descartada' ? 1 : 0))
  .map((fila) => fila.proveedor);

const salidaDatos = {
  reto: 'propuesta_servicios',
  repositorio,
  commit,
  inicio: inicio.toISOString(),
  fin: new Date().toISOString(),
  procesados,
  ranking,
};

writeFileSync(salida, `${JSON.stringify(salidaDatos, null, 2)}\n`, 'utf8');

console.log(`salida.json escrito en ${salida}`);
console.log(`evaluación: ${evaluacion.evaluacion.id}`);
console.log(`ranking: ${ranking.join(' > ')}`);

await db.destroy();
process.exit(0);
