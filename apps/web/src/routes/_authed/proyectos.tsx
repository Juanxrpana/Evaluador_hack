import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { messageOf } from '../../lib/errors';
import { orpc } from '../../lib/orpc';

export const Route = createFileRoute('/_authed/proyectos')({
  component: ProyectosPage,
});

function ProyectosPage() {
  const queryClient = useQueryClient();
  const { data: proyectos } = useQuery(orpc.proyectos.list.queryOptions());
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: orpc.proyectos.list.queryKey() });

  const crear = useMutation(
    orpc.proyectos.create.mutationOptions({
      onSuccess: () => {
        setNombre('');
        setDescripcion('');
        setError(null);
        return invalidar();
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  return (
    <section className="stack">
      <p className="eyebrow">Evaluador</p>
      <h1>Proyectos</h1>
      <p className="lede">
        Cada proyecto tiene su propia base de conocimiento vectorizada: documentos subidos e
        historial de costos de sus proveedores.
      </p>

      <form
        className="form-panel"
        onSubmit={(event) => {
          event.preventDefault();
          crear.mutate({
            nombre,
            ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
          });
        }}
      >
        <div className="field">
          <label htmlFor="proyecto-nombre">Nombre</label>
          <input
            id="proyecto-nombre"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Rehabilitación red vial norte"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="proyecto-descripcion">Descripción (opcional)</label>
          <input
            id="proyecto-descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Alcance, ubicación, presupuesto base…"
          />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" disabled={crear.isPending || nombre.trim().length === 0}>
          {crear.isPending ? 'Creando…' : 'Crear proyecto'}
        </button>
      </form>

      <ul className="user-list">
        {(proyectos ?? []).map((proyecto) => (
          <FilaProyecto key={proyecto.id} proyecto={proyecto} onChanged={invalidar} />
        ))}
      </ul>
    </section>
  );
}

function FilaProyecto({
  proyecto,
  onChanged,
}: {
  proyecto: { id: string; nombre: string; descripcion: string | null; createdAt: string };
  onChanged: () => Promise<unknown> | unknown;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(proyecto.nombre);
  const [descripcion, setDescripcion] = useState(proyecto.descripcion ?? '');
  const [error, setError] = useState<string | null>(null);

  const actualizar = useMutation(
    orpc.proyectos.update.mutationOptions({
      onSuccess: () => {
        setEditando(false);
        setError(null);
        return onChanged();
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  const eliminar = useMutation(
    orpc.proyectos.delete.mutationOptions({
      onSuccess: () => onChanged(),
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  if (editando) {
    return (
      <li>
        <form
          className="stack"
          style={{ width: '100%' }}
          onSubmit={(event) => {
            event.preventDefault();
            actualizar.mutate({
              id: proyecto.id,
              nombre,
              ...(descripcion.trim() ? { descripcion: descripcion.trim() } : { descripcion: null }),
            });
          }}
        >
          <input value={nombre} onChange={(event) => setNombre(event.target.value)} required />
          <input
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Descripción"
          />
          {error && <p className="field-error">{error}</p>}
          <div className="acciones">
            <button type="submit" disabled={actualizar.isPending}>
              Guardar
            </button>
            <button type="button" className="boton-fantasma" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li>
      <div>
        <strong>
          <Link to="/proyectos/$id" params={{ id: proyecto.id }}>
            {proyecto.nombre}
          </Link>
        </strong>
        <span>{proyecto.descripcion ?? 'Sin descripción'}</span>
      </div>
      <div className="acciones">
        <button type="button" className="boton-fantasma" onClick={() => setEditando(true)}>
          Editar
        </button>
        <button
          type="button"
          className="boton-peligro"
          disabled={eliminar.isPending}
          onClick={() => {
            if (window.confirm(`¿Eliminar "${proyecto.nombre}" y todo su contenido?`)) {
              eliminar.mutate({ id: proyecto.id });
            }
          }}
        >
          {eliminar.isPending ? '…' : 'Eliminar'}
        </button>
        <time dateTime={proyecto.createdAt}>
          {new Date(proyecto.createdAt).toLocaleDateString()}
        </time>
      </div>
    </li>
  );
}
