import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { authClient } from '../lib/auth-client';
import { sessionQueryOptions } from '../lib/session';
import { useTema } from '../lib/theme';
import { MarkIcon, MoonIcon, SunIcon } from './Icons';

const NAV = [
  { to: '/proyectos', label: 'Proyectos' },
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/users', label: 'Usuarios' },
] as const;

export function SystemShell({ children }: { children: ReactNode }) {
  const { tema, alternar } = useTema();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = useQuery(sessionQueryOptions);
  const ruta = useRouterState({ select: (state) => state.location.pathname });
  const enAcceso = ruta.startsWith('/login') || ruta.startsWith('/signup');

  async function salir() {
    await authClient.signOut();
    queryClient.clear();
    queryClient.setQueryData(sessionQueryOptions.queryKey, null);
    await navigate({ to: '/login' });
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <header className="topbar">
        <div className="topbar__inner">
          <Link
            to={session ? '/proyectos' : '/login'}
            className="brand"
            aria-label="Evaluador, ir al inicio"
          >
            <span className="brand__mark" aria-hidden="true">
              <MarkIcon />
            </span>
            <span className="brand__texto">
              <strong>Evaluador</strong>
              <small>Propuestas de laboratorio</small>
            </span>
          </Link>

          <div className="project-chip" title="Sistema de evaluación">
            <span className="project-chip__codigo">SISTEMA</span>
            <span className="project-chip__nombre">Evaluación de propuestas</span>
          </div>

          <nav className="nav" aria-label="Principal">
            {session
              ? NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="nav__link"
                    activeProps={{ className: 'nav__link is-active' }}
                  >
                    {item.label}
                  </Link>
                ))
              : null}
          </nav>

          <div className="topbar__actions">
            <button
              type="button"
              className="icon-btn"
              onClick={alternar}
              aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {tema === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {session ? (
              <>
                <span className="session-name">{session.user.name}</span>
                <button type="button" className="btn btn--ghost btn--small" onClick={salir}>
                  Salir
                </button>
              </>
            ) : (
              !isPending &&
              !enAcceso && (
                <Link to="/login" className="btn btn--primary btn--small">
                  Entrar
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      <main id="contenido" className="page">
        {children}
      </main>

      <footer className="footer">
        <p>
          Sistema de evaluación · Los documentos se envían a un servicio externo de lectura. No
          adjudica: ordena, explica y deja rastro.
        </p>
        <p className="footer__meta">
          Sesión con Better Auth · Documentos en PostgreSQL · Lectura asistida por IA
        </p>
      </footer>
    </div>
  );
}
