import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { messageOf } from '../../lib/errors';
import { orpc } from '../../lib/orpc';

const PESTANAS = [
  { to: '/proyectos/$id', label: 'Resumen y chat', exacto: true },
  { to: '/proyectos/$id/informe', label: 'Informe y ranking', exacto: false },
] as const;

export const Route = createFileRoute('/_authed/proyectos/$id')({
  component: LayoutProyecto,
});

function LayoutProyecto() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const ruta = useRouterState({ select: (state) => state.location.pathname });
  const [error, setError] = useState<string | null>(null);

  const lanzar = useMutation(
    orpc.evaluaciones.lanzar.mutationOptions({
      onSuccess: () => {
        setError(null);
        void navigate({ to: '/proyectos/$id/informe', params: { id } });
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  return (
    <div className="proyecto-detalle">
      <nav className="subnav" aria-label="Secciones del proyecto">
        <Link to="/proyectos" className="subnav__volver" title="Volver a los proyectos">
          ←
        </Link>

        {PESTANAS.map((pestana) => {
          const activa = pestana.exacto
            ? ruta === `/proyectos/${id}` || ruta === `/proyectos/${id}/`
            : ruta.startsWith(`/proyectos/${id}/informe`);

          return (
            <Link
              key={pestana.label}
              to={pestana.to}
              params={{ id }}
              className={activa ? 'subnav__tab is-active' : 'subnav__tab'}
            >
              {pestana.label}
            </Link>
          );
        })}

        <button
          type="button"
          className="subnav__evaluar"
          title="Lanzar la evaluación agéntica: ranking, costos reales y dictámenes"
          disabled={lanzar.isPending}
          onClick={() => lanzar.mutate({ proyectoId: id })}
        >
          {lanzar.isPending ? 'Evaluando…' : '⚡ Evaluar propuestas'}
        </button>
      </nav>

      {error && <p className="field-error">{error}</p>}

      <Outlet />
    </div>
  );
}
