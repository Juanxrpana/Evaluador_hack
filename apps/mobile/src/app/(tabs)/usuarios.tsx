import { useQuery } from '@tanstack/react-query';

import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { orpc } from '@/lib/orpc';
import { useSession } from '@/lib/session';

export default function Usuarios() {
  const { signOut } = useSession();
  const usuarios = useQuery(orpc.users.list.queryOptions());

  return (
    <Screen>
      <Title>Usuarios</Title>
      <Muted>Sesión activa vía Better Auth (bearer)</Muted>
      {usuarios.isPending && <Muted>Cargando…</Muted>}
      {usuarios.error && <Muted>Error: {String(usuarios.error.message)}</Muted>}
      {usuarios.data?.map((usuario) => (
        <Card key={usuario.id}>
          <Muted>{usuario.name}</Muted>
          <Muted>{usuario.email}</Muted>
        </Card>
      ))}
      <Button label="Cerrar sesión" variant="danger" onPress={() => signOut()} />
    </Screen>
  );
}
