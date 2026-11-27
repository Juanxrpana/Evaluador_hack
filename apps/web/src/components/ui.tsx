import type { ReactNode } from 'react';

export type Tono = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export function Badge({
  tone = 'neutral',
  vivo = false,
  children,
}: {
  tone?: Tono;
  vivo?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`badge badge--${tone}${vivo ? ' badge--vivo' : ''}`}>
      <span className="badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function PageHead({
  title,
  lede,
  actions,
}: {
  title: string;
  lede: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head__copy">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  aside,
  children,
  className = '',
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      {title || aside ? (
        <header className="panel__head">
          {title ? <h2>{title}</h2> : <span />}
          {aside}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="vacio">{children}</div>;
}
