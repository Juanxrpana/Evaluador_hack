import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'evaluador.session.token';

export async function loadToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
