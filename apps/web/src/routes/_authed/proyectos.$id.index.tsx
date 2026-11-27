import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Propuesta, Proveedor } from '@repo/contracts';
import { FileIcon } from '../../components/Icons';
import { Badge } from '../../components/ui';
import { messageOf } from '../../lib/errors';
import { monto as montoTexto } from '../../lib/format';
import { client, orpc } from '../../lib/orpc';

export const Route = createFileRoute('/_authed/proyectos/$id/')({
  component: ProyectoDetallePage,
});

function ProyectoDetallePage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const navegar = useNavigate();

  const { data: proyectos } = useQuery(orpc.proyectos.list.queryOptions());
  const { data: proveedores } = useQuery(orpc.proveedores.list.queryOptions());
  const { data: propuestas } = useQuery(
    orpc.propuestas.list.queryOptions({ input: { proyectoId: id } }),
  );
  const { data: documentos } = useQuery(
    orpc.documentos.list.queryOptions({ input: { proyectoId: id } }),
  );
  const { data: conocimiento } = useQuery(
    orpc.conocimiento.list.queryOptions({ input: { proyectoId: id } }),
  );

  const proyecto = (proyectos ?? []).find((item) => item.id === id);
  const invalidar = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.documentos.list.queryKey({ input: { proyectoId: id } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.conocimiento.list.queryKey({ input: { proyectoId: id } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.propuestas.list.queryKey({ input: { proyectoId: id } }),
      }),
    ]);

  if (!proyecto) {
    return (
      <section className="stack">
        <p className="lede">Proyecto no encontrado.</p>
      </section>
    );
  }

  return (
    <div className="stack">
      <CabeceraProyecto
        proyectoId={id}
        nombre={proyecto.nombre}
        descripcion={proyecto.descripcion}
        onDeleted={() => navegar({ to: '/proyectos' })}
      />

      <div className="home-grid">
        <DocumentosPanel
          proyectoId={id}
          propuestas={propuestas ?? []}
          proveedores={proveedores ?? []}
          documentos={documentos ?? []}
          onChanged={invalidar}
        />
        <ProveedoresPanel proveedores={proveedores ?? []} />
      </div>

      <section className="stack">
        <h2 className="section-title">Propuestas</h2>
        {(propuestas ?? []).map((propuesta) => (
          <PropuestaCard
            key={propuesta.id}
            propuesta={propuesta}
            proveedores={proveedores ?? []}
            onChanged={invalidar}
          />
        ))}
        {(propuestas ?? []).length === 0 && (
          <p className="lede">
            Sin propuestas todavía: registra un proveedor y sube el documento de su oferta.
          </p>
        )}
      </section>

      <div className="home-grid">
        <ChatDelProyecto proyectoId={id} />
        <ConocimientoPanel chunks={conocimiento ?? []} />
      </div>
    </div>
  );
}

