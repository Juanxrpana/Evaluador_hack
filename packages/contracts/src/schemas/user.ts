import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
});

export const userSchema = createUserSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type User = z.infer<typeof userSchema>;
