import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          Monorepo
        </Link>
        <nav className="app-nav">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'active' }}>
            Overview
          </Link>
          <Link to="/users" activeProps={{ className: 'active' }}>
            Users
          </Link>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </>
      )}
    </>
  );
}
