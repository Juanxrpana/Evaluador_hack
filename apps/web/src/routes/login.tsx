import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { SignInForm } from '../components/AuthForm';
import { sessionQueryOptions } from '../lib/session';

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (session) {
      throw redirect({ to: '/users' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <section className="stack auth-page">
      <p className="eyebrow">Welcome back</p>
      <h1>Sign in</h1>
      <p className="lede">
        Better Auth manages the password hash, session cookie, CSRF checks, and session rotation.
        This app only owns the form and the database tables.
      </p>

      <SignInForm />

      <p className="auth-switch">
        No account? <Link to="/signup">Create one</Link>.
      </p>
    </section>
  );
}
