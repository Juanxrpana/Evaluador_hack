import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { authClient } from '../lib/auth-client';
import { sessionQueryOptions } from '../lib/session';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = useQuery(sessionQueryOptions);

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    queryClient.setQueryData(sessionQueryOptions.queryKey, null);
    await navigate({ to: '/' });
  }

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          Monorepo
        </Link>
        <nav className="app-nav">
          <Link to="/proyectos" activeProps={{ className: 'active' }}>
            Proyectos
          </Link>
          <Link to="/proveedores" activeProps={{ className: 'active' }}>
            Proveedores
          </Link>
          <Link to="/users" activeProps={{ className: 'active' }}>
            Users
          </Link>

          {session ? (
            <>
              <span className="session-name">{session.user.name}</span>
              <button type="button" className="nav-button" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            !isPending && (
              <>
                <Link to="/login" activeProps={{ className: 'active' }}>
                  Sign in
                </Link>
                <Link to="/signup" activeProps={{ className: 'active' }}>
                  Create account
                </Link>
              </>
            )
          )}
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
