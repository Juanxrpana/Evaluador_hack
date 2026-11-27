import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { authClient } from '@/lib/auth-client';
import { loadToken, saveToken } from '@/lib/token';
import { Theme } from '@/constants/theme';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface SessionValue {
  user: SessionUser | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Mobile sessions use Better Auth's bearer plugin: the sign-in/sign-up
 * response carries a session `token`, which we persist and attach as
 * `Authorization: Bearer` on every API call (see lib/auth-client.ts and
 * lib/orpc.ts). React Native has no cookie jar, so this is the transport.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) {
        const { data } = await authClient.getSession({
          fetchOptions: { headers: { Authorization: `Bearer ${token}` } },
        });
        if (data?.user) {
          setUser({ id: data.user.id, name: data.user.name, email: data.user.email });
        } else {
          await saveToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error || !data) {
      return error?.message ?? 'No se pudo iniciar sesión';
    }
    const token = (data as { token?: string }).token;
    if (token) {
      await saveToken(token);
    }
    setUser({ id: data.user.id, name: data.user.name, email: data.user.email });
    return null;
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<string | null> => {
      const { data, error } = await authClient.signUp.email({ name, email, password });
      if (error || !data) {
        return error?.message ?? 'No se pudo crear la cuenta';
      }
      const token = (data as { token?: string }).token;
      if (token) {
        await saveToken(token);
      }
      setUser({ id: data.user.id, name: data.user.name, email: data.user.email });
      return null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const token = await loadToken();
    if (token) {
      await authClient.signOut({
        fetchOptions: { headers: { Authorization: `Bearer ${token}` } },
      });
    }
    await saveToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, signIn, signUp, signOut }), [user, signIn, signUp, signOut]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession debe usarse dentro de SessionProvider');
  }
  return session;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
});
