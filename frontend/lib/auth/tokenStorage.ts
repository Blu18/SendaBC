import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'sendabc_token';
const USER_ID_KEY = 'sendabc_user_id';

export const tokenStorage = {
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

// Id del usuario de la sesión: dueño de las actividades locales (spec 003, RN-4).
export const userIdStorage = {
  save: (userId: string) => SecureStore.setItemAsync(USER_ID_KEY, userId),
  get: () => SecureStore.getItemAsync(USER_ID_KEY),
  clear: () => SecureStore.deleteItemAsync(USER_ID_KEY),
};
