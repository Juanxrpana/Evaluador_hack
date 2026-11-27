import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { Button, Card, ErrorText, Input, Muted, Screen, Title } from '@/components/ui';
import { Theme } from '@/constants/theme';
import { useSession } from '@/lib/session';

export default function SignIn() {
  const { signIn } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const failure = await signIn(email.trim(), password);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen>
          <Title>Evaluador</Title>
          <Muted>Inicia sesión para gestionar proyectos y propuestas</Muted>
          <Card>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              value={email}
            />
            <Input
              onChangeText={setPassword}
              placeholder="Contraseña"
              secureTextEntry
              value={password}
            />
            <ErrorText>{error}</ErrorText>
            <Button
              disabled={busy || !email || !password}
              label="Iniciar sesión"
              onPress={submit}
            />
          </Card>
          <Muted>
            ¿No tienes cuenta?{' '}
            <Link href="/(auth)/sign-up" style={styles.link}>
              Crear cuenta
            </Link>
          </Muted>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  link: {
    color: Theme.colors.primary,
  },
});
