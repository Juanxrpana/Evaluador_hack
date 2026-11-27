import type { ExtractorContenido, ExtraerInput } from './extractor.port.ts';

/**
 * Local PDF text extraction with unpdf (serverless pdf.js build, no native
 * dependencies).
 */
export class PdfExtractor implements ExtractorContenido {
  async extraer(input: ExtraerInput): Promise<string> {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(input.bytes));
    const { text } = await extractText(pdf, { mergePages: true });

    if (typeof text !== 'string') {
      throw new Error('PDF text extraction returned an unexpected shape');
    }

    return text;
  }
}
