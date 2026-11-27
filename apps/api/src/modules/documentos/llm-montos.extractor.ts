import type { LlmClient } from '../ai/llm.client.ts';
import type { ExtractorMontos, MontosExtraidos } from './extraccion-montos.port.ts';

const SYSTEM_PROMPT = [
  'Eres un extractor de datos de propuestas económicas de construcción.',
  'Te entregan el texto (o la transcripción) de una propuesta.',
  'Devuelve ÚNICAMENTE un objeto JSON, sin texto adicional, con esta forma exacta:',
  '{"montoTotal": <number|null>, "recargos": [{"concepto": "<string>", "monto": <number>}]}',
  'Reglas:',
  '- "montoTotal" es el precio base ofertado SIN los conceptos cobrados aparte.',
  '- "recargos" incluye TODO concepto cobrado aparte del monto base (flete, instalación, seguro, transporte, impuestos adicionales, etc.).',
  '- Si el texto no indica un dato, usa null o lista vacía. Nunca inventes montos.',
].join('\n');

interface RespuestaJson {
  montoTotal?: unknown;
  recargos?: unknown;
}

function aMonto(value: number): string {
  return value.toFixed(2);
}

/**
 * Structured extraction via the OpenRouter chat model. The model answers
 * pure JSON; anything unparseable degrades to "no data" so the document
 * ingestion never fails because of a bad completion.
 */
export class LlmMontosExtractor implements ExtractorMontos {
  readonly #llm: LlmClient;

  constructor(llm: LlmClient) {
    this.#llm = llm;
  }

  async extraer(texto: string): Promise<MontosExtraidos> {
    const completion = await this.#llm.complete({
      system: SYSTEM_PROMPT,
      question: texto.slice(0, 30_000),
      maxTokens: 800,
    });

    const json = this.#jsonDe(completion.text);

    if (!json) {
      return { montoTotal: null, recargos: [] };
    }

    const montoTotal =
      typeof json.montoTotal === 'number' &&
      Number.isFinite(json.montoTotal) &&
      json.montoTotal >= 0
        ? aMonto(json.montoTotal)
        : null;

    const recargos = Array.isArray(json.recargos)
      ? json.recargos
          .filter(
            (recargo): recargo is { concepto: string; monto: number } =>
              typeof recargo === 'object' &&
              recargo !== null &&
              typeof (recargo as { concepto?: unknown }).concepto === 'string' &&
              typeof (recargo as { monto?: unknown }).monto === 'number' &&
              Number.isFinite((recargo as { monto: number }).monto) &&
              (recargo as { monto: number }).monto >= 0,
          )
          .map((recargo) => ({
            concepto: recargo.concepto.trim().slice(0, 200),
            monto: aMonto(recargo.monto),
          }))
      : [];

    return { montoTotal, recargos };
  }

  #jsonDe(texto: string): RespuestaJson | null {
    const inicio = texto.indexOf('{');
    const fin = texto.lastIndexOf('}');

    if (inicio === -1 || fin <= inicio) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(texto.slice(inicio, fin + 1));
      return typeof parsed === 'object' && parsed !== null ? (parsed as RespuestaJson) : null;
    } catch {
      return null;
    }
  }
}
