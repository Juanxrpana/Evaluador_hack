import { createServer } from 'node:http';
import { sql } from 'kysely';
import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { createAuth } from './auth/auth.ts';
import { createDatabase } from './db/client.ts';
import { createTransactionRunner } from './db/transaction.ts';
import { Aes256GcmDocumentoCrypto } from './modules/documentos/documento.crypto.ts';
import { LocalBgeM3EmbeddingClient } from './modules/ai/local-bge.embedding.client.ts';
import { OpenRouterLlmClient } from './modules/ai/openrouter-llm.client.ts';
import { PostgresAuditWriter } from './modules/audit/postgres-audit.writer.ts';
import { ChatService } from './modules/chat/chat.service.ts';
import { CorreoService } from './modules/correos/correo.service.ts';
import { ImapCorreoProvider } from './modules/correos/imap.correo.provider.ts';
import type {
  DocumentoTransaction,
  DocumentoTransactionRunner,
} from './modules/documentos/documento.transaction.ts';
import { DocumentoService } from './modules/documentos/documento.service.ts';
import { PostgresDocumentoReader } from './modules/documentos/postgres-documento.reader.ts';
import { PostgresConocimientoSearch } from './modules/documentos/postgres-conocimiento.search.ts';
import { PostgresConocimientoWriter } from './modules/documentos/postgres-conocimiento.writer.ts';
import { BcvTasaClient } from './modules/mercado/bcv-tasa.client.ts';
import type { MercadoService } from './modules/mercado/mercado.port.ts';
import { MercadoConSearxng } from './modules/mercado/mercado.service.ts';
import { SearxngClient } from './modules/mercado/searxng.client.ts';
import { EvaluacionService } from './modules/evaluaciones/evaluacion.service.ts';
import type {
  EvaluacionTransaction,
  EvaluacionTransactionRunner,
} from './modules/evaluaciones/evaluacion.transaction.ts';
import { PostgresEvaluacionReader } from './modules/evaluaciones/postgres-evaluacion.reader.ts';
import { PostgresEvaluacionWriter } from './modules/evaluaciones/postgres-evaluacion.writer.ts';
import { PostgresEtapasReader } from './modules/etapas/postgres-etapas.reader.ts';
import { EtapasService } from './modules/etapas/etapas.service.ts';
import { PostgresPropuestaItemReader } from './modules/propuestas/propuesta-item.reader.ts';
import {
  PostgresUsuarioReader,
  PostgresRolReader,
} from './modules/usuarios/postgres-usuario.reader.ts';
import type {
  UsuarioTransaction,
  UsuarioTransactionRunner,
} from './modules/usuarios/usuario.transaction.ts';
import { PostgresUsuarioWriter } from './modules/usuarios/postgres-usuario.writer.ts';
import { UsuarioService } from './modules/usuarios/usuario.service.ts';
import { DecisionFinalService } from './modules/propuestas/decision-final.service.ts';
import { PostgresDocumentoWriter } from './modules/documentos/postgres-documento.writer.ts';
import { PostgresPropuestaItemWriter } from './modules/propuestas/postgres-propuesta-item.writer.ts';
import { ImagenDescriber } from './modules/documentos/imagen.describer.ts';
import { PdfEscaneadoDescriber } from './modules/documentos/pdf-escaneado.describer.ts';
import { XlsxExtractor } from './modules/documentos/xlsx.extractor.ts';
import { PdfExtractor } from './modules/documentos/pdf.extractor.ts';
import { LlmMontosExtractor } from './modules/documentos/llm-montos.extractor.ts';
import {
  PostgresConocimientoListReader,
  ConocimientoListService,
} from './modules/documentos/postgres-conocimiento.list.ts';
import { PostgresRecargoReader } from './modules/recargos/postgres-recargo.reader.ts';
import { PostgresRecargoWriter } from './modules/recargos/postgres-recargo.writer.ts';
import { PostgresNotaReader } from './modules/notas/postgres-nota.reader.ts';
import type { NotaTransaction, NotaTransactionRunner } from './modules/notas/nota.transaction.ts';
import { PostgresNotaWriter } from './modules/notas/postgres-nota.writer.ts';
import { NotaService } from './modules/notas/nota.service.ts';
import { PostgresEstatusReader } from './modules/estatus/postgres-estatus.reader.ts';
import type {
  EstatusTransaction,
  EstatusTransactionRunner,
} from './modules/estatus/estatus.transaction.ts';
import { PostgresEstatusWriter } from './modules/estatus/postgres-estatus.writer.ts';
import { EstatusService } from './modules/estatus/estatus.service.ts';
import { PostgresProveedorReader } from './modules/proveedores/postgres-proveedor.reader.ts';
import type {
  ProveedorTransaction,
  ProveedorTransactionRunner,
} from './modules/proveedores/proveedor.transaction.ts';
import { PostgresProveedorWriter } from './modules/proveedores/postgres-proveedor.writer.ts';
import { ProveedorService } from './modules/proveedores/proveedor.service.ts';
import { PostgresPropuestaReader } from './modules/propuestas/postgres-propuesta.reader.ts';
import type {
  PropuestaTransaction,
  PropuestaTransactionRunner,
} from './modules/propuestas/propuesta.transaction.ts';
import { PostgresPropuestaWriter } from './modules/propuestas/postgres-propuesta.writer.ts';
import { PropuestaService } from './modules/propuestas/propuesta.service.ts';
import { PostgresProyectoReader } from './modules/proyectos/postgres-proyecto.reader.ts';
import type {
  ProyectoTransaction,
  ProyectoTransactionRunner,
} from './modules/proyectos/proyecto.transaction.ts';
import { PostgresProyectoWriter } from './modules/proyectos/postgres-proyecto.writer.ts';
import { ProyectoService } from './modules/proyectos/proyecto.service.ts';
import { PostgresUserReader } from './modules/users/postgres-user.reader.ts';
import { PostgresUserWriter } from './modules/users/postgres-user.writer.ts';
import type { UserTransaction, UserTransactionRunner } from './modules/users/user.transaction.ts';
import { UserService } from './modules/users/user.service.ts';
import { TasaBcvService } from './modules/tasa/tasa-bcv.service.ts';
import { logger } from './observability/logger.ts';
import { getRequestContext } from './observability/request-context.ts';

