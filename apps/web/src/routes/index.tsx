import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { orpc } from '../lib/orpc';

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.health.queryOptions()),
  component: OverviewPage,
});

function OverviewPage() {
  const { data } = useSuspenseQuery(orpc.health.queryOptions());

  return (
    <section className="stack">
      <p className="eyebrow">Contract-first starter</p>
      <h1>The stack is running</h1>
      <p className="lede">
        Express, Better Auth, oRPC, TanStack Router, TanStack Query, React Hook Form, and Zod are
        wired together. The health value below came through the typed oRPC client; the Users page is
        protected by a Better Auth session.
      </p>

      <dl className="status-grid">
        <div>
          <dt>API status</dt>
          <dd>{data.status}</dd>
        </div>
        <div>
          <dt>Uptime</dt>
          <dd>{data.uptime.toFixed(1)}s</dd>
        </div>
        <div>
          <dt>Last check</dt>
          <dd>{new Date(data.timestamp).toLocaleString()}</dd>
        </div>
      </dl>

      <p>
        Open the <Link to="/users">Users</Link> page after signing in to see the protected list and
        the session-aware oRPC context.
      </p>
    </section>
  );
}
