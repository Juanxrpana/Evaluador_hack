import { describe, expect, it } from 'vitest';
import type { Correo } from '@repo/contracts';
import { CorreoService } from '../src/modules/correos/correo.service.ts';
import type { CorreoListarInput, CorreoProvider } from '../src/modules/correos/correo.provider.ts';

/** In-memory provider standing in for the IMAP adapter. */
function providerFalso(correos: Correo[], fallo?: Error): CorreoProvider {
  return {
    async listarConAdjuntos(input: CorreoListarInput): Promise<Correo[]> {
      if (fallo) {
        throw fallo;
      }

      return correos.slice(0, input.limite);
    },
    async obtenerDetalle(): Promise<never> {
      throw fallo ?? new Error('no implementado en el stub');
    },
    async descargarAdjunto(): Promise<never> {
      throw fallo ?? new Error('no implementado en el stub');
    },
  };
}

const correoConAdjuntos: Correo = {
  uid: 1,
  messageId: 'uid-1',
  de: 'Demo <demo@evaluador.local>',
  asunto: 'Propuesta con PDF',
  fecha: new Date().toISOString(),
  carpeta: 'INBOX',
  adjuntos: [{ nombre: 'propuesta.pdf', mime: 'application/pdf', tamanoBytes: 1024, parte: '2' }],
};

describe('CorreoService', () => {
  it('delega el escaneo en el provider', async () => {
    const service = new CorreoService(providerFalso([correoConAdjuntos]));
    const resultado = await service.listar({ carpeta: 'INBOX', limite: 50 });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].asunto).toBe('Propuesta con PDF');
    expect(resultado[0].adjuntos[0].nombre).toBe('propuesta.pdf');
  });

  it('respeta el límite solicitado', async () => {
    const muchos: Correo[] = Array.from({ length: 5 }, (_, i) => ({
      ...correoConAdjuntos,
      messageId: `uid-${i}`,
    }));
    const service = new CorreoService(providerFalso(muchos));

    expect(await service.listar({ carpeta: 'INBOX', limite: 2 })).toHaveLength(2);
  });

  it('propaga el error de dominio cuando el buzón no está disponible', async () => {
    const service = new CorreoService(providerFalso([], new Error('connect ECONNREFUSED')));

    await expect(service.listar({ carpeta: 'INBOX', limite: 50 })).rejects.toThrow(/ECONNREFUSED/);
  });
});
