import type { ProveedorHistorial } from '@repo/contracts';

/**
 * Builds the supplier cost-history text that becomes `conocimiento` rows
 * (tipo `proveedor_historial`) scoped to the project being evaluated. This
 * is how the AI remembers how expensive a proveedor has historically been.
 */
export function buildProveedorHistorialText(historial: ProveedorHistorial): string {
  const { proveedor, resumen } = historial;
  const lineas: string[] = [];

  lineas.push(`Historial de costos del proveedor ${proveedor.nombre}.`);
  if (proveedor.contacto) {
    lineas.push(`Contacto: ${proveedor.contacto}.`);
  }

  lineas.push(`Propuestas registradas: ${resumen.totalPropuestas}.`);

  if (resumen.montoPromedio) {
    lineas.push(
      `Monto promedio: ${resumen.montoPromedio}; mínimo: ${resumen.montoMinimo}; máximo: ${resumen.montoMaximo}; último: ${resumen.ultimoMonto}.`,
    );
  } else {
    lineas.push('Sin montos registrados todavía.');
  }

  if (historial.entradas.length > 0) {
    lineas.push('Detalle por propuesta:');

    for (const entrada of historial.entradas) {
      const monto = entrada.monto ? `monto ${entrada.monto}` : 'sin monto';
      const conceptos =
        entrada.recargos.length > 0
          ? `, recargos aparte: ${entrada.recargos.map((recargo) => `${recargo.concepto} ${recargo.monto}`).join(', ')}`
          : `, recargos aparte: ${entrada.recargosTotal}`;
      lineas.push(
        `- Proyecto "${entrada.proyectoNombre}" (${entrada.createdAt.slice(0, 10)}): ${monto}${conceptos}${entrada.estado === null ? '' : `, estado ${entrada.estado}`}.`,
      );
    }
  }

  return lineas.join('\n');
}
