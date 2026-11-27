import type { LlmClient } from '../ai/llm.client.ts';
import type { ExtractorContenido, ExtraerInput } from './extractor.port.ts';

const SYSTEM_PROMPT = [
  'Eres un asistente de evaluación de propuestas.',
  'Te entregan la imagen de un documento (escaneo, fotografía o captura).',
  'Transcribe y describe su contenido con el máximo detalle posible en español:',
  'requisitos, especificaciones, montos, cantidades, plazos, fechas, condiciones',
  'y cualquier dato numérico o legal relevante.',
  'Responde únicamente con el contenido del documento, sin comentarios.',
].join(' ');

/**
 * Image description via the OpenRouter vision model. The base64 image goes
 * straight into a multimodal content part; the result is text usable by the
 * embedding pipeline.
 */
export class ImagenDescriber implements ExtractorContenido {
  readonly #llm: LlmClient;

  constructor(llm: LlmClient) {
    this.#llm = llm;
  }

  async extraer(input: ExtraerInput): Promise<string> {
    const completion = await this.#llm.complete({
      system: SYSTEM_PROMPT,
      question: 'Transcribe y describe este documento.',
      images: [{ mime: input.mime, base64: input.bytes.toString('base64') }],
    });

    return completion.text;
  }
}
