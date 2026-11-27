import { useQueries, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { Estatus, Nota, Propuesta, Proveedor, Recargo } from '@repo/contracts';
import { Vacio } from '../../components/ui';
import { aCentavos, deCentavos, fecha, monto } from '../../lib/format';
import { orpc } from '../../lib/orpc';

export const Route = createFileRoute('/_authed/proyectos/$id/informe')({
  component: InformePage,
});

interface FilaInforme {
  propuesta: Propuesta;
  recargos: Recargo[];
  notas: Nota[];
  estatus: Estatus[];
}

function nombreProveedor(propuesta: Propuesta, proveedores: Proveedor[]): string {
  return (
    proveedores.find((proveedor) => proveedor.id === propuesta.proveedorId)?.nombre ??
    'Proveedor sin nombre'
  );
}

function ultimoEstatus(estatus: Estatus[]): Estatus | null {
  if (estatus.length === 0) return null;
  return estatus.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

function csvCell(valor: string): string {
  const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replace(/"/g, '""')}"`;
}

function slug(texto: string): string {
  return (
    texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'proyecto'
  );
}

function decimalCsv(valor: number | null): string {
  return valor === null ? '' : deCentavos(valor).replace('.', ',');
}

/** ISO 8601 with explicit offset (the enunciado's example uses -04:00). */
function isoConZona(instante: Date): string {
  const offsetMinutos = -instante.getTimezoneOffset();
  const signo = offsetMinutos >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutos);
  const horas = String(Math.floor(abs / 60)).padStart(2, '0');
  const minutos = String(abs % 60).padStart(2, '0');
  const local = new Date(instante.getTime() - offsetMinutos * 60_000);

  return `${local.toISOString().slice(0, 19)}${signo}${horas}:${minutos}`;
}

function sinExtension(nombre: string): string {
  return nombre.replace(/\.[^.]+$/, '');
}

function InformePage() {
  const { id } = Route.useParams();
  const [generadoEn] = useState(() => new Date().toISOString());

  const proyectoQuery = useQuery(orpc.proyectos.get.queryOptions({ input: { id } }));
  const propuestasQuery = useQuery(
    orpc.propuestas.list.queryOptions({ input: { proyectoId: id } }),
  );
  const proveedoresQuery = useQuery(orpc.proveedores.list.queryOptions());
  const tasaQuery = useQuery({ ...orpc.tasa.bcv.queryOptions(), retry: 0 });
  const documentosQuery = useQuery(
    orpc.documentos.list.queryOptions({ input: { proyectoId: id } }),
  );
  const evaluacionesQuery = useQuery(
    orpc.evaluaciones.list.queryOptions({ input: { proyectoId: id } }),
  );
  const ultimaEvaluacion = (evaluacionesQuery.data ?? [])[0];
  const evaluacionDetalleQuery = useQuery({
    ...orpc.evaluaciones.get.queryOptions({ input: { id: ultimaEvaluacion?.id ?? '' } }),
    enabled: Boolean(ultimaEvaluacion),
    retry: 0,
  });

  const propuestas = propuestasQuery.data ?? [];
  const proveedores = proveedoresQuery.data ?? [];
  const tasa = tasaQuery.data;
  const tasaNumero = tasa ? Number(tasa.valor) : null;

  const recargosQueries = useQueries({
    queries: propuestas.map((propuesta) =>
      orpc.recargos.list.queryOptions({ input: { propuestaId: propuesta.id } }),
    ),
  });
  const notasQueries = useQueries({
    queries: propuestas.map((propuesta) =>
      orpc.notas.list.queryOptions({ input: { propuestaId: propuesta.id } }),
    ),
  });
  const estatusQueries = useQueries({
    queries: propuestas.map((propuesta) =>
      orpc.estatus.list.queryOptions({
        input: { propuestaId: propuesta.id },
      }),
    ),
  });

  const cargando =
    proyectoQuery.isLoading ||
    propuestasQuery.isLoading ||
    proveedoresQuery.isLoading ||
    tasaQuery.isLoading ||
    documentosQuery.isLoading ||
    recargosQueries.some((query) => query.isLoading) ||
    notasQueries.some((query) => query.isLoading) ||
    estatusQueries.some((query) => query.isLoading);

  const errorCarga =
    proyectoQuery.isError ||
    propuestasQuery.isError ||
    proveedoresQuery.isError ||
    recargosQueries.some((query) => query.isError) ||
    notasQueries.some((query) => query.isError) ||
    estatusQueries.some((query) => query.isError);

  const filas: FilaInforme[] = propuestas.map((propuesta, index) => ({
    propuesta,
    recargos: recargosQueries[index]?.data ?? [],
    notas: notasQueries[index]?.data ?? [],
    estatus: estatusQueries[index]?.data ?? [],
  }));

  const totales = filas.reduce(
    (acc, fila) => {
      const montoCentavos = aCentavos(fila.propuesta.monto);
      const recargosCentavos = fila.recargos.reduce(
        (suma, recargo) => suma + (aCentavos(recargo.monto) ?? 0),
        0,
      );

      acc.recargos += recargosCentavos;

      if (montoCentavos === null) {
        acc.sinMonto += 1;
      } else {
        acc.conMonto += 1;
        acc.total += montoCentavos + recargosCentavos;
      }

      return acc;
    },
    { total: 0, recargos: 0, conMonto: 0, sinMonto: 0 },
  );

  const totalVes =
    tasaNumero !== null && Number.isFinite(tasaNumero)
      ? Math.round(totales.total * tasaNumero)
      : null;

  const descargarCsv = () => {
    if (!proyectoQuery.data || filas.length === 0) return;

    const proyecto = proyectoQuery.data;
    const encabezado = [
      'Tipo',
      'Proyecto',
      'Proveedor',
      'Monto USD',
      'Recargos USD',
      'Total conocido USD',
      'Tasa BCV',
      'Total VES',
      'Estado',
      'Notas',
      'Recargos detalle',
    ];

    const filasCsv = filas.map((fila) => {
      const montoCentavos = aCentavos(fila.propuesta.monto);
      const recargosCentavos = fila.recargos.reduce(
        (suma, recargo) => suma + (aCentavos(recargo.monto) ?? 0),
        0,
      );
      const totalCentavos = montoCentavos === null ? null : montoCentavos + recargosCentavos;
      const totalVesFila =
        totalCentavos !== null && tasaNumero !== null
          ? Math.round(totalCentavos * tasaNumero)
          : null;
      const estado = ultimoEstatus(fila.estatus);

      return [
        'Preliminar, sin evaluación automática',
        proyecto.nombre,
        nombreProveedor(fila.propuesta, proveedores),
        decimalCsv(montoCentavos),
        decimalCsv(recargosCentavos),
        decimalCsv(totalCentavos),
        tasa ? tasa.valor.replace('.', ',') : '',
        decimalCsv(totalVesFila),
        estado
          ? `Código ${estado.estado}${estado.comentario ? `: ${estado.comentario}` : ''}`
          : 'Sin estado',
        fila.notas.map((nota) => nota.texto.replace(/\s+/g, ' ')).join(' | '),
        fila.recargos
          .map((recargo) => `${recargo.concepto}: ${decimalCsv(aCentavos(recargo.monto))}`)
          .join(' | '),
      ];
    });

    const contenido =
      '\uFEFF' +
      [encabezado, ...filasCsv]
        .map((fila) => fila.map((valor) => csvCell(valor)).join(';'))
        .join('\r\n');

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `informe-preliminar-${slug(proyecto.nombre)}-${generadoEn.slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const descargarSalidaJson = () => {
    if (!proyectoQuery.data || filas.length === 0) return;

    const documentos = documentosQuery.data ?? [];
    const documentoDePropuesta = (propuestaId: string) =>
      documentos.find(
        (documento) => documento.propuestaId === propuestaId && documento.tipo === 'propuesta',
      );

    const archivoDePropuesta = (propuestaId: string): string | null => {
      const documento = documentoDePropuesta(propuestaId);

      return documento ? sinExtension(documento.nombre) : null;
    };

    // 3.b: ranking by FILE NAME without extension, in the engine's order;
    // valid best-first, then discarded. Falls back to known total cost.
    const rankingAgente = evaluacionDetalleQuery.data?.informe?.ranking ?? [];
    const vistos = new Set<string>();
    const ranking: string[] = [];

    for (const fila of rankingAgente) {
      const archivo = archivoDePropuesta(fila.propuestaId);

      if (archivo && !vistos.has(archivo)) {
        vistos.add(archivo);
        ranking.push(archivo);
      }
    }

    if (ranking.length === 0) {
      ranking.push(
        ...filas
          .map((fila) => {
            const montoCentavos = aCentavos(fila.propuesta.monto);
            const recargosCentavos = fila.recargos.reduce(
              (suma, recargo) => suma + (aCentavos(recargo.monto) ?? 0),
              0,
            );

            return {
              archivo:
                archivoDePropuesta(fila.propuesta.id) ??
                nombreProveedor(fila.propuesta, proveedores),
              total:
                montoCentavos === null
                  ? Number.POSITIVE_INFINITY
                  : montoCentavos + recargosCentavos,
            };
          })
          .toSorted((a, b) => a.total - b.total)
          .map((fila) => fila.archivo),
      );
    }

    const procesados = (
      documentos.some((documento) => documento.tipo === 'propuesta')
        ? documentos.filter((documento) => documento.tipo === 'propuesta')
        : filas.map((fila) => ({
            nombre: nombreProveedor(fila.propuesta, proveedores),
            createdAt: fila.propuesta.createdAt,
          }))
    ).map((documento) => ({
      archivo: documento.nombre,
      hora: isoConZona(new Date(documento.createdAt)),
    }));

    const ahora = new Date();
    const salida = {
      reto: 'propuesta_servicios',
      repositorio:
        import.meta.env.VITE_GIT_REPOSITORY ?? 'https://github.com/Juanxrpana/Evaluador_hack',
      commit: import.meta.env.VITE_GIT_COMMIT ?? 'local',
      inicio: isoConZona(ahora),
      fin: isoConZona(ahora),
      procesados,
      ranking,
    };

    const blob = new Blob([`${JSON.stringify(salida, null, 2)}\n`], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'salida.json';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  if (cargando) {
    return (
      <Vacio>
        <h1>Informe preliminar</h1>
        <p>Cargando propuestas, recargos, notas y tasa BCV…</p>
      </Vacio>
    );
  }

  if (errorCarga) {
    return (
      <Vacio>
        <h1>No se pudo cargar el informe</h1>
        <p>Una de las consultas falló. Recarga la página o vuelve al proyecto.</p>
        <Link to="/proyectos/$id" params={{ id }} className="btn btn--primary">
          Volver al proyecto
        </Link>
      </Vacio>
    );
  }

  const proyecto = proyectoQuery.data;

  if (!proyecto) {
    return (
      <Vacio>
        <h1>Proyecto no encontrado</h1>
        <p>El proyecto no existe o fue eliminado.</p>
        <Link to="/proyectos" className="btn btn--primary">
          Volver a proyectos
        </Link>
      </Vacio>
    );
  }

  if (propuestas.length === 0) {
    return (
      <div className="stack">
        <div className="actions no-print">
          <Link to="/proyectos/$id" params={{ id }} className="btn btn--ghost">
            Volver al proyecto
          </Link>
        </div>
        <Vacio>
          <h1>Informe preliminar</h1>
          <p>
            Este proyecto aún no tiene propuestas. Carga documentos y crea propuestas para generar
            el informe.
          </p>
          <Link to="/proyectos/$id" params={{ id }} className="btn btn--primary">
            Cargar propuestas
          </Link>
        </Vacio>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="actions no-print">
        <Link to="/proyectos/$id" params={{ id }} className="btn btn--ghost">
          Volver al proyecto
        </Link>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={descargarSalidaJson}
          disabled={cargando || errorCarga}
        >
          Descargar salida.json
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={descargarCsv}
          disabled={cargando || errorCarga}
        >
          Descargar CSV
        </button>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <article className="dictamen informe">
        <header className="dictamen__head">
          <p className="dictamen__stamp">Informe preliminar</p>
          <h1>Informe: {proyecto.nombre}</h1>
          <p className="dictamen__meta">
            Generado el {fecha(generadoEn)} · {proyecto.descripcion ?? 'Sin descripción'}
          </p>
          <p className="fine">
            Sin evaluación automática. Montos en USD; conversión referencial a bolívares con la tasa
            BCV indicada. No adjudica: ordena y explica para que una persona decida.
          </p>
        </header>

        <RankingAgente proyectoId={id} />

        <section>
          <h2>Tasa aplicada</h2>
          {tasa ? (
            <dl className="kv">
              <div>
                <dt>Tasa BCV</dt>
                <dd>{tasa.valor.replace('.', ',')} Bs por USD</dd>
              </div>
              <div>
                <dt>Fuente</dt>
                <dd>{tasa.fuente}</dd>
              </div>
              <div>
                <dt>Fecha de la tasa</dt>
                <dd>{fecha(tasa.fecha)}</dd>
              </div>
              <div>
                <dt>Verificación</dt>
                <dd>
                  {tasa.verificada
                    ? 'Verificada contra la fuente'
                    : 'Última disponible; no verificada'}
                </dd>
              </div>
            </dl>
          ) : (
            <p>
              Tasa BCV no disponible. Los montos en dólares se muestran; los totales en bolívares
              quedan vacíos.
            </p>
          )}
          <p className="fine">
            Los montos base y los recargos se registran en USD. La conversión a bolívares es
            referencial y no altera el orden ni el monto en dólares.
          </p>
        </section>

        <section>
          <h2>Propuestas</h2>
          <div className="tabla-scroll">
            <table className="tabla-reporte">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Proveedor</th>
                  <th className="num">Monto USD</th>
                  <th className="num">Recargos USD</th>
                  <th className="num">Total conocido</th>
                  <th className="num">Total VES</th>
                  <th>Estado</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, index) => {
                  const montoCentavos = aCentavos(fila.propuesta.monto);
                  const recargosCentavos = fila.recargos.reduce(
                    (suma, recargo) => suma + (aCentavos(recargo.monto) ?? 0),
                    0,
                  );
                  const totalCentavos =
                    montoCentavos === null ? null : montoCentavos + recargosCentavos;
                  const totalVesFila =
                    totalCentavos !== null && tasaNumero !== null
                      ? Math.round(totalCentavos * tasaNumero)
                      : null;
                  const estado = ultimoEstatus(fila.estatus);

                  return (
                    <tr key={fila.propuesta.id}>
                      <td>{index + 1}</td>
                      <td>{nombreProveedor(fila.propuesta, proveedores)}</td>
                      <td className="num">
                        {montoCentavos === null ? '—' : monto(deCentavos(montoCentavos), 'USD')}
                      </td>
                      <td className="num">
                        {recargosCentavos === 0 ? '—' : monto(deCentavos(recargosCentavos), 'USD')}
                      </td>
                      <td className="num">
                        {totalCentavos === null ? (
                          <span className="tabla-reporte__incompleto">Incompleto</span>
                        ) : (
                          monto(deCentavos(totalCentavos), 'USD')
                        )}
                      </td>
                      <td className="num">
                        {totalVesFila === null ? '—' : monto(deCentavos(totalVesFila), 'VES')}
                      </td>
                      <td>
                        {estado ? (
                          <>
                            <span className="badge">Código {estado.estado}</span>
                            {estado.comentario ? (
                              <small className="tabla-reporte__nota">{estado.comentario}</small>
                            ) : null}
                          </>
                        ) : (
                          'Sin estado'
                        )}
                      </td>
                      <td>
                        {fila.notas.length === 0 ? (
                          '—'
                        ) : (
                          <details>
                            <summary>{fila.notas.length} nota(s)</summary>
                            <ul>
                              {fila.notas.map((nota) => (
                                <li key={nota.id}>{nota.texto}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Totales</h2>
          <div className="readout readout--four">
            <div className="readout__item">
              <span className="readout__label">Propuestas con monto</span>
              <span className="readout__value readout__value--small">{totales.conMonto}</span>
              <span className="readout__note">
                {totales.sinMonto > 0
                  ? `${totales.sinMonto} sin monto base`
                  : 'Todas con monto base'}
              </span>
            </div>
            <div className="readout__item">
              <span className="readout__label">Recargos</span>
              <span className="readout__value readout__value--small">
                {monto(deCentavos(totales.recargos), 'USD')}
              </span>
              <span className="readout__note">Conceptos cargados aparte</span>
            </div>
            <div className="readout__item">
              <span className="readout__label">Total conocido</span>
              <span className="readout__value readout__value--small">
                {monto(deCentavos(totales.total), 'USD')}
              </span>
              <span className="readout__note">Monto base + recargos declarados</span>
            </div>
            <div className="readout__item">
              <span className="readout__label">Total en VES</span>
              <span className="readout__value readout__value--small">
                {totalVes === null ? '—' : monto(deCentavos(totalVes), 'VES')}
              </span>
              <span className="readout__note">
                {tasa ? `Tasa ${tasa.valor.replace('.', ',')} Bs/USD` : 'Tasa no disponible'}
              </span>
            </div>
          </div>
          {totales.sinMonto > 0 ? (
            <p className="fine">
              El total es parcial: {totales.sinMonto} propuesta(s) no tienen monto base y no se
              suman. Sus recargos se muestran en la tabla pero no forman un total.
            </p>
          ) : null}
          <p className="fine">
            “Total conocido” incluye monto base y recargos declarados. No incluye impuestos no
            declarados ni costos que el documento no mencione.
          </p>
        </section>

        <section>
          <h2>Recargos declarados</h2>
          {filas.every((fila) => fila.recargos.length === 0) ? (
            <p>Sin recargos declarados en las propuestas.</p>
          ) : (
            <ul className="dictamen__list">
              {filas.flatMap((fila) =>
                fila.recargos.map((recargo) => (
                  <li key={`${fila.propuesta.id}-${recargo.id}`}>
                    {nombreProveedor(fila.propuesta, proveedores)} · {recargo.concepto} ·{' '}
                    {monto(recargo.monto, 'USD')}
                  </li>
                )),
              )}
            </ul>
          )}
        </section>

        <section>
          <h2>Notas de revisión</h2>
          {filas.every((fila) => fila.notas.length === 0) ? (
            <p>Sin notas registradas.</p>
          ) : (
            <ul className="dictamen__list">
              {filas.flatMap((fila) =>
                fila.notas.map((nota) => (
                  <li key={nota.id}>
                    {nombreProveedor(fila.propuesta, proveedores)} · {nota.texto}
                  </li>
                )),
              )}
            </ul>
          )}
        </section>

        <footer className="dictamen__foot">
          <p>
            Este informe recomienda y explica. No adjudica: la decisión corresponde a la persona que
            firma.
          </p>
          <p className="fine">Documento de trabajo. No sustituye la decisión administrativa.</p>
        </footer>
      </article>
    </div>
  );
}

/**
 * Ranking comparativo producido por el agente evaluador: propuestas válidas
 * ordenadas por calidad y costo real, luego las descartadas con su causa.
 */
function RankingAgente({ proyectoId }: { proyectoId: string }) {
  const listaQuery = useQuery(orpc.evaluaciones.list.queryOptions({ input: { proyectoId } }));
  const ultima = (listaQuery.data ?? [])[0];

  const detalleQuery = useQuery({
    ...orpc.evaluaciones.get.queryOptions({ input: { id: ultima?.id ?? '' } }),
    enabled: Boolean(ultima),
    retry: 0,
  });

  const ranking = detalleQuery.data?.informe?.ranking ?? [];

  if (!ultima) {
    return (
      <section>
        <h2>Ranking del agente</h2>
        <p className="fine">
          Aún no se ha lanzado la evaluación automática: usa el botón «⚡ Evaluar propuestas» para
          generar el ranking comparativo entre todas las propuestas.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Ranking del agente {detalleQuery.isFetching ? '(actualizando…)' : ''}</h2>
      {detalleQuery.error ? (
        <p className="field-error">
          La última evaluación falló en registrarse: vuelve a lanzar la evaluación.
        </p>
      ) : (
        <ol className="ranking">
          {ranking.map((fila) => (
            <li className="ranking__item" key={fila.propuestaId}>
              <span className="ranking__pos">{fila.posicion}</span>
              <div>
                <div className="ranking__nombre">
                  {fila.proveedor}
                  {fila.decision === 'descartada' ? ' — descartada' : ''}
                </div>
                <div className="ranking__motivo">{fila.motivo ?? ''}</div>
              </div>
              <span className="ranking__meta">
                {fila.puntaje !== null ? `Calidad ${fila.puntaje}/100 · ` : ''}
                {fila.costoRealUsd !== null ? `${fila.costoRealUsd} USD` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
