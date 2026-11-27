import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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
  const { data: detalle, isPending, error } = useQuery(
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
                        📎 {descargando === adjunto.parte
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

              <pre className="cuerpo-correo">{detalle.cuerpo || '(sin texto)'}</pre>

              {descargaError && <p className="field-error">{descargaError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Input compartido entre la query y su invalidación.
const CORREOS_QUERY_INPUT = { carpeta: 'INBOX', limite: 50 };

function CorreosPage() {
  const queryClient = useQueryClient();
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [actualizando, setActualizando] = useState(false);

  const { data: correos, isPending, error } = useQuery(
    orpc.correos.list.queryOptions({ input: CORREOS_QUERY_INPUT }),
  );

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
        Escanea el buzón INBOX vía IMAP y lista solo los correos que traen archivos adjuntos,
        del más reciente al más antiguo. Haz clic en un correo para ver su información completa.
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
              <time dateTime={correo.fecha}>
                {new Date(correo.fecha).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}

      {seleccionado !== null && (
        <ModalCorreo uid={seleccionado} onCerrar={() => setSeleccionado(null)} />
      )}
    </section>
  );
}
