import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { messageOf } from '../../lib/errors';
import { orpc } from '../../lib/orpc';
import type { Correo } from '@repo/contracts';

export const Route = createFileRoute('/_authed/correos')({
  component: CorreosPage,
});

function formatearTamano(bytes: number): string {
  if (bytes <= 0) {
    return 'tamaño n/d';
  }

  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

function ModalCorreo({ uid, onCerrar }: { uid: number; onCerrar: () => void }) {
  const {
    data: detalle,
    isPending,
    error,
  } = useQuery(
    orpc.correos.get.queryOptions({
      input: { carpeta: 'INBOX', uid },
    }),
  );

  const [descargando, setDescargando] = useState<string | null>(null);
  const [descargaError, setDescargaError] = useState<string | null>(null);

  const descargar = useMutation(orpc.correos.adjunto.mutationOptions());

  async function bajarAdjunto(adjunto: { parte: string; nombre: string; mime: string }) {
    setDescargando(adjunto.parte);
    setDescargaError(null);

    try {
      const contenido = await descargar.mutateAsync({
        uid,
        parte: adjunto.parte,
        carpeta: 'INBOX',
      });

      // base64 -> binario -> archivo descargable por el navegador.
      const binario = Uint8Array.from(atob(contenido.contenidoBase64), (car) => car.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([binario], { type: contenido.mime }));
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = contenido.nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setDescargaError(messageOf(cause));
    } finally {
      setDescargando(null);
    }
  }

  // Escape cierra el modal.
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        onCerrar();
      }
    }

    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCerrar();
        }
      }}
      role="presentation"
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Información del correo">
        <div className="modal-cabecera">
          <h2 className="modal-titulo">{detalle?.asunto ?? 'Información del correo'}</h2>
          <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-cuerpo">
          {isPending && <p className="lede">Cargando información…</p>}
          {error && <p className="field-error">{messageOf(error)}</p>}

          {detalle && (
            <>
              <dl className="modal-meta">
                <div>
                  <dt>De</dt>
                  <dd>{detalle.de}</dd>
                </div>
                <div>
                  <dt>Para</dt>
                  <dd>{detalle.para}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{new Date(detalle.fecha).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Adjuntos</dt>
                  <dd>
                    {detalle.adjuntos.map((adjunto) => (
                      <button
                        key={adjunto.parte}
                        type="button"
                        className="adjunto-chip"
                        title={`Descargar ${adjunto.nombre}`}
                        onClick={() => bajarAdjunto(adjunto)}
                        disabled={descargando !== null}
                      >
                        📎{' '}
                        {descargando === adjunto.parte
                          ? 'Descargando…'
                          : `${adjunto.nombre} · ${formatearTamano(adjunto.tamanoBytes)}`}
                      </button>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Carpeta</dt>
                  <dd>{detalle.carpeta}</dd>
                </div>
              </dl>

              <AnalizarAdjunto
                uid={detalle.uid}
                carpeta={detalle.carpeta}
                adjuntos={detalle.adjuntos}
              />

              <pre className="cuerpo-correo">{detalle.cuerpo || '(sin texto)'}</pre>

              {descargaError && <p className="field-error">{descargaError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Asigna un adjunto del correo a un proveedor y lo manda a analizar dentro
 * de un proyecto: lo descarga del IMAP, lo guarda en PostgreSQL, lo
 * vectoriza y (si tiene propuesta) extrae monto/recargos/ítems.
 */
function AnalizarAdjunto({
  uid,
  carpeta,
  adjuntos,
}: {
  uid: number;
  carpeta: string;
  adjuntos: Array<{ parte: string; nombre: string; mime: string; tamanoBytes: number }>;
}) {
  const queryClient = useQueryClient();
  const [parte, setParte] = useState(adjuntos[0]?.parte ?? '');
  const [proyectoId, setProyectoId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [tipo, setTipo] = useState<'propuesta' | 'requerimientos'>('propuesta');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const proyectosQuery = useQuery(orpc.proyectos.list.queryOptions());
  const proveedoresQuery = useQuery(orpc.proveedores.list.queryOptions());

  const analizar = useMutation(
    orpc.correos.ingestarAdjunto.mutationOptions({
      onSuccess: (resultado) => {
        setError(null);
        setMensaje(
          `Analizado: ${resultado.chunks} fragmentos vectorizados` +
            (resultado.extraccion
              ? ` · monto ${resultado.extraccion.montoTotal ?? 'no detectado'} · ${resultado.extraccion.recargos} recargos · ${resultado.extraccion.items} ítems`
              : ''),
        );
        return queryClient.invalidateQueries({
          queryKey: orpc.documentos.list.queryKey({ input: { proyectoId } }),
        });
      },
      onError: (cause) => {
        setMensaje(null);
        setError(messageOf(cause));
      },
    }),
  );

  if (adjuntos.length === 0) {
    return null;
  }

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        analizar.mutate({
          uid,
          parte,
          carpeta,
          proyectoId,
          proveedorId: proveedorId || undefined,
          tipo,
        });
      }}
    >
      <h3>Analizar adjunto en un proyecto</h3>
      <div className="field">
        <label htmlFor="analizar-adjunto">Adjunto</label>
        <select id="analizar-adjunto" value={parte} onChange={(e) => setParte(e.target.value)}>
          {adjuntos.map((adjunto) => (
            <option key={adjunto.parte} value={adjunto.parte}>
              {adjunto.nombre} · {formatearTamano(adjunto.tamanoBytes)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="analizar-proyecto">Proyecto</label>
        <select
          id="analizar-proyecto"
          value={proyectoId}
          onChange={(e) => setProyectoId(e.target.value)}
          required
        >
          <option value="" disabled>
            Selecciona el proyecto
          </option>
          {(proyectosQuery.data ?? []).map((proyecto) => (
            <option key={proyecto.id} value={proyecto.id}>
              {proyecto.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="analizar-proveedor">Proveedor (crea la propuesta si falta)</label>
        <select
          id="analizar-proveedor"
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
        >
          <option value="">Sin proveedor (solo conocimiento)</option>
          {(proveedoresQuery.data ?? []).map((proveedor) => (
            <option key={proveedor.id} value={proveedor.id}>
              {proveedor.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="analizar-tipo">Tipo de documento</label>
        <select
          id="analizar-tipo"
          value={tipo}
          onChange={(e) =>
            setTipo(e.target.value === 'requerimientos' ? 'requerimientos' : 'propuesta')
          }
        >
          <option value="propuesta">Propuesta</option>
          <option value="requerimientos">Requerimientos del proyecto</option>
        </select>
      </div>
      {mensaje && <p className="lede">{mensaje}</p>}
      {error && <p className="field-error">{error}</p>}
      <button type="submit" disabled={analizar.isPending || !proyectoId}>
        {analizar.isPending ? 'Descargando y analizando…' : '⚡ Enviar a análisis'}
      </button>
    </form>
  );
}

// Input compartido entre la query y su invalidación.
const CORREOS_QUERY_INPUT = { carpeta: 'INBOX', limite: 50 };

function CorreosPage() {
  const queryClient = useQueryClient();
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [actualizando, setActualizando] = useState(false);

  const {
    data: correos,
    isPending,
    error,
  } = useQuery(orpc.correos.list.queryOptions({ input: CORREOS_QUERY_INPUT }));

  async function actualizar() {
    setActualizando(true);
    await queryClient.invalidateQueries({
      queryKey: orpc.correos.list.queryKey({ input: CORREOS_QUERY_INPUT }),
    });
    setActualizando(false);
  }

  return (
    <section className="stack">
      <p className="eyebrow">Evaluador</p>
      <h1>Correos con adjuntos</h1>
      <p className="lede">
        Escanea el buzón INBOX vía IMAP y lista solo los correos que traen archivos adjuntos, del
        más reciente al más antiguo. Haz clic en un correo para ver su información completa.
      </p>

      <button type="button" className="nav-button" onClick={actualizar} disabled={actualizando}>
        {actualizando ? 'Actualizando…' : 'Actualizar'}
      </button>

      {isPending && <p className="lede">Buscando correos con adjuntos…</p>}

      {error && <p className="field-error">{messageOf(error)}</p>}

      {!isPending && !error && (correos ?? []).length === 0 && (
        <p className="lede">No hay correos con adjuntos en el buzón.</p>
      )}

      {correos && correos.length > 0 && (
        <ul className="user-list">
          {correos.map((correo: Correo) => (
            <li key={correo.uid} onClick={() => setSeleccionado(correo.uid)}>
              <div>
                <strong>{correo.asunto}</strong>
                <span>{correo.de}</span>
                <span>
                  {correo.adjuntos.length} adjunto(s):{' '}
                  {correo.adjuntos
                    .map((adjunto) => `${adjunto.nombre} · ${formatearTamano(adjunto.tamanoBytes)}`)
                    .join(', ')}
                </span>
              </div>
              <time dateTime={correo.fecha}>{new Date(correo.fecha).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      )}

      {seleccionado !== null &&
        // Portal a <body>: la sección .page tiene una animación de entrada con
        // transform retenido, que descuelga el position:fixed del viewport.
        createPortal(
          <ModalCorreo uid={seleccionado} onCerrar={() => setSeleccionado(null)} />,
          document.body,
        )}
    </section>
  );
}
