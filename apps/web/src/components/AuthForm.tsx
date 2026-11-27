import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authClient } from '../lib/auth-client';

const signInSchema = z.object({
  email: z.email('Escribe un correo válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const signUpSchema = signInSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe tu nombre.')
    .max(100, 'El nombre no puede superar 100 caracteres.'),
});

type SignInInput = z.infer<typeof signInSchema>;
type SignUpInput = z.infer<typeof signUpSchema>;

function mensajeAuth(mensaje: string | undefined, alterno: string): string {
  if (!mensaje) return alterno;
  const texto = mensaje.toLowerCase();

  if (texto.includes('invalid email or password')) {
    return 'El correo o la contraseña no coinciden.';
  }
  if (texto.includes('user already exists')) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (texto.includes('password') && (texto.includes('short') || texto.includes('least'))) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }

  return alterno;
}

export function SignInForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signIn = useMutation({
    mutationFn: async (values: SignInInput) => {
      const { error } = await authClient.signIn.email(values);

      if (error) {
        throw new Error(
          mensajeAuth(error.message, 'No se pudo iniciar sesión. Inténtalo de nuevo.'),
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      await navigate({ to: '/proyectos' });
    },
  });

  return (
    <form className="form-panel" onSubmit={form.handleSubmit((values) => signIn.mutate(values))}>
      <div className="field">
        <label htmlFor="sign-in-email">Correo</label>
        <input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          placeholder="nombre@laboratorio.com"
          required
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="field-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="sign-in-password">Contraseña</label>
        <input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          placeholder="Mínimo 8 caracteres"
          required
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="field-error">{form.formState.errors.password.message}</p>
        )}
      </div>

      {signIn.error && <p className="field-error">{signIn.error.message}</p>}

      <button type="submit" disabled={signIn.isPending}>
        {signIn.isPending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

export function SignUpForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const signUp = useMutation({
    mutationFn: async (values: SignUpInput) => {
      const { error } = await authClient.signUp.email(values);

      if (error) {
        throw new Error(
          mensajeAuth(error.message, 'No se pudo crear la cuenta. Inténtalo de nuevo.'),
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      await navigate({ to: '/proyectos' });
    },
  });

  return (
    <form className="form-panel" onSubmit={form.handleSubmit((values) => signUp.mutate(values))}>
      <div className="field">
        <label htmlFor="sign-up-name">Nombre</label>
        <input
          id="sign-up-name"
          autoComplete="name"
          placeholder="Ana Pérez"
          required
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="field-error">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="sign-up-email">Correo</label>
        <input
          id="sign-up-email"
          type="email"
          autoComplete="email"
          placeholder="nombre@laboratorio.com"
          required
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="field-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="sign-up-password">Contraseña</label>
        <input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          required
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="field-error">{form.formState.errors.password.message}</p>
        )}
      </div>

      {signUp.error && <p className="field-error">{signUp.error.message}</p>}

      <button type="submit" disabled={signUp.isPending}>
        {signUp.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}
