import type { Proveedor, ProveedorHistorial } from '@repo/contracts';

export interface ProveedorReader {
  list(): Promise<Proveedor[]>;
  get(id: string): Promise<Proveedor | null>;
  historial(id: string): Promise<ProveedorHistorial | null>;
}

export interface CreateProveedorInput {
  nombre: string;
  contacto?: string;
  rif?: string;
  ubicacion?: string;
}

export interface UpdateProveedorInput {
  nombre?: string;
  contacto?: string | null | undefined;
  rif?: string | null | undefined;
  ubicacion?: string | null | undefined;
}