const db = createDatabase({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  statementTimeoutMs: 10_000,
  idleInTransactionTimeoutMs: 10_000,
});

await sql`select 1`.execute(db);
logger.info('Database connection verified');

// AI clients: OpenRouter for chat/vision, local bge-m3 for embeddings.
const llm = new OpenRouterLlmClient();
const embeddings = new LocalBgeM3EmbeddingClient();

// At-rest encryption for uploaded documents: the storage adapters encrypt,
// every other layer keeps handling plaintext bytes in memory.
const documentoCrypto = new Aes256GcmDocumentoCrypto(
  Buffer.from(env.DOCUMENTO_ENCRYPTION_KEY, 'base64'),
);

function auditContext() {
  const context = getRequestContext();

  return {
    actorId: context?.actorId,
    requestId: context?.requestId,
    traceId: context?.traceId,
  };
}

const runInUserTransaction: UserTransactionRunner = createTransactionRunner<UserTransaction>(
  db,
  (trx) => ({
    users: new PostgresUserWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }),
);

const runInProyectoTransaction: ProyectoTransactionRunner =
  createTransactionRunner<ProyectoTransaction>(db, (trx) => ({
    proyectos: new PostgresProyectoWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }));

const runInProveedorTransaction: ProveedorTransactionRunner =
  createTransactionRunner<ProveedorTransaction>(db, (trx) => ({
    proveedores: new PostgresProveedorWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }));

const runInPropuestaTransaction: PropuestaTransactionRunner =
  createTransactionRunner<PropuestaTransaction>(db, (trx) => ({
    propuestas: new PostgresPropuestaWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }));

const runInDocumentoTransaction: DocumentoTransactionRunner =
  createTransactionRunner<DocumentoTransaction>(db, (trx) => ({
    documentos: new PostgresDocumentoWriter(trx, documentoCrypto),
    conocimiento: new PostgresConocimientoWriter(trx),
    propuestas: new PostgresPropuestaWriter(trx),
    propuestaItems: new PostgresPropuestaItemWriter(trx),
    recargos: new PostgresRecargoWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }));

const runInNotaTransaction: NotaTransactionRunner = createTransactionRunner<NotaTransaction>(
  db,
  (trx) => ({
    notas: new PostgresNotaWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }),
);

const runInEstatusTransaction: EstatusTransactionRunner =
  createTransactionRunner<EstatusTransaction>(db, (trx) => ({
    estatus: new PostgresEstatusWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }));

const proyectoReader = new PostgresProyectoReader(db);
const proveedorReader = new PostgresProveedorReader(db);
const propuestaReader = new PostgresPropuestaReader(db);

const proyectos = new ProyectoService(proyectoReader, runInProyectoTransaction);
const proveedores = new ProveedorService(proveedorReader, runInProveedorTransaction);
const propuestas = new PropuestaService(
  propuestaReader,
  runInPropuestaTransaction,
  proyectoReader,
  proveedorReader,
);

