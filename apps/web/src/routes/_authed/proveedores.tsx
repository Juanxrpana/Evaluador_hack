import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PageHead, Panel } from '../../components/ui';
import { messageOf } from '../../lib/errors';
import { fecha, monto } from '../../lib/format';
import { orpc } from '../../lib/orpc';

export const Route = createFileRoute('/_authed/proveedores')({
  component: ProveedoresPage,
});

function ProveedoresPage() {
  const queryClient = useQueryClient();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const { data: proveedores } = useQuery(orpc.proveedores.list.queryOptions());
  const { data: historial } = useQuery(
    orpc.proveedores.historial.queryOptions({
      input: { id: seleccionado ?? '' },
      enabled: seleccionado !== null,
    }),
  );

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: orpc.proveedores.list.queryKey() });

  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation(
    orpc.proveedores.create.mutationOptions({
      onSuccess: () => {
        setNombre('');
        setContacto('');
        setError(null);
        return invalidar();
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  return (
    <div className="stack">
      <PageHead
        title="Proveedores"
        lede="El historial de costos se deriva de las propuestas y de los recargos que se extraen de sus documentos."
      />

      <div className="home-grid">
        <Panel
          title="Proveedores registrados"
          aside={
            <span className="panel__meta">
              {proveedores?.length ?? 0}{' '}
              {(proveedores?.length ?? 0) === 1 ? 'registrado' : 'registrados'}
            </span>
          }
        >
          {(proveedores ?? []).length === 0 ? (
            <p className="fine">
              Aún no hay proveedores. Registra el primero para asociarlo a una propuesta.
            </p>
          ) : (
            <ul className="user-list">
              {(proveedores ?? []).map((proveedor) => (
                <FilaProveedor
                  key={proveedor.id}
                  proveedor={proveedor}
                  onChanged={invalidar}
                  onVerHistorial={setSeleccionado}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Nuevo proveedor">
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              crear.mutate({ nombre, ...(contacto.trim() ? { contacto: contacto.trim() } : {}) });
            }}
          >
            <div className="field">
              <label htmlFor="proveedor-nombre">Nombre</label>
              <input
                id="proveedor-nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="proveedor-contacto">Contacto (opcional)</label>
              <input
                id="proveedor-contacto"
                value={contacto}
                onChange={(event) => setContacto(event.target.value)}
              />
            </div>
            {error && <p className="field-error">{error}</p>}
            <button type="submit" disabled={crear.isPending || nombre.trim().length === 0}>
              {crear.isPending ? 'Registrando…' : 'Registrar proveedor'}
            </button>
          </form>
        </Panel>
      </div>

      {seleccionado && historial ? (
        <Panel
          title={`Historial de costos · ${historial.proveedor.nombre}`}
          aside={
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setSeleccionado(null)}
            >
              Cerrar
            </button>
          }
        >
          <div className="readout readout--four" role="list" aria-label="Resumen de costos">
            <div className="readout__item" role="listitem">
              <span className="readout__label">Propuestas</span>
              <span className="readout__value readout__value--small">
                {historial.resumen.totalPropuestas}
              </span>
              <span className="readout__note">Con monto registrado</span>
            </div>
            <div className="readout__item" role="listitem">
              <span className="readout__label">Promedio</span>
              <span className="readout__value readout__value--small">
                {monto(historial.resumen.montoPromedio)}
              </span>
              <span className="readout__note">Monto base</span>
            </div>
            <div className="readout__item" role="listitem">
              <span className="readout__label">Mínimo</span>
              <span className="readout__value readout__value--small">
                {monto(historial.resumen.montoMinimo)}
              </span>
              <span className="readout__note">Oferta más baja</span>
            </div>
            <div className="readout__item" role="listitem">
              <span className="readout__label">Máximo</span>
              <span className="readout__value readout__value--small">
                {monto(historial.resumen.montoMaximo)}
              </span>
              <span className="readout__note">Oferta más alta</span>
            </div>
          </div>

          <p className="fine">
            Último monto registrado: {monto(historial.resumen.ultimoMonto)}. Los recargos se
            muestran aparte cuando el documento los declara.
          </p>

          <ul className="user-list">
            {historial.entradas.map((entrada) => (
              <li key={entrada.propuestaId}>
                <div>
                  <strong>{entrada.proyectoNombre}</strong>
                  <span>
                    Monto {monto(entrada.monto)}
                    {entrada.recargos.length > 0
                      ? ` · recargos aparte: ${entrada.recargos
                          .map((recargo) => `${recargo.concepto} ${monto(recargo.monto)}`)
                          .join(', ')}`
                      : entrada.recargosTotal !== '0.00'
                        ? ` · recargos ${monto(entrada.recargosTotal)}`
                        : ''}
                  </span>
                </div>
                <time dateTime={entrada.createdAt}>{fecha(entrada.createdAt)}</time>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function FilaProveedor({
  proveedor,
  onChanged,
  onVerHistorial,
}: {
  proveedor: { id: string; nombre: string; contacto: string | null };
  onChanged: () => Promise<unknown> | unknown;
  onVerHistorial: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(proveedor.nombre);
  const [contacto, setContacto] = useState(proveedor.contacto ?? '');
  const [error, setError] = useState<string | null>(null);

  const actualizar = useMutation(
    orpc.proveedores.update.mutationOptions({
      onSuccess: () => {
        setEditando(false);
        setError(null);
        return onChanged();
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  const eliminar = useMutation(
    orpc.proveedores.delete.mutationOptions({
      onSuccess: () => onChanged(),
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  if (editando) {
    return (
      <li>
        <form
          className="form-stack"
          style={{ width: '100%' }}
          onSubmit={(event) => {
            event.preventDefault();
            actualizar.mutate({
              id: proveedor.id,
              nombre,
              contacto: contacto.trim() ? contacto.trim() : null,
            });
          }}
        >
          <div className="field">
            <label htmlFor={`editar-proveedor-${proveedor.id}`}>Nombre</label>
            <input
              id={`editar-proveedor-${proveedor.id}`}
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`editar-contacto-${proveedor.id}`}>Contacto</label>
            <input
              id={`editar-contacto-${proveedor.id}`}
              value={contacto}
              onChange={(event) => setContacto(event.target.value)}
              placeholder="Contacto"
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="acciones">
            <button type="submit" disabled={actualizar.isPending}>
              Guardar
            </button>
            <button type="button" className="boton-fantasma" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li>
      <div>
        <strong>{proveedor.nombre}</strong>
        <span>{proveedor.contacto ?? 'Sin contacto'}</span>
      </div>
      <div className="acciones">
        <button
          type="button"
          className="boton-fantasma"
          onClick={() => onVerHistorial(proveedor.id)}
        >
          Historial
        </button>
        <button type="button" className="boton-fantasma" onClick={() => setEditando(true)}>
          Editar
        </button>
        <button
          type="button"
          className="boton-peligro"
          disabled={eliminar.isPending}
          onClick={() => {
            if (window.confirm(`¿Eliminar el proveedor "${proveedor.nombre}"?`)) {
              eliminar.mutate({ id: proveedor.id });
            }
          }}
        >
          {eliminar.isPending ? '…' : 'Eliminar'}
        </button>
      </div>
    </li>
  );
}
