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

  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation(
    orpc.proveedores.create.mutationOptions({
      onSuccess: () => {
        setNombre('');
        setContacto('');
        setError(null);
        return queryClient.invalidateQueries({ queryKey: orpc.proveedores.list.queryKey() });
      },
      onError: (cause) => setError(messageOf(cause)),
    }),
  );

  return (
    <section className="stack">
      <p className="eyebrow">Evaluador</p>
      <h1>Proveedores</h1>
      <p className="lede">
        El historial de costos se deriva de las propuestas y recargos registrados de cada proveedor,
        y se guarda en la base de conocimiento de los proyectos donde participa.
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
          <li key={proveedor.id}>
            <div>
              <strong>{proveedor.nombre}</strong>
              <span>{proveedor.contacto ?? 'Sin contacto'}</span>
            </div>
            <button
              type="button"
              className="nav-button"
              onClick={() => setSeleccionado(proveedor.id)}
            >
              Ver historial
            </button>
          </li>
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
                    Monto {entrada.monto ?? 'n/d'} + recargos {entrada.recargosTotal}
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
