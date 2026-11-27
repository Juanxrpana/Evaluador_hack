import type { ExtractorContenido, ExtraerInput } from './extractor.port.ts';

/**
 * A.4: XLSX budgets. Each sheet's rows become text lines so the regular
 * pipeline (chunk → embed → LLM extraction) works without changes; cell
 * numbers keep their formatting to preserve amounts.
 */
export class XlsxExtractor implements ExtractorContenido {
  async extraer(input: ExtraerInput): Promise<string> {
    const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(input.bytes as unknown as ArrayBuffer);

    const lineas: string[] = [];

    for (const hoja of libro.worksheets) {
      if (!hoja || hoja.rowCount === 0) {
        continue;
      }

      lineas.push(`# Hoja: ${hoja.name}`);

      hoja.eachRow({ includeEmpty: false }, (fila) => {
        const celdas: string[] = [];

        fila.eachCell({ includeEmpty: false }, (celda) => {
          let valor: string;
          if (celda.value === null || celda.value === undefined) {
            return;
          } else if (typeof celda.value === 'object' && 'result' in celda.value) {
            const resultado = (celda.value as { result?: unknown }).result;
            valor = resultado === undefined || resultado === null ? '' : String(resultado);
          } else if (typeof celda.value === 'object' && 'text' in celda.value) {
            valor = String((celda.value as { text?: unknown }).text ?? '');
          } else if (celda.value instanceof Date) {
            valor = celda.value.toISOString().slice(0, 10);
          } else {
            valor = String(celda.value);
          }

          if (valor.trim().length > 0) {
            celdas.push(valor.trim());
          }
        });

        if (celdas.length > 0) {
          lineas.push(celdas.join(' | '));
        }
      });
    }

    return lineas.join('\n');
  }
}
