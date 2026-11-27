const numero = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fechaHora = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Caracas',
});

const soloFecha = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Caracas',
});

export function fecha(iso: string): string {
  return fechaHora.format(new Date(iso));
}

export function fechaCorta(iso: string): string {
  return soloFecha.format(new Date(iso));
}

export function monto(valor: string | number | null | undefined, moneda?: string | null): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numeroValor = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numeroValor)) return String(valor);
  const formateado = numero.format(numeroValor);
  if (!moneda) return formateado;
  const etiqueta = moneda === 'VES' ? 'Bs' : moneda;
  return `${etiqueta} ${formateado}`;
}

export function numeroDe(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numeroValor = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numeroValor) ? numero.format(numeroValor) : String(valor);
}

/** Parses a decimal string (or number) to integer cents without float drift. */
export function aCentavos(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const valorNumerico = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(valorNumerico) ? Math.round(valorNumerico * 100) : null;
}

/** Integer cents to a two-decimal string (no grouping, dot decimal). */
export function deCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2);
}
