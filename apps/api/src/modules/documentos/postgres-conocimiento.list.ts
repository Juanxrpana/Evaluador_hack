import type { Conocimiento } from '@repo/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toIsoString } from './documento.mapper.ts';
import type { ConocimientoListReader } from './conocimiento.list.ts';

/**
 * Read adapter for the knowledge base of one proyecto. The embedding column
 * is deliberately excluded: vectors move through the raw-SQL search adapter.
 */
export class PostgresConocimientoListReader implements ConocimientoListReader {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async listByProyecto(proyectoId: string): Promise<Conocimiento[]> {
    const rows = await this.#db
      .selectFrom('conocimiento')
      .select([
        'id',
        'proyecto_id',
        'titulo',
        'tipo',
        'chunk_index',
        'documento_id',
        'contenido',
        'created_at',
      ])
      .where('proyecto_id', '=', proyectoId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((row) => ({
      id: row.id,
      proyectoId: row.proyecto_id,
      titulo: row.titulo,
      tipo: row.tipo,
      chunkIndex: row.chunk_index,
      documentoId: row.documento_id,
      contenido: row.contenido,
      createdAt: toIsoString(row.created_at),
    }));
  }
}

export class ConocimientoListService {
  readonly #reader: ConocimientoListReader;

  constructor(reader: ConocimientoListReader) {
    this.#reader = reader;
  }

  listByProyecto(proyectoId: string): Promise<Conocimiento[]> {
    return this.#reader.listByProyecto(proyectoId);
  }
}
