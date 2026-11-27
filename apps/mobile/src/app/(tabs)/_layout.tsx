import { Tabs } from 'expo-router';

import { Theme } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Theme.colors.surface },
        headerTitleStyle: { color: Theme.colors.text },
        headerTintColor: Theme.colors.primary,
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.muted,
        tabBarStyle: { backgroundColor: Theme.colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Proyectos' }} />
      <Tabs.Screen name="usuarios" options={{ title: 'Usuarios' }} />
      <Tabs.Screen name="conocimiento" options={{ title: 'Conocimiento' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
