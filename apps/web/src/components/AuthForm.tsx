import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authClient } from '../lib/auth-client';

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(1).max(100),
});

type SignInInput = z.infer<typeof signInSchema>;
type SignUpInput = z.infer<typeof signUpSchema>;

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
        throw new Error(error.message ?? 'Unable to sign in.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      await navigate({ to: '/users' });
    },
  });

  return (
    <form className="form-panel" onSubmit={form.handleSubmit((values) => signIn.mutate(values))}>
      <div className="field">
        <label htmlFor="sign-in-email">Email</label>
        <input id="sign-in-email" type="email" autoComplete="email" {...form.register('email')} />
        {form.formState.errors.email && (
          <p className="field-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="sign-in-password">Password</label>
        <input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="field-error">{form.formState.errors.password.message}</p>
        )}
      </div>

      {signIn.error && <p className="field-error">{signIn.error.message}</p>}

      <button type="submit" disabled={signIn.isPending}>
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
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
        throw new Error(error.message ?? 'Unable to create the account.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      await navigate({ to: '/users' });
    },
  });

  return (
    <form className="form-panel" onSubmit={form.handleSubmit((values) => signUp.mutate(values))}>
      <div className="field">
        <label htmlFor="sign-up-name">Name</label>
        <input id="sign-up-name" autoComplete="name" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="field-error">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="sign-up-email">Email</label>
        <input id="sign-up-email" type="email" autoComplete="email" {...form.register('email')} />
        {form.formState.errors.email && (
          <p className="field-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="sign-up-password">Password</label>
        <input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="field-error">{form.formState.errors.password.message}</p>
        )}
      </div>

      {signUp.error && <p className="field-error">{signUp.error.message}</p>}

      <button type="submit" disabled={signUp.isPending}>
        {signUp.isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
