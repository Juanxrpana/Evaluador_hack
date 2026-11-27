import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function Perfil() {
  const { user, signOut } = useSession();

  return (
    <Screen>
      <Title>Perfil</Title>
      <Card>
        <Muted>{user?.name}</Muted>
        <Muted>{user?.email}</Muted>
        <Muted>Id: {user?.id}</Muted>
      </Card>
      <Button label="Cerrar sesión" variant="danger" onPress={() => signOut()} />
    </Screen>
  );
}
