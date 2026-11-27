import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { SignUpForm } from '../components/AuthForm';
import { sessionQueryOptions } from '../lib/session';

export const Route = createFileRoute('/signup')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (session) {
      throw redirect({ to: '/users' });
    }
  },
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <section className="stack auth-page">
      <p className="eyebrow">Create an account</p>
      <h1>Sign up</h1>
      <p className="lede">
        Email and password only for now. The same account table can hold OAuth providers later
        without another schema migration.
      </p>

      <SignUpForm />

      <p className="auth-switch">
        Already registered? <Link to="/login">Sign in</Link>.
      </p>
    </section>
  );
}
