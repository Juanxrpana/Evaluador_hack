import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { PageHead } from '../components/ui';
import { SignUpForm } from '../components/AuthForm';
import { sessionQueryOptions } from '../lib/session';

export const Route = createFileRoute('/signup')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (session) {
      throw redirect({ to: '/proyectos' });
    }
  },
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <section className="stack auth-page">
      <PageHead
        title="Crear cuenta"
        lede="Nombre, correo y contraseña. La cuenta se usa para registrar proyectos y propuestas."
      />

      <SignUpForm />

      <p className="auth-switch">
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>.
      </p>
    </section>
  );
}
