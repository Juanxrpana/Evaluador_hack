import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { Button, Card, ErrorText, Input, Muted, Screen, Title } from '@/components/ui';
import { Theme } from '@/constants/theme';
import { useSession } from '@/lib/session';

export default function SignUp() {
  const { signUp } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const failure = await signUp(name.trim(), email.trim(), password);
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
          <Title>Crear cuenta</Title>
          <Muted>Nuevo usuario del sistema evaluador</Muted>
          <Card>
            <Input onChangeText={setName} placeholder="Nombre" value={name} />
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              value={email}
            />
            <Input
              onChangeText={setPassword}
              placeholder="Contraseña (mínimo 8 caracteres)"
              secureTextEntry
              value={password}
            />
            <ErrorText>{error}</ErrorText>
            <Button
              disabled={busy || !name || !email || password.length < 8}
              label="Crear cuenta"
              onPress={submit}
            />
          </Card>
          <Muted>
            ¿Ya tienes cuenta?{' '}
            <Link href="/(auth)/sign-in" style={styles.link}>
              Iniciar sesión
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
