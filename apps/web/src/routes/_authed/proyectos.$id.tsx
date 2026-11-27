import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import type { Propuesta, Proveedor } from '@repo/contracts';
import { messageOf } from '../../lib/errors';
import { monto as montoTexto } from '../../lib/format';
import { orpc } from '../../lib/orpc';

export const Route = createFileRoute('/_authed/proyectos/$id')({
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
        <ProveedoresPanel proveedores={proveedores ?? []} />
        <DocumentosPanel
          proyectoId={id}
          propuestas={propuestas ?? []}
          proveedores={proveedores ?? []}
          documentos={documentos ?? []}
          onChanged={invalidar}
        />
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
  const [archivo, setArchivo] = useState<File | null>(null);
  const [propuestaId, setPropuestaId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const subir = useMutation(
    orpc.documentos.upload.mutationOptions({
      onSuccess: (respuesta) => {
        setArchivo(null);
        setError(null);
        setResultado(
          respuesta.extraccion
            ? `Lectura completada: monto ${
                respuesta.extraccion.montoTotal
                  ? montoTexto(respuesta.extraccion.montoTotal)
                  : 'no detectado'
              }; ${respuesta.extraccion.recargos} recargos registrados.`
            : 'Documento guardado. La extracción no devolvió un monto.',
        );
        return onChanged();
      },
      onError: (cause) => {
        setResultado(null);
        setError(messageOf(cause));
      },
    }),
  );

  const eliminar = useMutation(
    orpc.documentos.delete.mutationOptions({ onSuccess: () => onChanged() }),
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!archivo) {
      return;
    }

    const mimesAceptados = ['application/pdf', 'image/png', 'image/jpeg'] as const;
    const mime = mimesAceptados.find((aceptado) => aceptado === archivo.type);

    if (!mime) {
      setError('Solo se aceptan archivos PDF, PNG o JPG.');
      return;
    }

    setError(null);
    setResultado(null);

    const contenidoBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const contenidoLeido = String(reader.result);
        resolve(contenidoLeido.slice(contenidoLeido.indexOf(',') + 1));
      });
      reader.addEventListener('error', () => reject(new Error('No se pudo leer el archivo')));
      reader.readAsDataURL(archivo);
    });

    const propuestaElegida = propuestas.find((item) => item.id === propuestaId);

    subir.mutate({
      proyectoId,
      nombre: archivo.name,
      mime,
      contenidoBase64,
      // Si la propuesta tiene proveedor, se hereda automáticamente.
      ...(propuestaElegida
        ? { propuestaId, proveedorId: propuestaElegida.proveedorId }
        : proveedorId
          ? { proveedorId }
          : {}),
    });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h2>Documentos</h2>
      <p className="lede">
        PDFs e imágenes se guardan en PostgreSQL y se vectorizan (bge-m3). Si lo vinculas a una
        propuesta, la IA extrae el monto ofertado y los recargos cobrados aparte.
      </p>
      <div className="field">
        <label htmlFor="documento-archivo">Archivo (PDF, PNG o JPG)</label>
        <input
          id="documento-archivo"
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
        />
      </div>
      <div className="field">
        <label htmlFor="documento-propuesta">Vincular a propuesta (opcional)</label>
        <select
          id="documento-propuesta"
          value={propuestaId}
          onChange={(event) => setPropuestaId(event.target.value)}
        >
          <option value="">Sin propuesta (solo conocimiento)</option>
          {propuestas.map((propuesta) => (
            <option key={propuesta.id} value={propuesta.id}>
              {proveedores.find((proveedor) => proveedor.id === propuesta.proveedorId)?.nombre ??
                propuesta.id}
            </option>
          ))}
        </select>
      </div>
      {!propuestaId && (
        <div className="field">
          <label htmlFor="documento-proveedor">Proveedor del documento (opcional)</label>
          <select
            id="documento-proveedor"
            value={proveedorId}
            onChange={(event) => setProveedorId(event.target.value)}
          >
            <option value="">Sin proveedor</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
      <button type="submit" disabled={subir.isPending || !archivo}>
        {subir.isPending ? 'Procesando documento…' : 'Subir y vectorizar'}
      </button>

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
          placeholder="Monto base (ej. 125000.00)"
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
          placeholder="Nueva nota sobre la propuesta"
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
