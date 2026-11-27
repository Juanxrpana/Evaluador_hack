import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'evaluador.session.token';

// expo-secure-store's web shim is unreliable; on web the token lives in
// localStorage. Native (iOS/Android) uses the real encrypted store.
export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
