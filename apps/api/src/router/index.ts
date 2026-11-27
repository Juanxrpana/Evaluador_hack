import { implement, ORPCError } from '@orpc/server';
import { contract } from '@repo/contracts';
import type { Auth } from '../auth/auth.ts';
import { LlmError } from '../modules/ai/llm.client.ts';
import type { ChatService } from '../modules/chat/chat.service.ts';
import { ProyectoNoEncontradoChatError } from '../modules/chat/chat.service.ts';
import {
  DocumentoDemasiadoGrandeError,
  DocumentoVacioError,
  ExtractorFallidoError,
  ProyectoNoExisteError,
  PropuestaNoExisteError,
  PropuestaOtroProyectoError,
} from '../modules/documentos/documento.service.ts';
import { ContenidoIlegibleError } from '../modules/documentos/extractor.port.ts';
import type { DocumentoService } from '../modules/documentos/documento.service.ts';
import { ProyectoNoEncontradoError } from '../modules/proyectos/proyecto.service.ts';
import type { ProyectoService } from '../modules/proyectos/proyecto.service.ts';
import { ProveedorNoEncontradoError } from '../modules/proveedores/proveedor.service.ts';
import type { ProveedorService } from '../modules/proveedores/proveedor.service.ts';
import { PropuestaNoEncontradaError } from '../modules/propuestas/propuesta.service.ts';
import type { PropuestaService } from '../modules/propuestas/propuesta.service.ts';
import type { UserService } from '../modules/users/user.service.ts';
import { getRequestLogger, setRequestActor } from '../observability/request-context.ts';

export interface ApiContext {
  session: Awaited<ReturnType<Auth['api']['getSession']>>;
}

export interface RouterDependencies {
  users: UserService;
  proyectos: ProyectoService;
  proveedores: ProveedorService;
  propuestas: PropuestaService;
  documentos: DocumentoService;
  chat: ChatService;
}

/** Expected domain failures become typed 4xx responses; nothing else escapes. */
function mapDomainError(error: unknown): never {
  if (
    error instanceof ProyectoNoEncontradoError ||
    error instanceof ProveedorNoEncontradoError ||
    error instanceof PropuestaNoEncontradaError ||
    error instanceof ProyectoNoExisteError ||
    error instanceof PropuestaNoExisteError ||
    error instanceof PropuestaOtroProyectoError ||
    error instanceof ProyectoNoEncontradoChatError
  ) {
    throw new ORPCError('NOT_FOUND', { message: error.message });
  }

  if (
    error instanceof DocumentoVacioError ||
    error instanceof DocumentoDemasiadoGrandeError ||
    error instanceof ContenidoIlegibleError ||
    error instanceof ExtractorFallidoError
  ) {
    throw new ORPCError('UNPROCESSABLE_CONTENT', { message: error.message });
  }

  if (error instanceof LlmError) {
    if (error.code === 'rate_limited') {
      throw new ORPCError('TOO_MANY_REQUESTS', {
        message: 'El proveedor de IA está saturado; intenta en unos segundos.',
      });
    }

    throw new ORPCError('INTERNAL', {
      message: 'El proveedor de IA no está disponible en este momento.',
    });
  }

  // Unknown failures keep the safe message but never lose their cause.
  getRequestLogger().error({ err: error }, 'unmapped domain error');
  throw new ORPCError('INTERNAL', { message: 'Unexpected server error' });
}

/**
 * Composition root for the API. Handlers receive dependencies explicitly,
 * which keeps them replaceable (Dependency Inversion) and easy to test.
 */
export function createRouter({
  users,
  proyectos,
  proveedores,
  propuestas,
  documentos,
  chat,
}: RouterDependencies) {
  const os = implement(contract).$context<ApiContext>();

  const authenticated = os.middleware(({ context, next }) => {
    if (!context.session) {
      throw new ORPCError('UNAUTHORIZED');
    }

    setRequestActor(context.session.user.id);
    return next();
  });

  return os.router({
    health: os.health.handler(() => ({
      status: 'ok' as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })),

    users: {
      list: os.users.list.use(authenticated).handler(() => users.list()),
    },

    proyectos: {
      list: os.proyectos.list.use(authenticated).handler(() => proyectos.list()),
      create: os.proyectos.create
        .use(authenticated)
        .handler(({ input }) => proyectos.create(input).catch(mapDomainError)),
    },

    proveedores: {
      list: os.proveedores.list.use(authenticated).handler(() => proveedores.list()),
      create: os.proveedores.create
        .use(authenticated)
        .handler(({ input }) => proveedores.create(input).catch(mapDomainError)),
      historial: os.proveedores.historial
        .use(authenticated)
        .handler(({ input }) => proveedores.historial(input.id).catch(mapDomainError)),
    },

    propuestas: {
      create: os.propuestas.create
        .use(authenticated)
        .handler(({ input }) => propuestas.create(input).catch(mapDomainError)),
      list: os.propuestas.list
        .use(authenticated)
        .handler(({ input }) => propuestas.listByProyecto(input.proyectoId).catch(mapDomainError)),
    },

    documentos: {
      upload: os.documentos.upload
        .use(authenticated)
        .handler(({ input }) => documentos.subir(input).catch(mapDomainError)),
      list: os.documentos.list
        .use(authenticated)
        .handler(({ input }) => documentos.listByProyecto(input.proyectoId).catch(mapDomainError)),
    },

    chat: {
      ask: os.chat.ask
        .use(authenticated)
        .handler(({ input }) => chat.preguntar(input).catch(mapDomainError)),
    },
  });
}
