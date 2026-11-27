import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { UserForm } from '../components/UserForm';
import { orpc } from '../lib/orpc';

export const Route = createFileRoute('/users')({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.users.list.queryOptions()),
  component: UsersPage,
});

function UsersPage() {
  const { data: users } = useSuspenseQuery(orpc.users.list.queryOptions());

  return (
    <section className="stack">
      <p className="eyebrow">End-to-end example</p>
      <h1>Users</h1>
      <p className="lede">
        This list and form share <code>createUserSchema</code> with the server contract. There is no
        separate DTO or validation copy.
      </p>

      <UserForm />

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
