import { implement, ORPCError } from '@orpc/server';
import { contract } from '@repo/contracts';
import type { Auth } from '../auth/auth.ts';
import { LlmError } from '../modules/ai/llm.client.ts';
import type { ChatService } from '../modules/chat/chat.service.ts';
import { ProyectoNoEncontradoChatError } from '../modules/chat/chat.service.ts';
import type { CorreoService } from '../modules/correos/correo.service.ts';
import {
  AdjuntoDemasiadoGrandeError,
  CorreoNoDisponibleError,
  CorreoNoEncontradoError,
} from '../modules/correos/correo.service.ts';
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
import type { AlertaAntecedente } from '@repo/contracts';
import type { EvaluacionService } from '../modules/evaluaciones/evaluacion.service.ts';
import { ProyectoSinPropuestasError } from '../modules/evaluaciones/evaluacion.service.ts';
import type { EtapasService } from '../modules/etapas/etapas.service.ts';
import { DecisionFinalService } from '../modules/propuestas/decision-final.service.ts';
import type { PropuestaItemReader } from '../modules/propuestas/propuesta-item.reader.ts';
import type { UsuarioService } from '../modules/usuarios/usuario.service.ts';
import { RolNoExisteError, UsuarioNoEncontradoError } from '../modules/usuarios/usuario.service.ts';
import type { EstatusService } from '../modules/estatus/estatus.service.ts';
import { EstatusNoEncontradoError } from '../modules/estatus/estatus.service.ts';
import type { NotaService } from '../modules/notas/nota.service.ts';
import { NotaNoEncontradaError } from '../modules/notas/nota.service.ts';
import type { RecargoReader } from '../modules/recargos/recargo.reader.ts';
import type { ConocimientoListService } from '../modules/documentos/conocimiento.list.ts';
import { DocumentoNoEncontradoError } from '../modules/documentos/documento.service.ts';
import type { TasaBcvService } from '../modules/tasa/tasa-bcv.service.ts';
import { TasaNoDisponibleError } from '../modules/tasa/tasa-bcv.service.ts';

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
  notas: NotaService;
  estatus: EstatusService;
  recargos: RecargoReader;
  conocimiento: ConocimientoListService;
  items: PropuestaItemReader;
  evaluaciones: EvaluacionService;
  procesos: EtapasService;
  usuarios: UsuarioService;
  decisiones: DecisionFinalService;
  alertas: { porProveedor(proveedorId: string): Promise<AlertaAntecedente[]> };
  /** User permission codes (E.2.b), resolved per request. */
  permisosDe: (usuarioId: string) => Promise<Set<string>>;
  tasa: TasaBcvService;
  correos: CorreoService;
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
    error instanceof ProyectoNoEncontradoChatError ||
    error instanceof DocumentoNoEncontradoError ||
    error instanceof NotaNoEncontradaError ||
    error instanceof EstatusNoEncontradoError ||
    error instanceof UsuarioNoEncontradoError ||
    error instanceof RolNoExisteError ||
    error instanceof CorreoNoEncontradoError
  ) {
    throw new ORPCError('NOT_FOUND', { message: error.message });
  }

  // A delete blocked by a surviving FK relation (e.g. proveedor with propuestas).
  // RESTRICT violations surface as 23001; cascade/foreign-key ones as 23503.
  const pgCode =
    error && typeof error === 'object' && 'code' in error
      ? (error as { code?: unknown }).code
      : (error as { cause?: { code?: unknown } } | null)?.cause?.code;

  if (pgCode === '23503' || pgCode === '23001') {
    throw new ORPCError('CONFLICT', {
      message: 'El registro tiene relaciones y no puede eliminarse todavía.',
    });
  }

  if (
    error instanceof DocumentoVacioError ||
    error instanceof DocumentoDemasiadoGrandeError ||
    error instanceof ContenidoIlegibleError ||
    error instanceof ExtractorFallidoError ||
    error instanceof AdjuntoDemasiadoGrandeError
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

  if (error instanceof ProyectoSinPropuestasError) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'El proyecto no tiene propuestas para evaluar.',
    });
  }

  if (error instanceof Error && error.name === 'PermisoFaltanteError') {
    throw new ORPCError('FORBIDDEN', { message: error.message });
  }

  if (
    error instanceof Error &&
    (error.name === 'EvaluacionNoEncontradaError' || error.name === 'EvaluacionSinInformeError')
  ) {
    throw new ORPCError('NOT_FOUND', { message: error.message });
  }

  if (error instanceof TasaNoDisponibleError) {
    throw new ORPCError('SERVICE_UNAVAILABLE', { message: error.message });
  }

  if (error instanceof CorreoNoDisponibleError) {
    throw new ORPCError('INTERNAL', { message: error.message });
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
  notas,
  estatus,
  recargos,
  conocimiento,
  items,
  evaluaciones,
  procesos,
  usuarios,
  decisiones,
  alertas,
  permisosDe,
  tasa,
  correos,
}: RouterDependencies) {
  const os = implement(contract).$context<ApiContext>();

  const authenticated = os.middleware(({ context, next }) => {
    if (!context.session) {
      throw new ORPCError('UNAUTHORIZED');
    }

    setRequestActor(context.session.user.id);
    return next();
  });

  /** E.2.b: real permission checks per procedure. */
  const requirePermiso = (codigo: string) =>
    os.middleware(async ({ context, next }) => {
      if (!context.session) {
        throw new ORPCError('UNAUTHORIZED');
      }

      setRequestActor(context.session.user.id);
      const permisos = await permisosDe(context.session.user.id);

      if (!permisos.has(codigo)) {
        throw new ORPCError('FORBIDDEN', { message: `Requiere el permiso ${codigo}` });
      }

      return next();
    });

  return os.router({
    health: os.health.handler(() => ({
      status: 'ok' as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })),

    tasa: {
      bcv: os.tasa.bcv.use(authenticated).handler(async () => {
        try {
          const { tasa: actual } = await tasa.obtener();
          return actual;
        } catch (error) {
          return mapDomainError(error);
        }
      }),
    },

    users: {
      list: os.users.list.use(authenticated).handler(() => users.list()),
    },

    proyectos: {
      list: os.proyectos.list.use(authenticated).handler(() => proyectos.list()),
      get: os.proyectos.get
        .use(authenticated)
        .handler(({ input }) => proyectos.get(input.id).catch(mapDomainError)),
      create: os.proyectos.create
        .use(authenticated)
        .handler(({ input }) => proyectos.create(input).catch(mapDomainError)),
      update: os.proyectos.update
        .use(authenticated)
        .handler(({ input }) => proyectos.actualizar(input.id, input).catch(mapDomainError)),
      delete: os.proyectos.delete
        .use(authenticated)
        .handler(({ input }) => proyectos.eliminar(input.id).catch(mapDomainError)),
    },

    proveedores: {
      list: os.proveedores.list.use(authenticated).handler(() => proveedores.list()),
      get: os.proveedores.get
        .use(authenticated)
        .handler(({ input }) => proveedores.get(input.id).catch(mapDomainError)),
      create: os.proveedores.create
        .use(authenticated)
        .handler(({ input }) => proveedores.create(input).catch(mapDomainError)),
      update: os.proveedores.update
        .use(authenticated)
        .handler(({ input }) => proveedores.actualizar(input.id, input).catch(mapDomainError)),
      delete: os.proveedores.delete
        .use(authenticated)
        .handler(({ input }) => proveedores.eliminar(input.id).catch(mapDomainError)),
      historial: os.proveedores.historial
        .use(authenticated)
        .handler(({ input }) => proveedores.historial(input.id).catch(mapDomainError)),
    },

    propuestas: {
      list: os.propuestas.list
        .use(authenticated)
        .handler(({ input }) => propuestas.listByProyecto(input.proyectoId).catch(mapDomainError)),
      get: os.propuestas.get
        .use(authenticated)
        .handler(({ input }) => propuestas.get(input.id).catch(mapDomainError)),
      create: os.propuestas.create
        .use(authenticated)
        .handler(({ input }) => propuestas.create(input).catch(mapDomainError)),
      update: os.propuestas.update
        .use(authenticated)
        .handler(({ input }) => propuestas.actualizar(input.id, input).catch(mapDomainError)),
      delete: os.propuestas.delete
        .use(authenticated)
        .handler(({ input }) => propuestas.eliminar(input.id).catch(mapDomainError)),
    },

    recargos: {
      list: os.recargos.list
        .use(authenticated)
        .handler(({ input }) => recargos.listByPropuesta(input.propuestaId).catch(mapDomainError)),
    },

    notas: {
      list: os.notas.list
        .use(authenticated)
        .handler(({ input }) => notas.listByPropuesta(input.propuestaId).catch(mapDomainError)),
      create: os.notas.create
        .use(authenticated)
        .handler(({ input }) => notas.create(input).catch(mapDomainError)),
      update: os.notas.update
        .use(authenticated)
        .handler(({ input }) => notas.actualizar(input.id, input).catch(mapDomainError)),
      delete: os.notas.delete
        .use(authenticated)
        .handler(({ input }) => notas.eliminar(input.id).catch(mapDomainError)),
    },

    estatus: {
      list: os.estatus.list
        .use(authenticated)
        .handler(({ input }) => estatus.list(input).catch(mapDomainError)),
      create: os.estatus.create
        .use(authenticated)
        .handler(({ input }) => estatus.create(input).catch(mapDomainError)),
      update: os.estatus.update
        .use(authenticated)
        .handler(({ input }) => estatus.actualizar(input.id, input).catch(mapDomainError)),
      delete: os.estatus.delete
        .use(authenticated)
        .handler(({ input }) => estatus.eliminar(input.id).catch(mapDomainError)),
    },

    documentos: {
      upload: os.documentos.upload
        .use(authenticated)
        .handler(({ input }) => documentos.subir(input).catch(mapDomainError)),
      list: os.documentos.list
        .use(authenticated)
        .handler(({ input }) => documentos.listByProyecto(input.proyectoId).catch(mapDomainError)),
      delete: os.documentos.delete
        .use(authenticated)
        .handler(({ input }) => documentos.eliminar(input.id).catch(mapDomainError)),
    },

    conocimiento: {
      list: os.conocimiento.list
        .use(authenticated)
        .handler(({ input }) =>
          conocimiento.listByProyecto(input.proyectoId).catch(mapDomainError),
        ),
    },

    items: {
      list: os.items.list
        .use(authenticated)
        .handler(({ input }) => items.listByPropuesta(input.propuestaId).catch(mapDomainError)),
    },

    evaluaciones: {
      lanzar: os.evaluaciones.lanzar
        .use(requirePermiso('evaluacion.lanzar'))
        .handler(({ input }) => evaluaciones.lanzar(input.proyectoId).catch(mapDomainError)),
      get: os.evaluaciones.get
        .use(authenticated)
        .handler(({ input }) => evaluaciones.obtener(input.id).catch(mapDomainError)),
      list: os.evaluaciones.list
        .use(authenticated)
        .handler(({ input }) =>
          evaluaciones.listByProyecto(input.proyectoId).catch(mapDomainError),
        ),
      informeMarkdown: os.evaluaciones.informeMarkdown
        .use(authenticated)
        .handler(({ input }) => evaluaciones.informeMarkdown(input.id).catch(mapDomainError)),
      informeCsv: os.evaluaciones.informeCsv
        .use(authenticated)
        .handler(({ input }) => evaluaciones.informeCsv(input.id).catch(mapDomainError)),
    },

    procesos: {
      etapas: os.procesos.etapas
        .use(authenticated)
        .handler(() => procesos.list().catch(mapDomainError)),
    },

    usuarios: {
      list: os.usuarios.list
        .use(requirePermiso('usuario.ver'))
        .handler(() => usuarios.list().catch(mapDomainError)),
      roles: os.usuarios.roles
        .use(requirePermiso('usuario.ver'))
        .handler(() => usuarios.roles().catch(mapDomainError)),
      asignarRol: os.usuarios.asignarRol
        .use(requirePermiso('usuario.asignar_rol'))
        .handler(({ input }) => usuarios.asignarRol(input.id, input.rolId).catch(mapDomainError)),
    },

    decisiones: {
      final: os.decisiones.final
        .use(authenticated)
        .handler(({ input, context }) =>
          decisiones.registrar(input, context.session!.user.id, permisosDe).catch(mapDomainError),
        ),
    },

    alertas: {
      proveedor: os.alertas.proveedor
        .use(authenticated)
        .handler(({ input }) => alertas.porProveedor(input.proveedorId).catch(mapDomainError)),
    },

    chat: {
      ask: os.chat.ask
        .use(authenticated)
        .handler(({ input }) => chat.preguntar(input).catch(mapDomainError)),
    },

    correos: {
      list: os.correos.list
        .use(authenticated)
        .handler(({ input }) => correos.listar(input).catch(mapDomainError)),
      get: os.correos.get
        .use(authenticated)
        .handler(({ input }) => correos.obtenerDetalle(input).catch(mapDomainError)),
      adjunto: os.correos.adjunto
        .use(authenticated)
        .handler(({ input }) => correos.descargarAdjunto(input).catch(mapDomainError)),
    },
  });
}
