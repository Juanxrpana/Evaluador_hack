import { describe, expect, it } from 'vitest';
import { TasaBcvService } from '../src/modules/tasa/tasa-bcv.service.ts';

const payload = {
  moneda: 'USD',
  fuente: 'oficial',
  nombre: 'Dólar',
  compra: null,
  venta: null,
  promedio: 926.3592,
  fechaActualizacion: '2026-11-27T00:00:00-04:00',
};

function respuestaOk() {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('TasaBcvService', () => {
  it('obtiene la tasa oficial y la cachea', async () => {
    let llamadas = 0;
    const service = new TasaBcvService(async () => {
      llamadas += 1;
      return respuestaOk();
    });

    const primera = await service.obtener();
    expect(primera.tasa.valor).toBe('926.3592');
    expect(primera.tasa.verificada).toBe(true);
    expect(primera.tasa.fuente).toBe('BCV (oficial)');

    const segunda = await service.obtener();
    expect(segunda.desdeCache).toBe(true);
    expect(llamadas).toBe(1);
  });

  it('devuelve la última tasa marcada como no verificada si falla', async () => {
    let llamadas = 0;
    const service = new TasaBcvService(async () => {
      llamadas += 1;
      if (llamadas === 1) return respuestaOk();
      throw new Error('offline');
    }, 0);

    const primera = await service.obtener();
    expect(primera.tasa.verificada).toBe(true);

    const segunda = await service.obtener();
    expect(segunda.tasa.verificada).toBe(false);
    expect(segunda.tasa.valor).toBe('926.3592');
    expect(segunda.desdeCache).toBe(true);
  });

  it('falla si no hay tasa ni caché', async () => {
    const service = new TasaBcvService(async () => {
      throw new Error('offline');
    });

    await expect(service.obtener()).rejects.toThrow('No se pudo obtener la tasa BCV');
  });
});
