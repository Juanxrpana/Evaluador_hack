import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Documento, ProveedorHistorial } from '@repo/contracts';
import type { EmbeddingClient } from '../src/modules/ai/embedding.client.ts';
import type { LlmClient } from '../src/modules/ai/llm.client.ts';
import { ChatService } from '../src/modules/chat/chat.service.ts';
import { chunkText } from '../src/modules/documentos/chunker.ts';
import {
  DocumentoDemasiadoGrandeError,
  DocumentoService,
  DocumentoVacioError,
} from '../src/modules/documentos/documento.service.ts';
import type { ConocimientoSearch } from '../src/modules/documentos/conocimiento.search.ts';
import { buildProveedorHistorialText } from '../src/modules/documentos/proveedor-historial.text.ts';

class FakeMontosExtractor {
  readonly #resultado: {
    montoTotal: string | null;
    recargos: Array<{ concepto: string; monto: string }>;
  };

  constructor(resultado: {
    montoTotal: string | null;
    recargos: Array<{ concepto: string; monto: string }>;
  }) {
    this.#resultado = resultado;
  }

  async extraer() {
    return this.#resultado;
  }
}

class FakeEmbeddings implements EmbeddingClient {
  readonly llamados: string[][] = [];

  async embed(texts: string[]): Promise<number[][]> {
    this.llamados.push([...texts]);
    return texts.map((text) =>
      Array.from({ length: 1024 }, (_, i) => ((text.length + i) % 13) / 13),
    );
  }
}

class FakeLlm implements LlmClient {
  readonly peticiones: Array<{ system: string; question: string }> = [];

  async complete(request: { system: string; question: string }) {
    this.peticiones.push({ system: request.system, question: request.question });
    return { text: 'respuesta-fake', model: 'fake-model' };
  }
}

class FakeSearch implements ConocimientoSearch {
  readonly llamados: Array<{ proyectoId: string; limite: number }> = [];

  async buscar(input: { proyectoId: string; vector: number[]; limite: number }) {
    this.llamados.push({ proyectoId: input.proyectoId, limite: input.limite });
    return [
      {
        id: randomUUID(),
        titulo: 'Pliego de condiciones',
        contenido: 'El contrato exige seguro de obra y garantía de 10%.',
        tipo: 'documento',
        chunkIndex: 0,
        distancia: 0.12,
      },
    ];
  }
}

function historialFake(): ProveedorHistorial {
  const id = randomUUID();

  return {
    proveedor: {
      id,
      nombre: 'Constructora Andina',
      contacto: null,
      createdAt: new Date().toISOString(),
    },
    entradas: [
      {
        propuestaId: randomUUID(),
        proyectoId: randomUUID(),
        proyectoNombre: 'Puente Central',
        monto: '100000.00',
        recargosTotal: '5000.00',
        recargos: [
          {
            id: randomUUID(),
            propuestaId: randomUUID(),
            concepto: 'Flete',
            monto: '5000.00',
            createdAt: new Date().toISOString(),
          },
        ],
        estado: 1,
        createdAt: new Date().toISOString(),
      },
    ],
    resumen: {
      totalPropuestas: 1,
      montoPromedio: '100000.00',
      montoMinimo: '100000.00',
      montoMaximo: '100000.00',
      ultimoMonto: '100000.00',
    },
  };
}

function proyectoFake() {
  return {
    id: randomUUID(),
    nombre: 'Proyecto X',
    descripcion: null,
    createdAt: new Date().toISOString(),
  };
}

describe('chunker', () => {
  it('splits long text into ordered chunks with content preserved', () => {
    const texto = Array.from(
      { length: 40 },
      (_, i) => `Párrafo ${i} con contenido suficiente.`,
    ).join('\n\n');
    const chunks = chunkText(texto, 200, 40);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[chunks.length - 1].text.length).toBeGreaterThan(0);
  });

  it('returns no chunks for empty text', () => {
    expect(chunkText('   \n  ')).toEqual([]);
  });
});

describe('buildProveedorHistorialText', () => {
  it('includes the supplier name, montos and project entries', () => {
    const texto = buildProveedorHistorialText(historialFake());

    expect(texto).toContain('Constructora Andina');
    expect(texto).toContain('100000.00');
    expect(texto).toContain('Puente Central');
  });
});

