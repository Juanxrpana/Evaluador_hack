import type { Documento } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toIsoString } from './documento.mapper.ts';

/**
 * Read adapter: metadata only — the stored bytes never leave the server.
 */
export class PostgresDocumentoReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async listByProyecto(proyectoId: string): Promise<Documento[]> {
    const rows = await this.#db
      .selectFrom('documento')
      .select([
        'id',
        'proyecto_id',
        'propuesta_id',
        'proveedor_id',
        'nombre',
        'mime',
        'tamano_bytes',
        'created_at',
      ])
      .where('proyecto_id', '=', proyectoId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((row) => ({
      id: row.id,
      proyectoId: row.proyecto_id,
      propuestaId: row.propuesta_id,
      proveedorId: row.proveedor_id,
      nombre: row.nombre,
      mime: row.mime,
      tamanoBytes: Number(row.tamano_bytes),
      createdAt: toIsoString(row.created_at),
    }));
  }
}
