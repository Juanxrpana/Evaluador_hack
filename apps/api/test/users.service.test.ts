import type { CreateUserInput, User } from '@repo/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { AuditRecord, AuditWriter } from '../src/modules/audit/audit.repository.ts';
import { UserService } from '../src/modules/users/user.service.ts';
import type { UserTransactionRunner } from '../src/modules/users/user.transaction.ts';
import type { UserWriter } from '../src/modules/users/user.writer.ts';

const user: User = {
  id: '6f1b6a3e-6f4f-4f7a-9a3e-2f2f2f2f2f2f',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  createdAt: '2026-11-27T12:00:00.000Z',
};

const input: CreateUserInput = {
  name: 'Grace Hopper',
  email: 'grace@example.com',
};

function createRunner(users: UserWriter, audit: AuditWriter): UserTransactionRunner {
  return async (work) => work({ users, audit });
}

describe('UserService', () => {
  it('lists users through the read port', async () => {
    const list = vi.fn(async () => [user]);
    const service = new UserService(
      { list },
      createRunner(
        { create: vi.fn(async () => user) },
        { record: vi.fn(async (_event: AuditRecord) => {}) },
      ),
    );

    await expect(service.list()).resolves.toEqual([user]);
    expect(list).toHaveBeenCalledOnce();
  });

  it('creates the user and audit row in one transaction', async () => {
    const create = vi.fn(async (_input: CreateUserInput) => user);
    const record = vi.fn(async (_event: AuditRecord) => {});
    const service = new UserService(
      { list: vi.fn(async () => []) },
      createRunner({ create }, { record }),
    );

    await expect(service.create(input)).resolves.toEqual(user);

    expect(create).toHaveBeenCalledWith(input);
    expect(record).toHaveBeenCalledWith({
      action: 'user.create',
      resource: 'user',
      resourceId: user.id,
    });
  });

  it('does not write an audit row when the user write fails', async () => {
    const error = new Error('user insert failed');
    const record = vi.fn(async (_event: AuditRecord) => {});
    const service = new UserService(
      { list: vi.fn(async () => []) },
      createRunner(
        {
          create: vi.fn(async (_input: CreateUserInput): Promise<User> => {
            throw error;
          }),
        },
        { record },
      ),
    );

    await expect(service.create(input)).rejects.toBe(error);
    expect(record).not.toHaveBeenCalled();
  });

  it('propagates an audit failure so the transaction can roll back', async () => {
    const error = new Error('audit insert failed');
    const service = new UserService(
      { list: vi.fn(async () => []) },
      createRunner(
        { create: vi.fn(async (_input: CreateUserInput) => user) },
        {
          record: vi.fn(async (_event: AuditRecord): Promise<void> => {
            throw error;
          }),
        },
      ),
    );

    await expect(service.create(input)).rejects.toBe(error);
  });
});
