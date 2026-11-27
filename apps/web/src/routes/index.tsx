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
        Express, oRPC, TanStack Router, TanStack Query, React Hook Form, and Zod are wired together.
        The health value below came through the typed oRPC client.
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
        Open the <Link to="/users">Users</Link> page to see one Zod schema used by the form, the API
        contract, and the client at the same time.
      </p>
    </section>
  );
}
