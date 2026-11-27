import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toPgVectorText } from '../ai/embedding.client.ts';
import type { ConocimientoCoincidencia, ConocimientoSearch } from './conocimiento.search.ts';
import type { ConocimientoTipo } from './conocimiento.writer.ts';

/**
 * Vector similarity search over pgvector (cosine distance, `<=>`). Scoped
 * to one proyecto: the chat never retrieves knowledge from another project.
 * Requires a PostgreSQL server with the vector extension (compose ships it);
 * tests that need search use the real-Postgres path or fakes.
 */
export class PostgresConocimientoSearch implements ConocimientoSearch {
  readonly #db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.#db = db;
  }

  async buscar(input: {
    proyectoId: string;
    vector: number[];
    limite: number;
    tipo?: ConocimientoTipo | undefined;
  }): Promise<ConocimientoCoincidencia[]> {
    const vector = toPgVectorText(input.vector);
    const filtroTipo = input.tipo ? sql`and tipo = ${input.tipo}` : sql``;

    const result = await sql<{
      id: string;
      titulo: string | null;
      contenido: string;
      tipo: string;
      chunk_index: number | null;
      distancia: number;
    }>`
      select id, titulo, contenido, tipo, chunk_index,
             embedding <=> ${vector}::vector as distancia
      from conocimiento
      where proyecto_id = ${input.proyectoId}::uuid
        and embedding is not null
        ${filtroTipo}
      order by embedding <=> ${vector}::vector
      limit ${input.limite}
    `.execute(this.#db);

    return result.rows.map((row) => ({
      id: row.id,
      titulo: row.titulo,
      contenido: row.contenido,
      tipo: row.tipo,
      chunkIndex: row.chunk_index,
      distancia: Number(row.distancia),
    }));
  }
}
