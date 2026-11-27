import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Muted, Screen, Title } from '@/components/ui';
import { useSession } from '@/lib/session';

const proyectosDemo = [
  { nombre: 'Sistema de inventario', estado: '3 propuestas recibidas' },
  { nombre: 'Portal de proveedores', estado: 'En revisión' },
  { nombre: 'App de entregas', estado: 'Borrador' },
];

export default function Proyectos() {
  const { user } = useSession();

  return (
    <Screen>
      <Title>Proyectos</Title>
      <Muted>
        Hola {user?.name ?? 'invitado'} — los módulos de proyecto llegan con su endpoint
      </Muted>
      <ScrollView contentContainerStyle={styles.list}>
        {proyectosDemo.map((proyecto) => (
          <Card key={proyecto.nombre}>
            <View style={styles.row}>
              <Muted>{proyecto.nombre}</Muted>
              <Muted>{proyecto.estado}</Muted>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
