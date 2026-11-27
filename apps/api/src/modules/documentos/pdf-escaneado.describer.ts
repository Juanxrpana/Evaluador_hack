import type { LlmClient } from '../ai/llm.client.ts';
import type { ExtractorContenido, ExtraerInput } from './extractor.port.ts';

const SYSTEM_PROMPT = [
  'Eres un asistente de evaluación de propuestas.',
  'Te entregan el PDF de un documento escaneado (solo imágenes, con posible ruido o sellos).',
  'Transcribe y describe su contenido con el máximo detalle posible en español:',
  'requisitos, especificaciones, montos, cantidades, plazos, fechas y condiciones.',
  'Responde únicamente con el contenido del documento, sin comentarios.',
].join(' ');

/**
 * A.2: PDFs whose pages are images (no text layer). Instead of rendering
 * pages locally, the PDF goes straight to the vision model as a native file
 * content part (Gemini-class models accept application/pdf inputs).
 */
export class PdfEscaneadoDescriber implements ExtractorContenido {
  readonly #llm: LlmClient;

  constructor(llm: LlmClient) {
    this.#llm = llm;
  }

  async extraer(input: ExtraerInput): Promise<string> {
    const completion = await this.#llm.complete({
      system: SYSTEM_PROMPT,
      question: 'Transcribe y describe este documento escaneado.',
      documents: [
        { nombre: input.nombre, mime: input.mime, base64: input.bytes.toString('base64') },
      ],
    });

    return completion.text;
  }
}
