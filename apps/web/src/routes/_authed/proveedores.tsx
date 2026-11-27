import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { messageOf } from '../../lib/errors';
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
    <section className="stack">
      <p className="eyebrow">Evaluador</p>
      <h1>Proveedores</h1>
      <p className="lede">
        El historial de costos se deriva de las propuestas y de los recargos que la IA extrae de sus
        documentos. Se guarda vectorizado en la base de conocimiento de los proyectos.
      </p>

      <form
        className="form-panel"
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

      {seleccionado && historial && (
        <form className="form-panel" onSubmit={(event) => event.preventDefault()}>
          <h2>Historial de costos: {historial.proveedor.nombre}</h2>
          <p className="lede">
            {historial.resumen.totalPropuestas} propuestas · promedio{' '}
            {historial.resumen.montoPromedio ?? 'n/d'} · mínimo{' '}
            {historial.resumen.montoMinimo ?? 'n/d'} · máximo{' '}
            {historial.resumen.montoMaximo ?? 'n/d'} · último{' '}
            {historial.resumen.ultimoMonto ?? 'n/d'}
          </p>

          <ul className="user-list">
            {historial.entradas.map((entrada) => (
              <li key={entrada.propuestaId}>
                <div>
                  <strong>{entrada.proyectoNombre}</strong>
                  <span>
                    Monto {entrada.monto ?? 'n/d'}
                    {entrada.recargos.length > 0
                      ? ` + recargos aparte: ${entrada.recargos
                          .map((recargo) => `${recargo.concepto} ${recargo.monto}`)
                          .join(', ')}`
                      : entrada.recargosTotal !== '0.00'
                        ? ` + recargos ${entrada.recargosTotal}`
                        : ''}
                  </span>
                </div>
                <time dateTime={entrada.createdAt}>
                  {new Date(entrada.createdAt).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        </form>
      )}
    </section>
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
          className="stack"
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
          <input value={nombre} onChange={(event) => setNombre(event.target.value)} required />
          <input
            value={contacto}
            onChange={(event) => setContacto(event.target.value)}
            placeholder="Contacto"
          />
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
