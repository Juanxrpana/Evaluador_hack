import type { Conocimiento } from '@repo/contracts';

export interface ConocimientoListReader {
  listByProyecto(proyectoId: string): Promise<Conocimiento[]>;
}

export interface ConocimientoListService {
  listByProyecto(proyectoId: string): Promise<Conocimiento[]>;
}