// PDFs parse locally (scanned ones fall back to the vision model); XLSX is
// parsed with exceljs; images go through the vision model.
const extractor = {
  async extraer(input: { nombre: string; mime: string; bytes: Buffer }): Promise<string> {
    if (input.mime === 'application/pdf') {
      const texto = await new PdfExtractor().extraer(input);

      if (texto.replace(/\s/g, '').length > 20) {
        return texto;
      }

      // A.2: image-only scanned PDF → vision model as a native file.
      return new PdfEscaneadoDescriber(llm).extraer(input);
    }

    if (
      input.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      input.mime === 'application/vnd.ms-excel'
    ) {
      return new XlsxExtractor().extraer(input);
    }

    return new ImagenDescriber(llm).extraer(input);
  },
};

const documentos: DocumentoService = new DocumentoService(
  new PostgresDocumentoReader(db),
  runInDocumentoTransaction,
  proyectoReader,
  propuestaReader,
  proveedorReader,
  extractor,
  embeddings,
  new LlmMontosExtractor(llm),
);

const chat: ChatService = new ChatService(
  proyectoReader,
  propuestaReader,
  proveedorReader,
  new PostgresConocimientoSearch(db),
  embeddings,
  llm,
);

// Correo scanning: IMAP adapter chosen here; tests can inject a fake provider.
const correos = new CorreoService(new ImapCorreoProvider());

const notas = new NotaService(new PostgresNotaReader(db), runInNotaTransaction, propuestaReader);
const estatus = new EstatusService(
  new PostgresEstatusReader(db),
  runInEstatusTransaction,
  proyectoReader,
  propuestaReader,
);
const recargos = new PostgresRecargoReader(db);
const conocimiento = new ConocimientoListService(new PostgresConocimientoListReader(db));
const propuestaItems = new PostgresPropuestaItemReader(db);
const etapasReader = new PostgresEtapasReader(db);
const etapas = new EtapasService(etapasReader);

// Mercado (C.1) + tasa BCV (E.4.a).
const mercado: MercadoService = new MercadoConSearxng(db, new SearxngClient(), llm);
const tasas = new BcvTasaClient(db);

// Evaluaciones (3.c / D.3 / D.4).
const runInEvaluacionTransaction: EvaluacionTransactionRunner =
  createTransactionRunner<EvaluacionTransaction>(db, (trx) => ({
    evaluaciones: new PostgresEvaluacionWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }));

const evaluaciones = new EvaluacionService({
  proyectos: proyectoReader,
  propuestas: propuestaReader,
  propuestaItems,
  recargos,
  proveedores: proveedorReader,
  documentos: new PostgresDocumentoReader(db),
  conocimiento,
  mercado,
  tasas,
  llm,
  runInTransaction: runInEvaluacionTransaction,
  reader: new PostgresEvaluacionReader(db),
});

// Usuarios y roles (E.2.b) + decisión final (E.2.c).
const runInUsuarioTransaction: UsuarioTransactionRunner =
  createTransactionRunner<UsuarioTransaction>(db, (trx) => ({
    usuarios: new PostgresUsuarioWriter(trx),
    audit: new PostgresAuditWriter(trx, auditContext()),
  }));
const usuarios = new UsuarioService(
  new PostgresUsuarioReader(db),
  new PostgresRolReader(db),
  runInUsuarioTransaction,
);

const decisiones = new DecisionFinalService(
  propuestaReader,
  proveedorReader,
  new PostgresEstatusReader(db),
  runInEstatusTransaction,
);

/** E.2.b: the caller's permission codes, resolved per request. */
async function permisosDe(usuarioId: string): Promise<Set<string>> {
  const filas = await db
    .selectFrom('users')
    .innerJoin('rol_permiso', 'rol_permiso.rol_id', 'users.rol_id')
    .innerJoin('permiso', 'permiso.id', 'rol_permiso.permiso_id')
    .select(['permiso.codigo'])
    .where('users.id', '=', usuarioId)
    .execute();

  return new Set(filas.map((fila) => fila.codigo));
}
const tasa = new TasaBcvService();

const app = createApp({
  auth: createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: env.CORS_ORIGIN,
  }),
  users: new UserService(new PostgresUserReader(db), runInUserTransaction),
  proyectos,
  proveedores,
  propuestas,
  documentos,
  chat,
  notas,
  estatus,
  recargos,
  conocimiento,
  items: propuestaItems,
  evaluaciones,
  procesos: etapas,
  usuarios,
  decisiones,
  alertas: { porProveedor: (id: string) => evaluaciones.alertasPorProveedor(id) },
  permisosDe,
  tasa,
  correos,
});
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API listening');
  logger.info({ url: `http://localhost:${env.PORT}/api` }, 'oRPC/OpenAPI base');
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info('Shutting down');

  server.close(async () => {
    try {
      await db.destroy();
    } finally {
      logger.flush(() => process.exit(0));
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
