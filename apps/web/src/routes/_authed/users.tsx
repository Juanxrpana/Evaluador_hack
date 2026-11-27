import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { orpc } from '../../lib/orpc';

export const Route = createFileRoute('/_authed/users')({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.users.list.queryOptions()),
  component: UsersPage,
});

function UsersPage() {
  const { data: users } = useSuspenseQuery(orpc.users.list.queryOptions());

  return (
    <section className="stack">
      <p className="eyebrow">Authenticated endpoint</p>
      <h1>Users</h1>
      <p className="lede">
        This list is served by a protected oRPC procedure. The API resolves the Better Auth session,
        rejects anonymous callers with 401, and attaches the actor to audit records.
      </p>

      <ul className="user-list">
        {users.map((user) => (
          <li key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <time dateTime={user.createdAt}>{new Date(user.createdAt).toLocaleString()}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