describe('DocumentoService.subir', () => {
  it('extracts, chunks, embeds and stores documento plus knowledge in one transaction', async () => {
    const embeddings = new FakeEmbeddings();
    const insertaciones: Array<{ tipo: string; chunks: number }> = [];
    const auditorias: string[] = [];
    const montosActualizados: Array<{ id: string; monto: string | null }> = [];
    const recargosReemplazados: Array<{
      propuestaId: string;
      recargos: Array<{ concepto: string; monto: string }>;
    }> = [];
    let documentoCreado: Documento | null = null;

    const servicio = new DocumentoService(
      {
        async listByProyecto() {
          return documentoCreado ? [documentoCreado] : [];
        },
      },
      (work) =>
        work({
          documentos: {
            async create(input) {
              const id = randomUUID();
              documentoCreado = {
                id,
                proyectoId: input.proyectoId,
                propuestaId: input.propuestaId ?? null,
                proveedorId: input.proveedorId ?? null,
                nombre: input.nombre,
                mime: input.mime,
                tamanoBytes: input.bytes.byteLength,
                createdAt: new Date().toISOString(),
              };

              return { id };
            },
            async remove() {
              return true;
            },
          },
          conocimiento: {
            async insertConEmbeddings(insercion) {
              insertaciones.push({ tipo: insercion.tipo, chunks: insercion.chunks.length });
              return insercion.chunks.length;
            },
            async deleteProveedorHistorial() {},
          },
          propuestas: {
            async create() {
              return { id: randomUUID() };
            },
            async update(id, patch) {
              montosActualizados.push({ id, monto: patch.monto ?? null });
              return true;
            },
            async remove() {
              return true;
            },
          },
          recargos: {
            async replaceForPropuesta(propuestaId, recargos) {
              recargosReemplazados.push({ propuestaId, recargos });
              return recargos.length;
            },
          },
          audit: {
            async record(event) {
              auditorias.push(event.action);
            },
          },
        }),
      {
        async list() {
          return [];
        },
        async get() {
          return {
            id: randomUUID(),
            nombre: 'Proyecto X',
            descripcion: null,
            createdAt: new Date().toISOString(),
          };
        },
      },
      {
        async get() {
          return null;
        },
        async listByProyecto() {
          return [];
        },
      },
      {
        async list() {
          return [];
        },
        async get(id: string) {
          return {
            id,
            nombre: 'Constructora Andina',
            contacto: null,
            createdAt: new Date().toISOString(),
          };
        },
        async historial() {
          return historialFake();
        },
      },
      {
        async extraer() {
          return 'Requisito 1: seguro de obra.\n\nRequisito 2: garantía del 10%.';
        },
      },
      embeddings,
      new FakeMontosExtractor({ montoTotal: null, recargos: [] }),
    );

    const resultado = await servicio.subir({
      proyectoId: randomUUID(),
      proveedorId: randomUUID(),
      nombre: 'pliego.pdf',
      mime: 'application/pdf',
      contenidoBase64: Buffer.from('binarios-de-prueba').toString('base64'),
    });

    expect(resultado.chunks).toBeGreaterThan(0);
    expect(resultado.proveedorHistorialChunks).toBeGreaterThan(0);
    expect(insertaciones.map((insercion) => insercion.tipo)).toEqual([
      'documento',
      'proveedor_historial',
    ]);
    expect(auditorias).toEqual(['documento.upload']);
    expect(embeddings.llamados.length).toBe(2);
    expect(montosActualizados).toEqual([]);
    expect(recargosReemplazados).toEqual([]);
    expect(resultado.extraccion).toBeNull();
  });

  it('lets the LLM extract monto and recargos when the upload targets a propuesta', async () => {
    const embeddings = new FakeEmbeddings();
    const auditorias: string[] = [];
    const montosActualizados: Array<{ id: string; monto: string | null }> = [];
    const recargosReemplazados: Array<{
      propuestaId: string;
      recargos: Array<{ concepto: string; monto: string }>;
    }> = [];
    const proyectoId = randomUUID();
    const propuestaId = randomUUID();
    let documentoCreado: Documento | null = null;

    const servicio = new DocumentoService(
      {
        async listByProyecto() {
          return documentoCreado ? [documentoCreado] : [];
        },
      },
      (work) =>
        work({
          documentos: {
            async create(input) {
              documentoCreado = {
                id: randomUUID(),
                proyectoId: input.proyectoId,
                propuestaId: input.propuestaId ?? null,
                proveedorId: input.proveedorId ?? null,
                nombre: input.nombre,
                mime: input.mime,
                tamanoBytes: input.bytes.byteLength,
                createdAt: new Date().toISOString(),
              };

              return { id: documentoCreado.id };
            },
            async remove() {
              return true;
            },
          },
          conocimiento: {
            async insertConEmbeddings() {
              return 1;
            },
            async deleteProveedorHistorial() {},
          },
          propuestas: {
            async create() {
              return { id: randomUUID() };
            },
            async update(id, patch) {
              montosActualizados.push({ id, monto: patch.monto ?? null });
              return true;
            },
            async remove() {
              return true;
            },
          },
          recargos: {
            async replaceForPropuesta(propuestaIdReemplazo, recargos) {
              recargosReemplazados.push({ propuestaId: propuestaIdReemplazo, recargos });
              return recargos.length;
            },
          },
          audit: {
            async record(event) {
              auditorias.push(event.action);
            },
          },
        }),
      {
        async list() {
          return [];
        },
        async get() {
          return proyectoFake();
        },
      },
      {
        async get(id: string) {
          return {
            id,
            proyectoId,
            proveedorId: randomUUID(),
            monto: null,
            createdAt: new Date().toISOString(),
          };
        },
        async listByProyecto() {
          return [];
        },
      },
      {
        async list() {
          return [];
        },
        async get() {
          return null;
        },
        async historial() {
          return null;
        },
      },
      {
        async extraer() {
          return 'MONTO TOTAL OFERTADO: 118500.00. Flete: 4200.00 se cobra aparte.';
        },
      },
      embeddings,
      new FakeMontosExtractor({
        montoTotal: '118500.00',
        recargos: [
          { concepto: 'Flete', monto: '4200.00' },
          { concepto: 'Instalación', monto: '1500.00' },
        ],
      }),
    );

    const resultado = await servicio.subir({
      proyectoId,
      propuestaId,
      nombre: 'propuesta.pdf',
      mime: 'application/pdf',
      contenidoBase64: Buffer.from('binarios-de-propuesta').toString('base64'),
    });

    expect(montosActualizados).toEqual([{ id: propuestaId, monto: '118500.00' }]);
    expect(recargosReemplazados).toEqual([
      {
        propuestaId,
        recargos: [
          { concepto: 'Flete', monto: '4200.00' },
          { concepto: 'Instalación', monto: '1500.00' },
        ],
      },
    ]);
    expect(resultado.extraccion).toEqual({ montoTotal: '118500.00', recargos: 2 });
    expect(auditorias).toEqual(['documento.upload']);
  });

  it('rejects empty uploads without touching the transaction', async () => {
    const servicio = new DocumentoService(
      {
        async listByProyecto() {
          return [];
        },
      },
      () => {
        throw new Error('transaction must not open');
      },
      {
        async list() {
          return [];
        },
        async get() {
          return proyectoFake();
        },
      },
      {
        async get() {
          return null;
        },
        async listByProyecto() {
          return [];
        },
      },
      {
        async list() {
          return [];
        },
        async get() {
          return null;
        },
        async historial() {
          return null;
        },
      },
      {
        async extraer() {
          return '';
        },
      },
      new FakeEmbeddings(),
      new FakeMontosExtractor({ montoTotal: null, recargos: [] }),
    );

    await expect(
      servicio.subir({
        proyectoId: randomUUID(),
        nombre: 'vacio.pdf',
        mime: 'application/pdf',
        contenidoBase64: '',
      }),
    ).rejects.toBeInstanceOf(DocumentoVacioError);
  });

  it('rejects uploads beyond the size limit', async () => {
    const servicio = new DocumentoService(
      {
        async listByProyecto() {
          return [];
        },
      },
      () => {
        throw new Error('transaction must not open');
      },
      {
        async list() {
          return [];
        },
        async get() {
          return proyectoFake();
        },
      },
      {
        async get() {
          return null;
        },
        async listByProyecto() {
          return [];
        },
      },
      {
        async list() {
          return [];
        },
        async get() {
          return null;
        },
        async historial() {
          return null;
        },
      },
      {
        async extraer() {
          return 'texto';
        },
      },
      new FakeEmbeddings(),
      new FakeMontosExtractor({ montoTotal: null, recargos: [] }),
    );

    const gigante = Buffer.alloc(2000).toString('base64');

    await expect(
      servicio.subir({
        proyectoId: randomUUID(),
        nombre: 'gigante.pdf',
        mime: 'application/pdf',
        contenidoBase64: gigante,
      }),
    ).rejects.toBeInstanceOf(DocumentoDemasiadoGrandeError);
  });
});

describe('ChatService.preguntar', () => {
  it('retrieves knowledge scoped to the proyecto and answers with sources', async () => {
    const search = new FakeSearch();
    const llm = new FakeLlm();
    const proyectoId = randomUUID();

    const servicio = new ChatService(
      {
        async list() {
          return [];
        },
        async get(id) {
          return {
            id,
            nombre: 'Proyecto X',
            descripcion: null,
            createdAt: new Date().toISOString(),
          };
        },
      },
      {
        async get() {
          return null;
        },
        async listByProyecto() {
          return [];
        },
      },
      {
        async list() {
          return [];
        },
        async get() {
          return null;
        },
        async historial() {
          return null;
        },
      },
      search,
      new FakeEmbeddings(),
      llm,
    );

    const respuesta = await servicio.preguntar({ proyectoId, pregunta: '¿Qué exige el pliego?' });

    expect(search.llamados[0]?.proyectoId).toBe(proyectoId);
    expect(respuesta.respuesta).toBe('respuesta-fake');
    expect(respuesta.fuentes.length).toBe(1);
    expect(llm.peticiones[0]?.question).toContain('Pliego de condiciones');
    expect(llm.peticiones[0]?.question).toContain('Proyecto X');
  });
});
