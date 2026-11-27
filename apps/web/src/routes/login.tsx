import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { PageHead } from '../components/ui';
import { SignInForm } from '../components/AuthForm';
import { sessionQueryOptions } from '../lib/session';

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (session) {
      throw redirect({ to: '/proyectos' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <section className="stack auth-page">
      <PageHead
        title="Iniciar sesión"
        lede="Accede para gestionar proyectos, proveedores y propuestas del laboratorio."
      />

      <SignInForm />

      <p className="auth-switch">
        ¿No tienes cuenta? <Link to="/signup">Crear una</Link>.
      </p>
    </section>
  );
}
