import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { messageOf } from '../../lib/errors';
import { orpc } from '../../lib/orpc';
import type { Proveedor } from '@repo/contracts';

interface MensajeChat {
  id: string;
  rol: 'usuario' | 'asistente';
  texto: string;
  fuentes?: Array<{ id: string; titulo: string | null; tipo: string }>;
}

export const Route = createFileRoute('/_authed/proyectos/$id')({
  component: ProyectoDetallePage,
});

function ProyectoDetallePage() {
  const { id } = Route.useParams();
  const { data: proyectos } = useQuery(orpc.proyectos.list.queryOptions());
  const { data: proveedores } = useQuery(orpc.proveedores.list.queryOptions());
  const { data: propuestas } = useQuery(
    orpc.propuestas.list.queryOptions({ input: { proyectoId: id } }),
  );
  const { data: documentos } = useQuery(
    orpc.documentos.list.queryOptions({ input: { proyectoId: id } }),
  );

  const proyecto = (proyectos ?? []).find((item) => item.id === id);

  if (!proyecto) {
    return (
      <section className="stack">
        <p className="lede">Proyecto no encontrado.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <p className="eyebrow">Proyecto</p>
      <h1>{proyecto.nombre}</h1>
      <p className="lede">{proyecto.descripcion ?? 'Sin descripción'}</p>

      <ProveedoresDelProyecto proveedores={proveedores ?? []} />
      <PropuestasDelProyecto
        proyectoId={id}
        proveedores={proveedores ?? []}
        propuestas={propuestas ?? []}
      />
      <DocumentosDelProyecto
        proyectoId={id}
        proveedores={proveedores ?? []}
        documentos={documentos ?? []}
      />
      <ChatDelProyecto proyectoId={id} />
    </section>
  );
}

function ProveedoresDelProyecto({ proveedores }: { proveedores: Proveedor[] }) {
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
          placeholder="Constructora Andina S.A."
          required
        />
      </div>
      <div className="field">
        <label htmlFor="proveedor-contacto">Contacto (opcional)</label>
        <input
          id="proveedor-contacto"
          value={contacto}
          onChange={(event) => setContacto(event.target.value)}
          placeholder="correo@proveedor.com"
        />
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" disabled={crear.isPending || nombre.trim().length === 0}>
        {crear.isPending ? 'Registrando…' : 'Registrar proveedor'}
      </button>
      <p className="lede">
        Proveedores registrados: {(proveedores ?? []).length === 0 ? 'ninguno' : ''}
      </p>
      <ul className="user-list">
        {(proveedores ?? []).map((proveedor) => (
          <li key={proveedor.id}>
            <div>
              <strong>{proveedor.nombre}</strong>
              <span>{proveedor.contacto ?? 'Sin contacto'}</span>
            </div>
          </li>
        ))}
      </ul>
    </form>
  );
}

