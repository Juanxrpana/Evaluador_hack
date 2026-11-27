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

  const crear = useMutation(
    orpc.proyectos.create.mutationOptions({
      onSuccess: () => {
        setNombre('');
        setDescripcion('');
        setError(null);
        return queryClient.invalidateQueries({ queryKey: orpc.proyectos.list.queryKey() });
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
          <li key={proyecto.id}>
            <div>
              <strong>
                <Link to="/proyectos/$id" params={{ id: proyecto.id }}>
                  {proyecto.nombre}
                </Link>
              </strong>
              <span>{proyecto.descripcion ?? 'Sin descripción'}</span>
            </div>
            <time dateTime={proyecto.createdAt}>
              {new Date(proyecto.createdAt).toLocaleDateString()}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
