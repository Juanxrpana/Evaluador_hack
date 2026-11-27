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
import { PostgresDocumentoWriter } from './modules/documentos/postgres-documento.writer.ts';
import { ImagenDescriber } from './modules/documentos/imagen.describer.ts';
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

// PDFs parse locally; images go through the vision model.
const extractor = {
  async extraer(input: { nombre: string; mime: string; bytes: Buffer }): Promise<string> {
    if (input.mime === 'application/pdf') {
      return new PdfExtractor().extraer(input);
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
