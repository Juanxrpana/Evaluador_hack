import type { ContractRouterClient } from '@orpc/contract';
import { contract } from './contract.ts';

export { contract, type ApiContract } from './contract.ts';
export * from './schemas/health.ts';
export * from './schemas/user.ts';
export * from './schemas/evaluador.ts';

export type ApiClient = ContractRouterClient<typeof contract>;