function PropuestasDelProyecto({
  proyectoId,
  proveedores,
  propuestas,
}: {
  proyectoId: string;
  proveedores: Proveedor[];
  propuestas: Array<{ id: string; proveedorId: string; monto: string | null; createdAt: string }>;
}) {
  const queryClient = useQueryClient();
  const [proveedorId, setProveedorId] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation(
    orpc.propuestas.create.mutationOptions({
      onSuccess: () => {
        setMonto('');
        setError(null);
        return queryClient.invalidateQueries({
          queryKey: orpc.propuestas.list.queryKey({ input: { proyectoId } }),
        });
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  const nombreDe = (id: string) =>
    proveedores.find((proveedor) => proveedor.id === id)?.nombre ?? id;

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        crear.mutate({
          proyectoId,
          proveedorId,
          ...(monto.trim() ? { monto: monto.trim() } : {}),
        });
      }}
    >
      <h2>Propuesta</h2>
      <div className="field">
        <label htmlFor="propuesta-proveedor">Proveedor</label>
        <select
          id="propuesta-proveedor"
          value={proveedorId}
          onChange={(event) => setProveedorId(event.target.value)}
          required
        >
          <option value="" disabled>
            Selecciona un proveedor
          </option>
          {proveedores.map((proveedor) => (
            <option key={proveedor.id} value={proveedor.id}>
              {proveedor.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="propuesta-monto">Monto (opcional, ej. 125000.00)</label>
        <input
          id="propuesta-monto"
          value={monto}
          onChange={(event) => setMonto(event.target.value)}
          inputMode="decimal"
          placeholder="125000.00"
        />
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" disabled={crear.isPending || proveedorId === ''}>
        {crear.isPending ? 'Creando…' : 'Crear propuesta'}
      </button>

      <ul className="user-list">
        {propuestas.map((propuesta) => (
          <li key={propuesta.id}>
            <div>
              <strong>{nombreDe(propuesta.proveedorId)}</strong>
              <span>{propuesta.monto ? `Monto: ${propuesta.monto}` : 'Sin monto'}</span>
            </div>
            <time dateTime={propuesta.createdAt}>
              {new Date(propuesta.createdAt).toLocaleDateString()}
            </time>
          </li>
        ))}
      </ul>
    </form>
  );
}

function DocumentosDelProyecto({
  proyectoId,
  proveedores,
  documentos,
}: {
  proyectoId: string;
  proveedores: Proveedor[];
  documentos: Array<{
    id: string;
    nombre: string;
    mime: string;
    tamanoBytes: number;
    createdAt: string;
  }>;
}) {
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [proveedorId, setProveedorId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const subir = useMutation(
    orpc.documentos.upload.mutationOptions({
      onSuccess: () => {
        setArchivo(null);
        setError(null);
        return queryClient.invalidateQueries({
          queryKey: orpc.documentos.list.queryKey({ input: { proyectoId } }),
        });
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
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

    const contenidoBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const resultado = String(reader.result);
        resolve(resultado.slice(resultado.indexOf(',') + 1));
      });
      reader.addEventListener('error', () => reject(new Error('No se pudo leer el archivo')));
      reader.readAsDataURL(archivo);
    });

    subir.mutate({
      proyectoId,
      nombre: archivo.name,
      mime,
      contenidoBase64,
      ...(proveedorId ? { proveedorId } : {}),
    });
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <h2>Documentos</h2>
      <p className="lede">
        PDFs e imágenes se guardan en PostgreSQL, se trocean y se vectorizan (bge-m3) dentro de la
        base de conocimiento del proyecto. Si eliges un proveedor, su historial de costos se
        reconstruye y también queda vectorizado.
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
      {error && <p className="field-error">{error}</p>}
      <button type="submit" disabled={subir.isPending || !archivo}>
        {subir.isPending ? 'Procesando documento…' : 'Subir y vectorizar'}
      </button>

      <ul className="user-list">
        {documentos.map((documento) => (
          <li key={documento.id}>
            <div>
              <strong>{documento.nombre}</strong>
              <span>
                {documento.mime} · {(documento.tamanoBytes / 1024).toFixed(0)} KB
              </span>
            </div>
            <time dateTime={documento.createdAt}>
              {new Date(documento.createdAt).toLocaleDateString()}
            </time>
          </li>
        ))}
      </ul>
    </form>
  );
}

function ChatDelProyecto({ proyectoId }: { proyectoId: string }) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
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
    preguntar.mutate({
      proyectoId,
      pregunta: texto,
    });
  }

  return (
    <form className="form-panel" onSubmit={(event) => enviar(event)}>
      <h2>Chat con la IA del proyecto</h2>
      <p className="lede">
        La IA responde usando los documentos vectorizados del proyecto y el historial de costos de
        sus proveedores. Nunca consulta conocimiento de otros proyectos.
      </p>

      <div className="stack">
        {mensajes.map((mensaje) => (
          <div className="chat-bubble" key={mensaje.id}>
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