function CabeceraProyecto({
  proyectoId,
  nombre,
  descripcion,
  onDeleted,
}: {
  proyectoId: string;
  nombre: string;
  descripcion: string | null;
  onDeleted: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(nombre);
  const [nuevaDescripcion, setNuevaDescripcion] = useState(descripcion ?? '');
  const [error, setError] = useState<string | null>(null);

  const actualizar = useMutation(
    orpc.proyectos.update.mutationOptions({
      onSuccess: () => {
        setEditando(false);
        setError(null);
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  const eliminar = useMutation(
    orpc.proyectos.delete.mutationOptions({
      onSuccess: () => onDeleted(),
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  return (
    <div className="stack">
      {editando ? (
        <form
          className="form-panel"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            actualizar.mutate({
              id: proyectoId,
              nombre: nuevoNombre,
              ...(nuevaDescripcion.trim()
                ? { descripcion: nuevaDescripcion.trim() }
                : { descripcion: null }),
            });
          }}
        >
          <div className="field">
            <label htmlFor="editar-nombre">Nombre</label>
            <input
              id="editar-nombre"
              value={nuevoNombre}
              onChange={(event) => setNuevoNombre(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="editar-descripcion">Descripción</label>
            <input
              id="editar-descripcion"
              value={nuevaDescripcion}
              onChange={(event) => setNuevaDescripcion(event.target.value)}
            />
          </div>
          <div className="acciones">
            <button type="submit" disabled={actualizar.isPending}>
              Guardar
            </button>
            <button type="button" className="boton-fantasma" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <h1>{nombre}</h1>
          <p className="lede">{descripcion ?? 'Sin descripción'}</p>
          <div className="acciones">
            <Link
              to="/proyectos/$id/informe"
              params={{ id: proyectoId }}
              className="btn btn--ghost"
            >
              Ver informe
            </Link>
            <button type="button" className="boton-fantasma" onClick={() => setEditando(true)}>
              Editar proyecto
            </button>
            <button
              type="button"
              className="boton-peligro"
              disabled={eliminar.isPending}
              onClick={() => {
                if (window.confirm(`¿Eliminar "${nombre}" y todo su contenido?`)) {
                  eliminar.mutate({ id: proyectoId });
                }
              }}
            >
              {eliminar.isPending ? '…' : 'Eliminar proyecto'}
            </button>
          </div>
        </>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function ProveedoresPanel({ proveedores }: { proveedores: Proveedor[] }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation(
    orpc.proveedores.create.mutationOptions({
      onSuccess: () => {
        setNombre('');
        setContacto('');
        setError(null);
        return queryClient.invalidateQueries({ queryKey: orpc.proveedores.list.queryKey() });
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        crear.mutate({ nombre, ...(contacto.trim() ? { contacto: contacto.trim() } : {}) });
      }}
    >
      <h2>Proveedor</h2>
      <div className="field">
        <label htmlFor="proveedor-nombre">Nombre del proveedor</label>
        <input
          id="proveedor-nombre"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="proveedor-contacto">Contacto (opcional)</label>
        <input
          id="proveedor-contacto"
          value={contacto}
          onChange={(event) => setContacto(event.target.value)}
        />
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" disabled={crear.isPending || nombre.trim().length === 0}>
        {crear.isPending ? 'Registrando…' : 'Registrar proveedor'}
      </button>
      <p className="lede">
        Registrados: {proveedores.map((proveedor) => proveedor.nombre).join(', ') || 'ninguno'}
      </p>
    </form>
  );
}

const MIMES_ACEPTADOS = ['application/pdf', 'image/png', 'image/jpeg'] as const;
type MimeAceptado = (typeof MIMES_ACEPTADOS)[number];
type EstadoCarga = 'en_cola' | 'subiendo' | 'procesando' | 'listo' | 'error' | 'duplicado';

interface FilaCarga {
  id: string;
  archivo: File;
  mime: MimeAceptado;
  estado: EstadoCarga;
  propuestaId: string;
  proveedorId: string;
  monto: string;
  detalle?: string;
  error?: string;
}

const TAMANO_MAXIMO = 15 * 1024 * 1024;
const MAXIMO_ARCHIVOS = 20;

const ETIQUETAS_CARGA: Record<
  EstadoCarga,
  { tono: 'neutral' | 'info' | 'ok' | 'warn' | 'danger'; texto: string }
> = {
  en_cola: { tono: 'neutral', texto: 'En cola' },
  subiendo: { tono: 'info', texto: 'Subiendo' },
  procesando: { tono: 'info', texto: 'Procesando' },
  listo: { tono: 'ok', texto: 'Listo' },
  error: { tono: 'danger', texto: 'Error' },
  duplicado: { tono: 'warn', texto: 'Duplicado' },
};

function mimeDe(archivo: File): MimeAceptado | null {
  return MIMES_ACEPTADOS.find((mime) => mime === archivo.type) ?? null;
}

function tamanoLegible(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const contenido = String(reader.result);
      resolve(contenido.slice(contenido.indexOf(',') + 1));
    });
    reader.addEventListener('error', () =>
      reject(new Error('No se pudo leer el archivo. Vuelve a seleccionarlo.')),
    );
    reader.readAsDataURL(archivo);
  });
}

function EstadoCargaBadge({ estado }: { estado: EstadoCarga }) {
  const { tono, texto } = ETIQUETAS_CARGA[estado];
  return (
    <Badge tone={tono} vivo={estado === 'subiendo' || estado === 'procesando'}>
      {texto}
    </Badge>
  );
}

function DocumentosPanel({
  proyectoId,
  propuestas,
  proveedores,
  documentos,
  onChanged,
}: {
  proyectoId: string;
  propuestas: Propuesta[];
  proveedores: Proveedor[];
  documentos: Array<{
    id: string;
    nombre: string;
    mime: string;
    tamanoBytes: number;
    createdAt: string;
    propuestaId: string | null;
    proveedorId: string | null;
  }>;
  onChanged: () => Promise<unknown>;
}) {
  const [filas, setFilas] = useState<FilaCarga[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const eliminar = useMutation(
    orpc.documentos.delete.mutationOptions({ onSuccess: () => onChanged() }),
  );

  const pendientes = filas.filter(
    (fila) => fila.estado === 'en_cola' || fila.estado === 'error',
  ).length;
  const completados = filas.filter((fila) =>
    ['listo', 'error', 'duplicado'].includes(fila.estado),
  ).length;
  const progreso = filas.length === 0 ? 0 : Math.round((completados / filas.length) * 100);

  useEffect(() => {
    if (!subiendo) return;
    const avisar = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [subiendo]);

  function actualizarFila(id: string, cambios: Partial<FilaCarga>) {
    setFilas((actuales) =>
      actuales.map((fila) => (fila.id === id ? { ...fila, ...cambios } : fila)),
    );
  }

  function quitarFila(id: string) {
    setFilas((actuales) => actuales.filter((fila) => fila.id !== id));
  }

  function limpiarLote() {
    setFilas([]);
    setError(null);
    setResultado(null);
  }

  function alSeleccionar(event: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (archivos.length === 0) return;

    const nuevas: FilaCarga[] = [];
    const problemas: string[] = [];

    for (const archivo of archivos) {
      if (filas.length + nuevas.length >= MAXIMO_ARCHIVOS) {
        problemas.push(`Máximo ${MAXIMO_ARCHIVOS} archivos por lote.`);
        break;
      }

      const mime = mimeDe(archivo);
      if (!mime) {
        problemas.push(`${archivo.name}: solo se aceptan PDF, PNG o JPG.`);
        continue;
      }

      if (archivo.size > TAMANO_MAXIMO) {
        problemas.push(`${archivo.name}: supera 15 MB.`);
        continue;
      }

      const duplicado =
        documentos.some(
          (documento) =>
            documento.nombre === archivo.name && documento.tamanoBytes === archivo.size,
        ) ||
        [...filas, ...nuevas].some(
          (fila) => fila.archivo.name === archivo.name && fila.archivo.size === archivo.size,
        );

      nuevas.push({
        id: crypto.randomUUID(),
        archivo,
        mime,
        estado: duplicado ? 'duplicado' : 'en_cola',
        propuestaId: '',
        proveedorId: '',
        monto: '',
        ...(duplicado ? { error: 'Este archivo ya está en el proyecto o en el lote.' } : {}),
      });
    }

    if (nuevas.length > 0) setFilas((actuales) => [...actuales, ...nuevas]);
    setError(problemas.length > 0 ? problemas.join(' ') : null);
    setResultado(null);
  }

  async function subirFila(fila: FilaCarga): Promise<'listo' | 'error'> {
    if (
      fila.estado === 'error' &&
      documentos.some(
        (documento) =>
          documento.nombre === fila.archivo.name && documento.tamanoBytes === fila.archivo.size,
      )
    ) {
      actualizarFila(fila.id, {
        estado: 'duplicado',
        error: 'El archivo ya aparece en la lista; no se reenvió.',
      });
      return 'listo';
    }

    actualizarFila(fila.id, { estado: 'subiendo', error: undefined, detalle: undefined });

    try {
      const contenidoBase64 = await archivoABase64(fila.archivo);

      let propuestaId = fila.propuestaId;
      if (!propuestaId && fila.proveedorId) {
        const monto = fila.monto.trim();
        if (monto && !/^\d{1,12}(\.\d{1,2})?$/.test(monto)) {
          throw new Error('El monto debe ser un decimal con hasta 2 decimales (ej. 125000.00).');
        }

        const propuesta = await client.propuestas.create({
          proyectoId,
          proveedorId: fila.proveedorId,
          ...(monto ? { monto } : {}),
        });
        propuestaId = propuesta.id;
        actualizarFila(fila.id, { propuestaId: propuesta.id });
        await onChanged();
      }

      actualizarFila(fila.id, { estado: 'procesando' });
      const respuesta = await client.documentos.upload({
        proyectoId,
        nombre: fila.archivo.name,
        mime: fila.mime,
        contenidoBase64,
        ...(propuestaId
          ? { propuestaId }
          : fila.proveedorId
            ? { proveedorId: fila.proveedorId }
            : {}),
      });

      const detalle = respuesta.extraccion
        ? `Monto ${
            respuesta.extraccion.montoTotal
              ? montoTexto(respuesta.extraccion.montoTotal)
              : 'no detectado'
          } · ${respuesta.extraccion.recargos} recargos.`
        : propuestaId
          ? 'Documento guardado; la lectura no devolvió monto.'
          : 'Documento guardado como conocimiento.';

      actualizarFila(fila.id, { estado: 'listo', detalle });
      return 'listo';
    } catch (cause) {
      actualizarFila(fila.id, { estado: 'error', error: messageOf(cause) });
      return 'error';
    }
  }

  async function procesarLote(event: FormEvent) {
    event.preventDefault();
    const pendientesFilas = filas.filter(
      (fila) => fila.estado === 'en_cola' || fila.estado === 'error',
    );
    if (pendientesFilas.length === 0) return;

    setSubiendo(true);
    setError(null);
    setResultado(null);

    let listos = 0;
    let fallidos = 0;
    for (const fila of pendientesFilas) {
      // Secuencial a propósito: respeta el límite de escrituras del API.
      // eslint-disable-next-line no-await-in-loop
      const estado = await subirFila(fila);
      if (estado === 'listo') listos += 1;
      else fallidos += 1;
    }

    await onChanged();
    setSubiendo(false);
    setResultado(
      `Lote procesado: ${listos} ${
        listos === 1 ? 'archivo listo' : 'archivos listos'
      }${fallidos > 0 ? `, ${fallidos} con error` : ''}.`,
    );
  }

  return (
    <form className="form-panel" onSubmit={procesarLote}>
      <h2>Documentos</h2>
      <p className="lede">
        Sube hasta 20 propuestas en PDF, PNG o JPG (15 MB por archivo). Cada archivo se guarda y se
        vectoriza; si le asignas un proveedor, se crea su propuesta y la IA intenta leer el monto y
        los recargos. Si no, queda como conocimiento del proyecto.
      </p>

      <div className="field">
        <label htmlFor="documento-archivo">Archivos del lote</label>
        <input
          id="documento-archivo"
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg"
          onChange={alSeleccionar}
          disabled={subiendo}
        />
        <small>Hasta 20 archivos · 15 MB cada uno · No cierres la página durante la subida.</small>
      </div>

      <p className="fine">
        Cada archivo con proveedor crea una propuesta y un documento. El servidor limita las
        escrituras por minuto; si un archivo falla, puedes reintentarlo.
      </p>

      {error ? <p className="field-error">{error}</p> : null}

      {filas.length > 0 ? (
        <section className="lote" aria-label="Cola de carga">
          <header className="lote__head">
            <span>
              <strong>{filas.length}</strong>{' '}
              {filas.length === 1 ? 'archivo en el lote' : 'archivos en el lote'}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={limpiarLote}
              disabled={subiendo}
            >
              Limpiar
            </button>
          </header>

          <div className="progress" aria-label={`Progreso del lote: ${progreso} %`}>
            <div className="progress__bar">
              <span style={{ width: `${progreso}%` }} />
            </div>
            <p className="fine">
              {subiendo
                ? `Subiendo ${Math.min(completados + 1, filas.length)} de ${filas.length}…`
                : `${completados} de ${filas.length} procesados`}
            </p>
          </div>

          <ul className="lote__lista">
            {filas.map((fila) => (
              <li key={fila.id} className="lote__fila">
                <span className="lote__archivo">
                  <FileIcon />
                  <span>
                    <strong>{fila.archivo.name}</strong>
                    <small>
                      {tamanoLegible(fila.archivo.size)} · {fila.mime}
                    </small>
                  </span>
                </span>

                <EstadoCargaBadge estado={fila.estado} />

                <div className="lote__selects">
                  <select
                    aria-label={`Propuesta existente para ${fila.archivo.name}`}
                    value={fila.propuestaId}
                    onChange={(event) =>
                      actualizarFila(fila.id, {
                        propuestaId: event.target.value,
                        proveedorId: '',
                        monto: '',
                      })
                    }
                    disabled={subiendo || fila.estado === 'listo' || fila.estado === 'duplicado'}
                  >
                    <option value="">Nueva propuesta</option>
                    {propuestas.map((propuesta) => {
                      const usada = filas.some(
                        (otra) => otra.id !== fila.id && otra.propuestaId === propuesta.id,
                      );
                      return (
                        <option key={propuesta.id} value={propuesta.id} disabled={usada}>
                          {proveedores.find((proveedor) => proveedor.id === propuesta.proveedorId)
                            ?.nombre ?? propuesta.id}
                          {propuesta.monto ? ` · ${montoTexto(propuesta.monto)}` : ''}
                          {usada ? ' · ya usada en el lote' : ''}
                        </option>
                      );
                    })}
                  </select>

                  {!fila.propuestaId ? (
                    <>
                      <select
                        aria-label={`Proveedor para ${fila.archivo.name}`}
                        value={fila.proveedorId}
                        onChange={(event) =>
                          actualizarFila(fila.id, { proveedorId: event.target.value })
                        }
                        disabled={
                          subiendo || fila.estado === 'listo' || fila.estado === 'duplicado'
                        }
                      >
                        <option value="">Sin proveedor</option>
                        {proveedores.map((proveedor) => (
                          <option key={proveedor.id} value={proveedor.id}>
                            {proveedor.nombre}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={`Monto declarado para ${fila.archivo.name}`}
                        inputMode="decimal"
                        placeholder="Monto (opcional)"
                        title="La lectura de la IA puede reemplazar este monto."
                        value={fila.monto}
                        onChange={(event) => actualizarFila(fila.id, { monto: event.target.value })}
                        disabled={
                          subiendo || fila.estado === 'listo' || fila.estado === 'duplicado'
                        }
                      />
                    </>
                  ) : (
                    <span className="lote__hereda">
                      Se vincula a la propuesta elegida; la lectura reemplaza su monto y recargos.
                    </span>
                  )}
                </div>

                {fila.estado === 'listo' && fila.detalle ? (
                  <span className="lote__detalle">{fila.detalle}</span>
                ) : null}
                {fila.estado === 'error' && fila.error ? (
                  <span className="lote__error">{fila.error}</span>
                ) : null}
                {fila.estado === 'duplicado' ? (
                  <span className="lote__error">{fila.error}</span>
                ) : null}

                {fila.estado !== 'listo' ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => quitarFila(fila.id)}
                    disabled={subiendo}
                  >
                    Quitar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <button type="submit" disabled={subiendo || pendientes === 0}>
            {subiendo
              ? 'Subiendo lote…'
              : `Subir ${pendientes} ${pendientes === 1 ? 'archivo' : 'archivos'}`}
          </button>
        </section>
      ) : (
        <p className="fine">
          Aún no hay archivos. Selecciona entre 3 y 20 propuestas para preparar el lote.
        </p>
      )}

      {resultado ? (
        <div className="notice" role="status">
          <p>{resultado}</p>
        </div>
      ) : null}

      <ul className="user-list">
        {documentos.map((documento) => (
          <li key={documento.id}>
            <div>
              <strong>{documento.nombre}</strong>
              <span>
                {documento.mime} · {(documento.tamanoBytes / 1024).toFixed(0)} KB
                {documento.propuestaId ? ' · vinculado a propuesta' : ''}
              </span>
            </div>
            <button
              type="button"
              className="boton-peligro"
              disabled={eliminar.isPending}
              onClick={() => eliminar.mutate({ id: documento.id })}
            >
              {eliminar.isPending ? '…' : 'Eliminar'}
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}

function PropuestaCard({
  propuesta,
  proveedores,
  onChanged,
}: {
  propuesta: Propuesta;
  proveedores: Proveedor[];
  onChanged: () => Promise<unknown>;
}) {
  const proveedor = proveedores.find((item) => item.id === propuesta.proveedorId);
  const [monto, setMonto] = useState(propuesta.monto ?? '');
  const [textoNota, setTextoNota] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: recargos } = useQuery(
    orpc.recargos.list.queryOptions({ input: { propuestaId: propuesta.id } }),
  );
  const { data: notas } = useQuery(
    orpc.notas.list.queryOptions({ input: { propuestaId: propuesta.id } }),
  );
  const { data: estatuses } = useQuery(
    orpc.estatus.list.queryOptions({ input: { propuestaId: propuesta.id } }),
  );

  const actualizar = useMutation(
    orpc.propuestas.update.mutationOptions({
      onSuccess: () => {
        setError(null);
        return onChanged();
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  const eliminar = useMutation(
    orpc.propuestas.delete.mutationOptions({
      onSuccess: () => onChanged(),
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  const crearNota = useMutation(
    orpc.notas.create.mutationOptions({
      onSuccess: () => {
        setTextoNota('');
        return onChanged();
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  const eliminarNota = useMutation(
    orpc.notas.delete.mutationOptions({ onSuccess: () => onChanged() }),
  );

  const crearEstatus = useMutation(
    orpc.estatus.create.mutationOptions({
      onSuccess: () => {
        setNuevoEstado('');
        setNuevoComentario('');
        return onChanged();
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  const eliminarEstatus = useMutation(
    orpc.estatus.delete.mutationOptions({ onSuccess: () => onChanged() }),
  );

  return (
    <form className="form-panel" onSubmit={(event) => event.preventDefault()}>
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{proveedor?.nombre ?? 'Propuesta'}</h2>
        <span className="badge">{recargos?.length ?? 0} recargos IA</span>
      </div>

      <div className="acciones">
        <input
          value={monto}
          onChange={(event) => setMonto(event.target.value)}
          placeholder="Monto base"
          aria-label="Monto base de la propuesta"
          style={{ maxWidth: '240px' }}
        />
        <button
          type="button"
          className="boton-fantasma"
          disabled={monto.trim().length === 0 || actualizar.isPending}
          onClick={() => actualizar.mutate({ id: propuesta.id, monto: monto.trim() })}
        >
          Guardar monto
        </button>
        <button
          type="button"
          className="boton-peligro"
          disabled={eliminar.isPending}
          onClick={() => {
            if (window.confirm('¿Eliminar la propuesta con sus recargos, notas y estatus?')) {
              eliminar.mutate({ id: propuesta.id });
            }
          }}
        >
          {eliminar.isPending ? '…' : 'Eliminar propuesta'}
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      <ul className="sub-lista">
        {(recargos ?? []).map((recargo) => (
          <li key={recargo.id}>
            <strong>{recargo.concepto}</strong>
            <span>{recargo.monto}</span>
          </li>
        ))}
        {(recargos ?? []).length === 0 && (
          <li>
            <span>La IA aún no detecta recargos: sube el documento de la propuesta.</span>
          </li>
        )}
      </ul>

      <ul className="sub-lista">
        {(notas ?? []).map((nota) => (
          <li key={nota.id}>
            <strong>{nota.texto}</strong>
            <button
              type="button"
              className="boton-peligro"
              onClick={() => eliminarNota.mutate({ id: nota.id })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="acciones">
        <input
          value={textoNota}
          onChange={(event) => setTextoNota(event.target.value)}
          placeholder="Nueva nota"
          aria-label="Nueva nota sobre la propuesta"
          style={{ maxWidth: '320px' }}
        />
        <button
          type="button"
          className="boton-fantasma"
          disabled={textoNota.trim().length < 1 || crearNota.isPending}
          onClick={() => crearNota.mutate({ propuestaId: propuesta.id, texto: textoNota.trim() })}
        >
          Añadir nota
        </button>
      </div>

      <ul className="sub-lista">
        {(estatuses ?? []).map((item) => (
          <li key={item.id}>
            <strong>
              Estado <span className="badge">código {item.estado}</span>
            </strong>
            <span>
              {item.comentario ?? 'sin comentario'}
              <button
                type="button"
                className="boton-peligro"
                style={{ marginLeft: '0.6rem' }}
                onClick={() => eliminarEstatus.mutate({ id: item.id })}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="acciones">
        <input
          value={nuevoEstado}
          onChange={(event) => setNuevoEstado(event.target.value)}
          placeholder="Estado (número)"
          style={{ maxWidth: '160px' }}
        />
        <input
          value={nuevoComentario}
          onChange={(event) => setNuevoComentario(event.target.value)}
          placeholder="Comentario (opcional)"
          style={{ maxWidth: '280px' }}
        />
        <button
          type="button"
          className="boton-fantasma"
          disabled={nuevoEstado.trim().length === 0 || crearEstatus.isPending}
          onClick={() => {
            const estado = Number(nuevoEstado);
            if (!Number.isInteger(estado)) {
              setError('El estado debe ser un número entero.');
              return;
            }

            crearEstatus.mutate({
              propuestaId: propuesta.id,
              estado,
              ...(nuevoComentario.trim() ? { comentario: nuevoComentario.trim() } : {}),
            });
          }}
        >
          Añadir estatus
        </button>
      </div>
    </form>
  );
}

function ChatDelProyecto({ proyectoId }: { proyectoId: string }) {
  const [mensajes, setMensajes] = useState<
    Array<{
      id: string;
      rol: 'usuario' | 'asistente';
      texto: string;
      fuentes?: Array<{ id: string; titulo: string | null; tipo: string }>;
    }>
  >([]);
  const [pregunta, setPregunta] = useState('');
  const [error, setError] = useState<string | null>(null);

  const preguntar = useMutation(
    orpc.chat.ask.mutationOptions({
      onSuccess: (respuesta) => {
        setPregunta('');
        setError(null);
        setMensajes((previos) => [
          ...previos,
          {
            id: crypto.randomUUID(),
            rol: 'asistente',
            texto: respuesta.respuesta,
            fuentes: respuesta.fuentes.map((fuente) => ({
              id: fuente.id,
              titulo: fuente.titulo,
              tipo: fuente.tipo,
            })),
          },
        ]);
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  function enviar(event: FormEvent) {
    event.preventDefault();

    const texto = pregunta.trim();
    if (texto.length < 3) {
      return;
    }

    setMensajes((previos) => [...previos, { id: crypto.randomUUID(), rol: 'usuario', texto }]);
    preguntar.mutate({ proyectoId, pregunta: texto });
  }

  return (
    <form className="form-panel" onSubmit={enviar}>
      <h2>Chat con la IA del proyecto</h2>

      <div className="stack">
        {mensajes.map((mensaje) => (
          <div className={`chat-bubble chat-bubble--${mensaje.rol}`} key={mensaje.id}>
            <strong>{mensaje.rol === 'usuario' ? 'Tú' : 'Asistente'}</strong>
            <p>{mensaje.texto}</p>
            {mensaje.fuentes && mensaje.fuentes.length > 0 && (
              <p className="chat-fuentes">
                Fuentes:{' '}
                {mensaje.fuentes
                  .map((fuente) => `${fuente.titulo ?? 'sin título'} (${fuente.tipo})`)
                  .join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="field">
        <label htmlFor="chat-pregunta">Pregunta</label>
        <input
          id="chat-pregunta"
          value={pregunta}
          onChange={(event) => setPregunta(event.target.value)}
          placeholder="¿Cuál ha sido el costo promedio de este proveedor? ¿Qué requisitos exige el pliego?"
        />
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" disabled={preguntar.isPending || pregunta.trim().length < 3}>
        {preguntar.isPending ? 'Consultando a la IA…' : 'Preguntar'}
      </button>
    </form>
  );
}

function ConocimientoPanel({
  chunks,
}: {
  chunks: Array<{ id: string; titulo: string | null; tipo: string; contenido: string }>;
}) {
  return (
    <form className="form-panel" onSubmit={(event) => event.preventDefault()}>
      <h2>Conocimiento vectorizado ({chunks.length} fragmentos)</h2>
      <ul className="sub-lista">
        {chunks.map((chunk) => (
          <li key={chunk.id}>
            <strong>
              {chunk.titulo ?? 'sin título'} <span className="badge">{chunk.tipo}</span>
            </strong>
            <span>{chunk.contenido.slice(0, 140)}…</span>
          </li>
        ))}
        {chunks.length === 0 && (
          <li>
            <span>Sin fragmentos: sube documentos para llenar la base.</span>
          </li>
        )}
      </ul>
    </form>
  );
}
