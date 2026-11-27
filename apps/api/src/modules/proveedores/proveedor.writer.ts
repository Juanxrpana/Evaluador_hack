import type { CreateProveedorInput } from './proveedor.reader.ts';

export interface ProveedorWriter {
  create(input: CreateProveedorInput): Promise<{ id: string }>;
}
