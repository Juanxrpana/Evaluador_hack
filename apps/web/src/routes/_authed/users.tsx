import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PageHead, Panel } from '../../components/ui';
import { fecha } from '../../lib/format';
import { orpc } from '../../lib/orpc';

export const Route = createFileRoute('/_authed/users')({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.users.list.queryOptions()),
  component: UsersPage,
});

function UsersPage() {
  const { data: users } = useSuspenseQuery(orpc.users.list.queryOptions());

  return (
    <div className="stack">
      <PageHead
        title="Usuarios"
        lede="Cuentas registradas en el sistema. Cada sesión queda asociada a las acciones que registra."
      />

      <Panel
        title="Cuentas"
        aside={
          <span className="panel__meta">
            {users.length} {users.length === 1 ? 'registrada' : 'registradas'}
          </span>
        }
      >
        <ul className="user-list">
          {users.map((user) => (
            <li key={user.id}>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <time dateTime={user.createdAt}>{fecha(user.createdAt)}</time>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
