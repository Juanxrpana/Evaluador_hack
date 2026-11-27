import type { PropuestaItem, Recargo } from '@repo/contracts';

export interface RenglonDesglose {
  concepto: string;
  tipo: 'monto_base' | 'recargo_fijo' | 'recargo_porcentual';
  monto: string;
  referencia?: string | undefined;
}

export interface CostoReal {
  costoTotal: string | null;
  desglose: RenglonDesglose[];
  /** Surcharges that could not be computed (no base amount available). */
  pendientes: string[];
}

/** Computes the REAL total cost: base + fixed surcharges + percentage surcharges over the base (E.4.b). */
export function calculaCostoReal(montoBase: string | null, recargos: Recargo[]): CostoReal {
  const base = montoBase === null ? null : Number(montoBase);
  const desglose: RenglonDesglose[] = [];

  if (base !== null && Number.isFinite(base)) {
    desglose.push({
      concepto: 'Monto base ofertado',
      tipo: 'monto_base',
      monto: montoBase ?? '0.00',
    });
  }

  let total = base;
  const pendientes: string[] = [];

  for (const recargo of recargos) {
    if (recargo.monto !== null) {
      const fijo = Number(recargo.monto);
      if (Number.isFinite(fijo)) {
        total = (total ?? 0) + fijo;
        desglose.push({
          concepto: recargo.concepto,
          tipo: 'recargo_fijo',
          monto: recargo.monto,
          referencia: recargo.id,
        });
      }

      continue;
    }

    if (recargo.porcentaje !== null) {
      const porcentaje = Number(recargo.porcentaje);
      if (Number.isFinite(porcentaje) && base !== null) {
        const montoPorcentual = (base * porcentaje) / 100;
        total = (total ?? 0) + montoPorcentual;
        desglose.push({
          concepto: `${recargo.concepto} (${recargo.porcentaje}% sobre el monto base)`,
          tipo: 'recargo_porcentual',
          monto: montoPorcentual.toFixed(2),
          referencia: recargo.id,
        });
      } else if (base === null) {
        pendientes.push(`${recargo.concepto}: porcentaje sin monto base para calcularse`);
      }
    }
  }

  return {
    costoTotal: total === null || !Number.isFinite(total) ? null : total.toFixed(2),
    desglose,
    pendientes,
  };
}

export interface VerificacionAritmetica {
  coincide: boolean;
  sumaItems: string | null;
  totalDeclarado: string | null;
  desviacionPct: number | null;
  detalle: string;
}

/**
 * B.3: arithmetic verification in CODE, never in the LLM. With extracted
 * items, Σ(cantidad × precio unitario) must match the declared base total
 * within a 2% tolerance; otherwise the proposal is discarded.
 */
export function verificaAritmetica(
  items: PropuestaItem[],
  montoBase: string | null,
): VerificacionAritmetica {
  if (items.length === 0 || montoBase === null) {
    return {
      coincide: true,
      sumaItems: null,
      totalDeclarado: montoBase,
      desviacionPct: null,
      detalle: items.length === 0 ? 'sin ítems extraídos: no aplica' : 'sin total declarado',
    };
  }

  const suma = items.reduce(
    (acumulado, item) => acumulado + Number(item.cantidad) * Number(item.precioUnitario),
    0,
  );
  const declarado = Number(montoBase);

  if (!Number.isFinite(declarado) || declarado <= 0) {
    return {
      coincide: true,
      sumaItems: suma.toFixed(2),
      totalDeclarado: montoBase,
      desviacionPct: null,
      detalle: 'total declarado no evaluable',
    };
  }

  const desviacionPct = Math.abs((suma - declarado) / declarado) * 100;
  const coincide = desviacionPct <= 2;

  return {
    coincide,
    sumaItems: suma.toFixed(2),
    totalDeclarado: montoBase,
    desviacionPct: Number(desviacionPct.toFixed(2)),
    detalle: coincide
      ? 'Σ(cantidad × precio unitario) coincide con el total declarado (±2%)'
      : `Σ(cantidad × precio unitario) = ${suma.toFixed(2)} difiere del total declarado ${montoBase} en ${desviacionPct.toFixed(2)}%`,
  };
}

/** Converts an amount between currencies using the BCV rate (E.4.a). */
export function convierteMoneda(
  monto: string,
  monedaOrigen: string | null,
  monedaDestino: 'USD',
  tasaBcv: string | null,
): { monto: string; moneda: 'USD'; convertido: boolean } | null {
  const origen = (monedaOrigen ?? 'USD').toUpperCase().replace('VES', 'BS');

  if (origen === monedaDestino || origen === 'USD') {
    return { monto, moneda: 'USD', convertido: false };
  }

  if (origen === 'BS' && tasaBcv !== null) {
    const tasa = Number(tasaBcv);
    if (Number.isFinite(tasa) && tasa > 0) {
      return { monto: (Number(monto) / tasa).toFixed(2), moneda: 'USD', convertido: true };
    }
  }

  return null;
}
