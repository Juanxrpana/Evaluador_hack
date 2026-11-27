import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { SystemShell } from '../components/SystemShell';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NoEncontrado,
});

function RootLayout() {
  return (
    <SystemShell>
      <Outlet />
    </SystemShell>
  );
}

function NoEncontrado() {
  return (
    <section className="vacio">
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a ninguna sección del sistema.</p>
      <Link to="/proyectos" className="btn btn--primary">
        Ir a proyectos
      </Link>
    </section>
  );
}
