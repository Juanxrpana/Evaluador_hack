import type { CreateProveedorInput, UpdateProveedorInput } from './proveedor.reader.ts';

export interface ProveedorWriter {
  create(input: CreateProveedorInput): Promise<{ id: string }>;
  update(id: string, input: UpdateProveedorInput): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}
