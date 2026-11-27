import type { Recargo } from '@repo/contracts';

export interface RecargoReader {
  listByPropuesta(propuestaId: string): Promise<Recargo[]>;
}
