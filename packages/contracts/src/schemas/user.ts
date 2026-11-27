import { z } from 'zod';

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  createdAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;
