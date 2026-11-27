import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUserSchema, type CreateUserInput } from '@repo/contracts';
import { useForm } from 'react-hook-form';
import { orpc } from '../lib/orpc';

export function UserForm() {
  const queryClient = useQueryClient();
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const createUser = useMutation(
    orpc.users.create.mutationOptions({
      onSuccess: async () => {
        form.reset();
        await queryClient.invalidateQueries({ queryKey: orpc.users.key() });
      },
    }),
  );

  return (
    <form className="user-form" onSubmit={form.handleSubmit((values) => createUser.mutate(values))}>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" autoComplete="name" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="field-error">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" {...form.register('email')} />
        {form.formState.errors.email && (
          <p className="field-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      {createUser.error && <p className="field-error">{createUser.error.message}</p>}

      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating…' : 'Create user'}
      </button>
    </form>
  );
}
